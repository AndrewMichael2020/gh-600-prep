import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { config, sourceRegistry } from "./config.js";
import { buildBlueprint } from "./blueprint.js";
import { computeAntiBias } from "./antiBias.js";
import { BatchPlan, CaseStudy, ExamSet, GenerationPlan, PracticeQuestion } from "./types.js";

const fallbackStems = [
  "A platform team is enabling GitHub MCP for internal documentation and ticketing tools while preserving least privilege.",
  "A regulated repository uses Copilot coding agent under strict branch protections and required reviews.",
  "A multi-agent refactor introduced conflicting assumptions across API and test pull requests.",
  "An AI-assisted PR passes unit tests but violates product intent and governance constraints.",
];

const domainMap: Record<string, string> = {
  A: "Agent architecture and SDLC integration",
  B: "MCP/tool use and environment permissions",
  C: "Memory, state, and execution",
  D: "Evaluation, telemetry, error analysis, and tuning",
  E: "Multi-agent orchestration and incident response",
  F: "Guardrails, safety, accountability, and governance",
};

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function createQuestion(plan: GenerationPlan, batch: BatchPlan, index: number): PracticeQuestion {
  const qId = uuidv4();
  const domainId = batch.domainId ?? pick(plan.domains, index).id;
  const domainName = domainMap[domainId] ?? "General";
  const type = batch.typeFocus[0] === "case_study" ? "case_study_child" : (batch.typeFocus[0] as PracticeQuestion["type"]);
  const scenario = `${pick(fallbackStems, index)} Batch focus: ${batch.id}.`;
  const opts = [
    { id: "A", text: "Restrict tool scopes and require approval checkpoints before merge." },
    { id: "B", text: "Allow broad tool access to reduce friction during generation." },
    { id: "C", text: "Bypass policy checks if tests pass and branch builds are green." },
    { id: "D", text: "Skip auditability requirements to speed up the delivery timeline." },
  ];
  const correct = "A";
  const artifact = batch.typeFocus.includes("code_or_config_artifact")
    ? {
        title: "copilot-setup-steps.yml",
        kind: "yaml" as const,
        content: "permissions:\n  contents: read\n  pull-requests: write\nallowlist:\n  - github-mcp-server",
      }
    : undefined;

  return {
    id: qId,
    examCode: "GH-600",
    domainId,
    domainName,
    objectiveTags: ["least-privilege", "auditability", "policy-controls"],
    type,
    difficulty: pick(batch.difficultyFocus, index),
    stem: `What is the best next action for this GH-600 scenario? (${batch.id}-${index + 1})`,
    scenario,
    artifact,
    caseStudyId: batch.caseStudyId,
    options: opts,
    correctAnswer: correct,
    explanation: {
      whyCorrect: "Option A enforces least privilege and preserves human oversight while keeping evidence for audits.",
      whyDistractorsWrong: {
        B: "Broad access increases blast radius and weakens governance controls.",
        C: "Passing tests does not replace policy and compliance requirements.",
        D: "Removing auditability breaks accountability and incident response readiness.",
      },
      examStrategyNote: "Prefer controlled permissions, review gates, and traceability under real-world constraints.",
    },
    sourceRefs: [
      { title: "GitHub MCP server", repo: "github/github-mcp-server", docType: "official_repo" },
      { title: "Agents in SDLC", repo: "github-samples/agents-in-sdlc", docType: "official_repo" },
    ],
    metadata: {
      generatedAt: new Date().toISOString(),
      model: config.model,
      reasoningEffort: config.reasoningEffort,
      batchId: batch.id,
      validationStatus: "draft",
      ambiguityScore: 0.15,
    },
  };
}

async function generateWithOpenAI(plan: GenerationPlan, batch: BatchPlan, existingQuestionStems: string[]): Promise<PracticeQuestion[]> {
  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const prompt = `Generate strict JSON array of GH-600 practice questions for this batch.\nPlan: ${JSON.stringify(plan)}\nBatch: ${JSON.stringify(batch)}\nAvoid duplicate stems: ${JSON.stringify(existingQuestionStems)}\nUse original questions only.`;

  const res = await client.responses.create({
    model: config.model,
    reasoning: { effort: config.reasoningEffort as "minimal" | "low" | "medium" | "high" },
    text: { format: { type: "json_object" } },
    input: prompt,
  });

  const compatibilityText =
    // Responses API primary field:
    res.output_text?.trim() ??
    // Compatibility fallback if shape differs:
    (res as unknown as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content?.trim();
  const text = compatibilityText;
  if (!text) throw new Error("OpenAI returned empty response");
  const parsed = JSON.parse(text) as { questions?: PracticeQuestion[] };
  if (!Array.isArray(parsed.questions)) throw new Error("OpenAI response missing questions array");
  return parsed.questions.map((q, i) => ({ ...q, id: q.id || uuidv4(), metadata: { ...q.metadata, batchId: batch.id, model: config.model, reasoningEffort: config.reasoningEffort }, stem: q.stem || `Generated stem ${i + 1}` }));
}

export async function generateBatch(plan: GenerationPlan, batch: BatchPlan, existingQuestionStems: string[]) {
  if (config.openaiApiKey) {
    try {
      return await generateWithOpenAI(plan, batch, existingQuestionStems);
    } catch {
      // fallback below
    }
  }

  const questions = Array.from({ length: batch.questionCount }, (_, i) => createQuestion(plan, batch, i));
  const unique = new Set(existingQuestionStems);
  return questions.filter((q) => {
    if (unique.has(q.stem)) return false;
    unique.add(q.stem);
    return true;
  });
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
