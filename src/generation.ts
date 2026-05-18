import OpenAI from "openai";
import { readFileSync } from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { config, sourceRegistry } from "./config.js";
import { buildBlueprint } from "./blueprint.js";
import { computeAntiBias } from "./antiBias.js";
import { BatchPlan, CaseStudy, ExamSet, GenerationPlan, PracticeQuestion } from "./types.js";

// ── Prompt template loading ──────────────────────────────────────────
// The template is split by <!-- END_SYSTEM --> into a system prompt and
// a user-message template. Variables are substituted at call time.

let _promptRaw: string | null = null;
function loadPromptTemplate(): { system: string; user: string } {
  if (!_promptRaw) {
    const filePath = path.join(process.cwd(), "prompts", "generate-batch.prompt.md");
    _promptRaw = readFileSync(filePath, "utf8");
  }
  const [systemRaw, userRaw] = _promptRaw.split("<!-- END_SYSTEM -->");
  const system = systemRaw.replace("<!-- SYSTEM -->", "").trim();
  const user = userRaw?.trim() ?? _promptRaw;
  return { system, user };
}

// Official GH-600 domain names from the study guide
// https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600
const domainMap: Record<string, string> = {
  A: "Prepare agent architecture and SDLC processes",
  B: "Implement tool use and environment interaction",
  C: "Manage memory, state, and execution",
  D: "Perform evaluation, error analysis, and tuning",
  E: "Orchestrate multi-agent coordination",
  F: "Implement guardrails and accountability",
};

// Lazy cache for per-domain knowledge files loaded from prompts/knowledge/domain-*.md
const _domainKnowledgeCache: Record<string, string> = {};

function loadDomainKnowledge(domainId: string): string {
  if (_domainKnowledgeCache[domainId]) return _domainKnowledgeCache[domainId];
  const filePath = path.join(process.cwd(), "prompts", "knowledge", `domain-${domainId}.md`);
  try {
    _domainKnowledgeCache[domainId] = readFileSync(filePath, "utf8");
  } catch {
    // Fallback to study guide overview if per-domain file missing
    const fallbackPath = path.join(process.cwd(), "prompts", "knowledge", "gh-600-study-guide.md");
    try {
      _domainKnowledgeCache[domainId] = readFileSync(fallbackPath, "utf8");
    } catch {
      _domainKnowledgeCache[domainId] = `Domain ${domainId}: ${domainMap[domainId] ?? "General"}`;
    }
  }
  return _domainKnowledgeCache[domainId];
}

const CORRECT_ANSWER_ROTATION = ["B", "C", "A", "D", "B", "A", "C", "D", "A", "B", "D", "C"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function buildGenerationPrompt(
  plan: GenerationPlan,
  batch: BatchPlan,
  existingStems: string[]
): { system: string; user: string } {
  const domainId = batch.domainId ?? "A";
  const domainName = batch.domainName ?? domainMap[domainId] ?? "General";
  const domainCtx = loadDomainKnowledge(domainId);
  const typeList = batch.typeFocus.join(", ");
  const diffList = batch.difficultyFocus.join(", ");
  const avoidList =
    existingStems.length > 0
      ? existingStems
          .slice(0, 15)
          .map((s) => `- ${s.slice(0, 100)}`)
          .join("\n")
      : "(none)";

  // Target distribution hint: cycle A/B/C/D so correct answers spread evenly
  const targets = ["A", "B", "C", "D"];
  const targetHint = Array.from(
    { length: batch.questionCount },
    (_, i) => targets[(i + plan.batches.length) % 4]
  ).join(", ");

  const { system, user } = loadPromptTemplate();

  const filled = user
    .replace(/\{\{DOMAIN_ID\}\}/g, domainId)
    .replace(/\{\{DOMAIN_NAME\}\}/g, domainName)
    .replace(/\{\{DOMAIN_KNOWLEDGE\}\}/g, domainCtx)
    .replace(/\{\{QUESTION_COUNT\}\}/g, String(batch.questionCount))
    .replace(/\{\{ITEM_TYPES\}\}/g, typeList)
    .replace(/\{\{DIFFICULTIES\}\}/g, diffList)
    .replace(/\{\{BATCH_ID\}\}/g, batch.id)
    .replace(/\{\{CASE_STUDY_ID\}\}/g, batch.caseStudyId ?? "null")
    .replace(/\{\{CORRECT_ANSWER_TARGETS\}\}/g, targetHint)
    .replace(/\{\{AVOID_STEMS\}\}/g, avoidList)
    .replace(/\{\{TIMESTAMP\}\}/g, new Date().toISOString())
    .replace(/\{\{MODEL\}\}/g, config.model)
    .replace(/\{\{REASONING_EFFORT\}\}/g, config.reasoningEffort);

  return { system, user: filled };
}

async function generateWithOpenAI(plan: GenerationPlan, batch: BatchPlan, existingQuestionStems: string[]): Promise<PracticeQuestion[]> {
  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const { system, user } = buildGenerationPrompt(plan, batch, existingQuestionStems);

  // gpt-5.5 and o-series models use the Responses API with reasoning support.
  // Standard gpt-4o/gpt-4o-mini use chat completions. Detect by model name.
  const isReasoningModel = /^o\d|^gpt-5/.test(config.model);

  let text: string | undefined;

  if (isReasoningModel) {
    const params: Parameters<typeof client.responses.create>[0] = {
      model: config.model,
      text: { format: { type: "json_object" } },
      // Pass system + user as a message array so the system persona is separate
      input: [
        { type: "message" as const, role: "system" as const, content: system },
        { type: "message" as const, role: "user" as const, content: user },
      ],
      // Web search lets the model look up the latest GitHub/Microsoft docs while generating
      tools: [{ type: "web_search_preview" as const }],
    };
    if (config.reasoningEffort && config.reasoningEffort !== "none") {
      params.reasoning = { effort: config.reasoningEffort as "low" | "medium" | "high" };
    }
    const res = await client.responses.create(params);
    text = (res as unknown as { output_text?: string }).output_text?.trim();
  } else {
    const res = await client.chat.completions.create({
      model: config.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
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
  if (!config.openaiApiKey) {
    throw new Error(
      "OpenAI API key not configured. Run `npm run generate` to pre-generate exams in dev mode."
    );
  }
  return generateWithOpenAI(plan, batch, existingQuestionStems);
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
