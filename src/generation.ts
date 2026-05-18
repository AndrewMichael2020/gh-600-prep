import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { config, sourceRegistry } from "./config.js";
import { buildBlueprint } from "./blueprint.js";
import { computeAntiBias } from "./antiBias.js";
import { BatchPlan, CaseStudy, ExamSet, GenerationPlan, PracticeQuestion } from "./types.js";

const domainMap: Record<string, string> = {
  A: "Agent architecture and SDLC integration",
  B: "MCP/tool use and environment permissions",
  C: "Memory, state, and execution",
  D: "Evaluation, telemetry, error analysis, and tuning",
  E: "Multi-agent orchestration and incident response",
  F: "Guardrails, safety, accountability, and governance",
};

const DOMAIN_KNOWLEDGE: Record<string, string> = {
  A: `Topics: GitHub Copilot Agent Mode, Copilot coding agent, custom agents in pull requests, agentic loops,
planning and task decomposition, code suggestion and generation, agent-assisted code review, SDLC integration,
automated PR creation via agents, agents in GitHub Actions, Copilot Workspace, copilot-setup-steps.yml
configuration, agent tool invocation, human-in-the-loop checkpoints, agent session lifecycle, agentic
branch management. Key repos: github-samples/agents-in-sdlc, github/copilot-sdk, github/awesome-copilot`,

  B: `Topics: GitHub MCP Server architecture, Model Context Protocol (MCP) standard, tool scopes and permission
models, least-privilege principle for agents, tool allowlisting/denylisting, resource access controls, audit
trails for tool invocations, MCP client-server patterns, tool invocation security, permission escalation risks,
integration with GitHub APIs via MCP, fine-grained PAT scopes, OAuth apps vs GitHub Apps for agent permissions,
repository visibility and tool access. Key repos: github/github-mcp-server, skills/integrate-mcp-with-copilot,
microsoft/mcp-for-beginners`,

  C: `Topics: LLM context windows and token management, conversation history management, session state persistence,
knowledge cutoffs and their implications, prompt engineering for context efficiency, context pruning strategies,
stateless vs stateful agent patterns, execution constraints (timeouts, retries), long-running agent task state,
checkpointing, context compression, semantic caching.
Key repos: github/copilot-sdk, microsoft/ai-agents-for-beginners`,

  D: `Topics: LLM evaluation metrics (pass@k, BLEU, ROUGE), observability and tracing for AI systems, logging
agent actions, OpenTelemetry for AI, model performance tuning, prompt optimization, cost optimization
strategies, A/B testing prompts, quality gates for AI-generated code, automated testing of agent outputs,
error classification, feedback loops, regression testing for prompts, deployment monitoring.
Key repos: github-samples/agents-in-sdlc, github/copilot-sdk`,

  E: `Topics: Multi-agent workflow patterns, orchestrator-worker architectures, agent handoff protocols,
conflict resolution when agents disagree, parallel vs sequential execution, dependency graphs, failure
modes in multi-agent systems, rollback and recovery strategies, incident response with AI agents,
coordinating multiple Copilot agents on the same repository, agent routing, task delegation.
Key repos: github-samples/agents-in-sdlc, microsoft/ai-agents-for-beginners`,

  F: `Topics: Content filtering for AI outputs, policy enforcement in agentic systems, audit logging and
compliance requirements, responsible AI principles, human oversight mechanisms, safety rules and system
prompts, governance frameworks for AI in enterprise, data privacy controls, liability and accountability
models, bias detection in AI tools, regulatory compliance (SOC2, GDPR), GitHub Advanced Security
integration with AI agents. Key repos: github-samples/pets-workshop, github/awesome-copilot`,
};

const CORRECT_ANSWER_ROTATION = ["B", "C", "A", "D", "B", "A", "C", "D", "A", "B", "D", "C"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

const FALLBACK_QUESTIONS: Array<{
  domainId: string;
  stem: string;
  scenario: string;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string;
  tags: string[];
  whyCorrect: string;
  whyWrong: Record<string, string>;
}> = [
  {
    domainId: "A",
    stem: "A development team wants to integrate GitHub Copilot coding agent into their PR review workflow. Which configuration approach best preserves human oversight while enabling automation?",
    scenario: "The team has branch protection rules requiring at least two human approvals before merge. They want Copilot agent to handle routine refactors but flag architectural changes for human review.",
    options: [
      { id: "A", text: "Disable branch protection rules to allow the agent to merge automatically when tests pass." },
      { id: "B", text: "Configure copilot-setup-steps.yml to scope agent permissions to read-only and surface a summary PR for human review before any merge." },
      { id: "C", text: "Grant the agent maintainer role so it can bypass required reviews in urgent scenarios." },
      { id: "D", text: "Route all agent suggestions through a separate auto-merge bot that overrides protection rules." },
    ],
    correctAnswer: "B",
    tags: ["copilot-agent-mode", "branch-protection", "human-in-the-loop"],
    whyCorrect: "Scoping agent permissions via copilot-setup-steps.yml and surfacing a summary PR preserves human oversight while enabling automation — the correct balance for agentic SDLC integration.",
    whyWrong: { A: "Disabling branch protection removes a critical safety gate.", C: "Granting maintainer role violates least-privilege and bypasses required reviews.", D: "A separate auto-merge bot that overrides protections undermines governance." },
  },
  {
    domainId: "B",
    stem: "An engineering team configures the GitHub MCP Server to give Copilot access to internal tools. A security audit finds the agent has write access to production secrets. What is the immediate correct action?",
    scenario: "The MCP configuration grants the agent access to a secrets management tool with read/write permissions. The agent has not yet accessed production secrets, but the scope exists.",
    options: [
      { id: "A", text: "Monitor the agent's usage logs and only revoke access if a violation occurs." },
      { id: "B", text: "Add the secrets tool to the MCP denylist and restrict to read-only scopes aligned with the agent's actual task requirements." },
      { id: "C", text: "Keep the broad scope to avoid disrupting existing agent workflows." },
      { id: "D", text: "Replace the GitHub MCP Server with a custom proxy that logs all tool calls." },
    ],
    correctAnswer: "B",
    tags: ["mcp-permissions", "least-privilege", "tool-scopes", "security"],
    whyCorrect: "Applying least-privilege by denylisting unnecessary tools and restricting to read-only scopes is the correct immediate action — proactive not reactive.",
    whyWrong: { A: "Waiting for a violation is reactive and violates security-first principles.", C: "Keeping broad scope for workflow convenience directly contradicts least-privilege.", D: "A custom proxy adds complexity without addressing the root permission problem." },
  },
  {
    domainId: "C",
    stem: "A Copilot agent is working on a long-running refactor task that spans multiple sessions. After the third session, the agent begins repeating suggestions already applied in session one. What is the most likely root cause?",
    scenario: "The agent uses a 128K context window. Each session starts fresh. The refactor touches 47 files across 3 microservices.",
    options: [
      { id: "A", text: "The agent's tool invocation quota was exhausted." },
      { id: "B", text: "The agent lacks write permissions to the repository." },
      { id: "C", text: "Without persistent state between sessions, the agent has no memory of changes made in prior sessions." },
      { id: "D", text: "The model's temperature setting is too high, causing random repeated outputs." },
    ],
    correctAnswer: "C",
    tags: ["context-window", "state-persistence", "session-management"],
    whyCorrect: "Stateless agents do not retain memory between sessions. Without a state persistence mechanism (e.g., task files, issue comments, or a memory store), each session starts from scratch.",
    whyWrong: { A: "Tool quota exhaustion would cause failures, not repetition.", B: "Lack of write permissions would block the agent entirely.", D: "Temperature affects creativity/randomness, not cross-session memory." },
  },
  {
    domainId: "D",
    stem: "A team deploys a Copilot coding agent for automated code review. After two weeks, developers report the agent is approving PRs with subtle security vulnerabilities. Which evaluation approach best addresses this?",
    scenario: "The agent uses GPT-5.5 for review. The team currently only measures whether the agent leaves a review comment, not the quality of the review decision.",
    options: [
      { id: "A", text: "Increase the agent's context window to capture more code per review." },
      { id: "B", text: "Switch to a different base model to improve review accuracy." },
      { id: "C", text: "Add security-focused evaluation cases to the test suite and measure false-negative rate on known-vulnerable code patterns." },
      { id: "D", text: "Reduce the agent's review scope to only formatting and style issues." },
    ],
    correctAnswer: "C",
    tags: ["evaluation-metrics", "false-negative-rate", "quality-gates", "security"],
    whyCorrect: "Adding targeted evaluation cases for known-vulnerable patterns and measuring false-negative rate directly addresses the gap between what's measured (comment presence) and what matters (security correctness).",
    whyWrong: { A: "Context window size is unrelated to the evaluation gap.", B: "Switching models without evaluation baselines cannot confirm improvement.", D: "Reducing scope avoids the problem rather than solving it." },
  },
  {
    domainId: "E",
    stem: "Two Copilot agents working in parallel on the same repository — one refactoring API contracts, one updating tests — produce conflicting changes in the same files. How should the orchestration layer handle this?",
    scenario: "Both agents are in the 'in-progress' state. Agent 1 has renamed a method; Agent 2 has added tests using the old method name. Both have opened draft PRs.",
    options: [
      { id: "A", text: "Merge both PRs in order of creation and resolve conflicts manually afterward." },
      { id: "B", text: "Allow the agents to continue independently; the CI pipeline will catch the conflict." },
      { id: "C", text: "Pause the dependent agent (Agent 2), signal conflict to the orchestrator, and resume Agent 2 after Agent 1's changes are integrated." },
      { id: "D", text: "Cancel both agents and restart the task as a single sequential agent." },
    ],
    correctAnswer: "C",
    tags: ["multi-agent-orchestration", "conflict-resolution", "dependency-management"],
    whyCorrect: "Pausing the dependent agent and routing through the orchestrator for conflict resolution is the correct pattern — it preserves progress, avoids lost work, and enforces dependency ordering.",
    whyWrong: { A: "Merging conflicting PRs will break the build and create rework.", B: "Relying on CI to catch orchestration conflicts is reactive and wasteful.", D: "Cancelling both agents discards work that can be recovered." },
  },
  {
    domainId: "F",
    stem: "A company deploys GitHub Copilot agents across their engineering org. Compliance requires a full audit trail of every agent action that modifies code or creates PRs. Which approach satisfies this requirement?",
    scenario: "The company is subject to SOC 2 Type II. The security team must be able to reconstruct exactly what the agent did, when, and why, for any PR created in the past 12 months.",
    options: [
      { id: "A", text: "Require developers to add a manual comment to each agent-created PR describing what the agent did." },
      { id: "B", text: "Enable GitHub audit log streaming to a SIEM, configure agent identity labels on PRs, and retain tool invocation logs with timestamps tied to PR IDs." },
      { id: "C", text: "Store the agent's full conversation history in a shared Google Doc accessible to the security team." },
      { id: "D", text: "Disable agent access to production repositories and only allow it in sandboxed environments." },
    ],
    correctAnswer: "B",
    tags: ["audit-logging", "compliance", "soc2", "governance"],
    whyCorrect: "Streaming audit logs to a SIEM with agent identity labels and timestamped tool invocations provides the structured, tamper-evident, queryable audit trail required for SOC 2 Type II compliance.",
    whyWrong: { A: "Manual comments are inconsistent, incomplete, and not tamper-evident.", C: "Google Docs is not a compliant audit mechanism — no tamper evidence, no structured query.", D: "Disabling agents in production defeats the purpose of deployment." },
  },
];

function createQuestion(plan: GenerationPlan, batch: BatchPlan, index: number): PracticeQuestion {
  const qId = uuidv4();
  const domainId = batch.domainId ?? pick(plan.domains, index).id;
  const domainName = domainMap[domainId] ?? "General";
  const type = batch.typeFocus[0] === "case_study" ? "case_study_child" : (batch.typeFocus[0] as PracticeQuestion["type"]);

  // Pick a fallback question for this domain, cycling through the pool
  const domainFallbacks = FALLBACK_QUESTIONS.filter((q) => q.domainId === domainId);
  const pool = domainFallbacks.length > 0 ? domainFallbacks : FALLBACK_QUESTIONS;
  const template = pick(pool, index);

  const artifact = batch.typeFocus.includes("code_or_config_artifact")
    ? {
        title: "copilot-setup-steps.yml",
        kind: "yaml" as const,
        content: "permissions:\n  contents: read\n  pull-requests: write\ntools:\n  allowlist:\n    - github-mcp-server\n  denylist:\n    - secrets-manager-write",
      }
    : undefined;

  return {
    id: qId,
    examCode: "GH-600",
    domainId,
    domainName,
    objectiveTags: template.tags,
    type,
    difficulty: pick(batch.difficultyFocus, index),
    stem: template.stem,
    scenario: template.scenario,
    artifact,
    caseStudyId: batch.caseStudyId,
    options: template.options,
    correctAnswer: template.correctAnswer,
    explanation: {
      whyCorrect: template.whyCorrect,
      whyDistractorsWrong: template.whyWrong,
      examStrategyNote: "On GH-600, prioritize answers that enforce least-privilege, preserve human oversight, and maintain audit trails.",
    },
    sourceRefs: [
      { title: "GitHub MCP server", repo: "github/github-mcp-server", docType: "official_repo" },
      { title: "Agents in SDLC", repo: "github-samples/agents-in-sdlc", docType: "official_repo" },
    ],
    metadata: {
      generatedAt: new Date().toISOString(),
      model: "fallback",
      reasoningEffort: "none",
      batchId: batch.id,
      validationStatus: "draft",
      ambiguityScore: 0.1,
    },
  };
}

function buildGenerationPrompt(plan: GenerationPlan, batch: BatchPlan, existingStems: string[]): string {
  const domainId = batch.domainId ?? "A";
  const domainName = batch.domainName ?? domainMap[domainId] ?? "General";
  const domainCtx = DOMAIN_KNOWLEDGE[domainId] ?? DOMAIN_KNOWLEDGE["A"];
  const typeList = batch.typeFocus.join(", ");
  const diffList = batch.difficultyFocus.join(", ");
  const avoidList =
    existingStems.length > 0
      ? existingStems
          .slice(0, 15)
          .map((s) => `- ${s.slice(0, 100)}`)
          .join("\n")
      : "(none)";

  return `You are an expert exam question author for the GH-600 (Developing in Agentic AI Systems) Microsoft/GitHub certification.

## Task
Generate exactly ${batch.questionCount} original practice questions as a JSON object.

## Batch
- Domain: ${domainId} — ${domainName}
- Item types: ${typeList}
- Difficulty: ${diffList}
- Batch ID: ${batch.id}

## Domain Knowledge
${domainCtx}

## Anti-Bias Rules (CRITICAL)
- Distribute correct answers across positions A, B, C, D — do NOT put the correct answer at A every time.
- Keep all option texts similar in length to avoid length-bias tells.
- Distractors must be plausible but definitively incorrect — no obviously wrong options.

## Quality Requirements
- Scenario-first: every stem presents a realistic situation before asking the question.
- Defensible: correct answer is grounded in official GitHub/Microsoft documentation.
- Judgment-based: test decision-making, trade-offs, and application — not pure recall.
- Each distractor should represent a common real-world mistake teams actually make.

## Stems to avoid duplicating
${avoidList}

## JSON Schema
Return ONLY valid JSON — no markdown, no explanation. Use this exact structure:
{
  "questions": [
    {
      "id": "placeholder",
      "examCode": "GH-600",
      "domainId": "${domainId}",
      "domainName": "${domainName}",
      "objectiveTags": ["tag1", "tag2"],
      "type": "${batch.typeFocus[0] === "case_study" ? "case_study_child" : batch.typeFocus[0]}",
      "difficulty": "${batch.difficultyFocus[0]}",
      "stem": "A team at Contoso is configuring...",
      "scenario": "The repository has branch protection rules...",
      "artifact": null,
      "caseStudyId": ${batch.caseStudyId ? `"${batch.caseStudyId}"` : "null"},
      "options": [
        {"id": "A", "text": "..."},
        {"id": "B", "text": "..."},
        {"id": "C", "text": "..."},
        {"id": "D", "text": "..."}
      ],
      "correctAnswer": "B",
      "explanation": {
        "whyCorrect": "Option B is correct because...",
        "whyDistractorsWrong": {
          "A": "Option A fails because...",
          "C": "Option C is wrong because...",
          "D": "Option D is incorrect because..."
        },
        "examStrategyNote": "On GH-600, questions about X tend to..."
      },
      "sourceRefs": [
        {"title": "GitHub MCP Server", "repo": "github/github-mcp-server", "docType": "official_repo"}
      ],
      "metadata": {
        "generatedAt": "${new Date().toISOString()}",
        "model": "${config.model}",
        "reasoningEffort": "${config.reasoningEffort}",
        "batchId": "${batch.id}",
        "validationStatus": "draft",
        "ambiguityScore": 0.1
      }
    }
  ]
}

Generate exactly ${batch.questionCount} questions. Return JSON only.`;
}

async function generateWithOpenAI(plan: GenerationPlan, batch: BatchPlan, existingQuestionStems: string[]): Promise<PracticeQuestion[]> {
  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const prompt = buildGenerationPrompt(plan, batch, existingQuestionStems);

  // gpt-5.5 and o-series models use the Responses API with reasoning support.
  // Standard gpt-4o/gpt-4o-mini use chat completions. Detect by model name.
  const isReasoningModel = /^o\d|^gpt-5/.test(config.model);

  let text: string | undefined;

  if (isReasoningModel) {
    const params: Parameters<typeof client.responses.create>[0] = {
      model: config.model,
      text: { format: { type: "json_object" } },
      input: prompt,
    };
    // Only attach reasoning effort for models that support it
    if (config.reasoningEffort && config.reasoningEffort !== "none") {
      params.reasoning = { effort: config.reasoningEffort as "low" | "medium" | "high" };
    }
    const res = await client.responses.create(params);
    text = (res as unknown as { output_text?: string }).output_text?.trim();
  } else {
    const res = await client.chat.completions.create({
      model: config.model,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });
    text = res.choices[0]?.message?.content?.trim();
  }

  if (!text) throw new Error("OpenAI returned empty response");

  // Strip accidental markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const parsed = JSON.parse(text) as { questions?: PracticeQuestion[] };
  if (!Array.isArray(parsed.questions)) throw new Error("OpenAI response missing questions array");

  return parsed.questions.map((q) => ({
    ...q,
    id: uuidv4(),
    metadata: {
      ...q.metadata,
      batchId: batch.id,
      model: config.model,
      reasoningEffort: config.reasoningEffort,
      generatedAt: new Date().toISOString(),
    },
  }));
}

export async function generateBatch(plan: GenerationPlan, batch: BatchPlan, existingQuestionStems: string[]) {
  const isTestEnv = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

  if (config.openaiApiKey) {
    try {
      return await generateWithOpenAI(plan, batch, existingQuestionStems);
    } catch (err) {
      console.error(`[generation] OpenAI batch ${batch.id} failed:`, err instanceof Error ? err.message : err);
      if (isTestEnv) {
        return Array.from({ length: batch.questionCount }, (_, i) => createQuestion(plan, batch, i));
      }
      throw err;
    }
  }

  if (!isTestEnv) {
    throw new Error(
      "OpenAI API key not configured. Run `npm run generate` to pre-generate exams in dev mode."
    );
  }

  // Test-only fallback: cycle through the template pool to fill requested slots.
  return Array.from({ length: batch.questionCount }, (_, i) => createQuestion(plan, batch, i));
}

export function validateBatch(questions: PracticeQuestion[]) {
  return questions.map((q) => {
    const reasons: string[] = [];
    if (!q.sourceRefs?.length) reasons.push("Missing source refs");
    if (!q.objectiveTags?.length) reasons.push("Missing objective tags");
    if (!q.explanation?.whyCorrect) reasons.push("Missing explanation");
    if (q.stem.toLowerCase().includes("real exam")) reasons.push("Claims to be a real exam question");
    const hasAbsolute = /\balways\b|\bnever\b/i.test(`${q.stem} ${q.options.map((o) => o.text).join(" ")}`);
    if (hasAbsolute) reasons.push("Contains absolute wording that may create giveaway bias");

    return {
      ...q,
      metadata: {
        ...q.metadata,
        validationStatus: reasons.length ? "needs_review" : "validated",
      },
      validationIssues: reasons,
    };
  });
}

export function assembleExam(plan: GenerationPlan, questions: PracticeQuestion[], caseStudies: CaseStudy[] = []): ExamSet {
  const grouped = new Map<string, PracticeQuestion[]>();
  const standalone: PracticeQuestion[] = [];
  for (const q of questions) {
    if (q.caseStudyId) {
      grouped.set(q.caseStudyId, [...(grouped.get(q.caseStudyId) ?? []), q]);
    } else {
      standalone.push(q);
    }
  }

  const shuffledStandalone = [...standalone].sort(() => Math.random() - 0.5);
  const groupedItems = [...grouped.entries()].map(([, items]) => items.sort(() => Math.random() - 0.5));
  const merged = [...shuffledStandalone, ...groupedItems.flat()].slice(0, plan.totalQuestions);

  return {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    plan,
    questions: merged,
    caseStudies,
    antiBias: computeAntiBias(merged),
  };
}

export function createPlan(questionCount: number) {
  const plan = buildBlueprint(questionCount);
  return {
    ...plan,
    trustedSources: sourceRegistry,
  };
}
