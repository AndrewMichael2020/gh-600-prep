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
  existingStems: string[],
  usedCaseStudyThemes: string[] = []
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

  const avoidThemes =
    usedCaseStudyThemes.length > 0
      ? usedCaseStudyThemes.map((t) => `- ${t}`).join("\n")
      : "(none — this is the first case study)";

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
    .replace(/\{\{AVOID_CASE_STUDY_THEMES\}\}/g, avoidThemes)
    .replace(/\{\{TIMESTAMP\}\}/g, new Date().toISOString())
    .replace(/\{\{MODEL\}\}/g, config.model)
    .replace(/\{\{REASONING_EFFORT\}\}/g, config.reasoningEffort);

  return { system, user: filled };
}

async function generateWithOpenAI(
  plan: GenerationPlan,
  batch: BatchPlan,
  existingQuestionStems: string[],
  usedCaseStudyThemes: string[] = []
): Promise<{ questions: PracticeQuestion[]; caseStudy?: CaseStudy }> {
  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const { system, user } = buildGenerationPrompt(plan, batch, existingQuestionStems, usedCaseStudyThemes);

  const isReasoningModel = /^o\d|^gpt-5/.test(config.model);
  console.log(`[GEN] model=${config.model} isReasoningModel=${isReasoningModel} effort=${config.reasoningEffort}`);

  let text: string | undefined;

  if (isReasoningModel) {
    const params: Parameters<typeof client.responses.create>[0] = {
      model: config.model,
      input: [
        { type: "message" as const, role: "system" as const, content: system },
        { type: "message" as const, role: "user" as const, content: user },
      ],
      tools: [{ type: "web_search_preview" as const }],
    };
    if (config.reasoningEffort && config.reasoningEffort !== "none") {
      params.reasoning = { effort: config.reasoningEffort as "low" | "medium" | "high" };
    }
    console.log(`[GEN] Calling responses.create…`);
    const res = await client.responses.create(params);
    text = (res as unknown as { output_text?: string }).output_text?.trim();
    console.log(`[GEN] responses.create returned — output_text length=${text?.length ?? 0}`);
  } else {
    console.log(`[GEN] Calling chat.completions.create…`);
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
    console.log(`[GEN] chat.completions returned — content length=${text?.length ?? 0}`);
  }

  if (!text) throw new Error("OpenAI returned empty response");

  // Strip markdown code fences the model might wrap around JSON
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // If the model prefixed prose before the JSON block, find the first { and last }
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart > 0 && jsonEnd > jsonStart) {
    console.log(`[GEN] Trimming ${jsonStart} leading chars before JSON`);
    text = text.slice(jsonStart, jsonEnd + 1);
  }

  let parsed: { questions?: PracticeQuestion[]; caseStudy?: CaseStudy };
  try {
    parsed = JSON.parse(text) as { questions?: PracticeQuestion[]; caseStudy?: CaseStudy };
  } catch (e) {
    console.error(`[GEN] JSON.parse failed. First 500 chars of response:\n${text.slice(0, 500)}`);
    throw new Error(`Failed to parse OpenAI JSON response: ${e instanceof Error ? e.message : e}`);
  }
  if (!Array.isArray(parsed.questions)) {
    console.error(`[GEN] Missing questions array. Keys in response: ${Object.keys(parsed).join(", ")}`);
    throw new Error("OpenAI response missing questions array");
  }
  console.log(`[GEN] Parsed ${parsed.questions.length} questions successfully`);

  const mapped = parsed.questions.map((q) => ({
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

  return { questions: mapped, caseStudy: parsed.caseStudy };
}

export async function generateBatch(
  plan: GenerationPlan,
  batch: BatchPlan,
  existingQuestionStems: string[],
  usedCaseStudyThemes: string[] = []
): Promise<{ questions: PracticeQuestion[]; caseStudy?: CaseStudy }> {
  if (!config.openaiApiKey) {
    throw new Error(
      "OpenAI API key not configured. Run `npm run generate` to pre-generate exams in dev mode."
    );
  }
  return generateWithOpenAI(plan, batch, existingQuestionStems, usedCaseStudyThemes);
}

/**
 * Randomly reassigns the A/B/C/D key labels across options so the correct
 * answer is uniformly distributed and not predictable by position.
 * All fields that reference option ids (correctAnswer, whyDistractorsWrong)
 * are updated to match the new labels.
 * sequence_order, matching_magnet, and dropdown_completion are left untouched —
 * their correctAnswer is not a simple letter and shuffling them requires different logic.
 */
function shuffleOptionKeys(q: PracticeQuestion): PracticeQuestion {
  if (q.type === "sequence_order" || q.type === "matching_magnet" || q.type === "dropdown_completion") return q;
  if (!q.options?.length) return q;

  // Fisher-Yates shuffle of the option objects themselves
  const shuffled = [...q.options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Build old-id → new-id mapping (new ids are A, B, C, … in order)
  const labels = "ABCDEFGHIJ".split("");
  const oldToNew = new Map<string, string>();
  const newOptions = shuffled.map((opt, i) => {
    const newId = labels[i];
    oldToNew.set(opt.id, newId);
    return { id: newId, text: opt.text };
  });

  // Remap correctAnswer
  let newCorrect: PracticeQuestion["correctAnswer"];
  if (typeof q.correctAnswer === "string") {
    newCorrect = oldToNew.get(q.correctAnswer) ?? q.correctAnswer;
  } else if (Array.isArray(q.correctAnswer)) {
    newCorrect = q.correctAnswer.map((id) => oldToNew.get(id) ?? id);
  } else {
    return q; // unexpected shape — leave untouched
  }

  // Remap whyDistractorsWrong keys
  const oldWhy = q.explanation?.whyDistractorsWrong ?? {};
  const newWhy: Record<string, string> = {};
  for (const [oldId, reason] of Object.entries(oldWhy)) {
    newWhy[oldToNew.get(oldId) ?? oldId] = reason;
  }

  return {
    ...q,
    options: newOptions,
    correctAnswer: newCorrect,
    explanation: { ...q.explanation, whyDistractorsWrong: newWhy },
  };
}

export function validateBatch(questions: PracticeQuestion[]) {
  return questions.map((q) => {
    // Shuffle option keys first so correct-answer distribution is uniform
    const sq = shuffleOptionKeys(q);

    const reasons: string[] = [];
    if (!sq.sourceRefs?.length) reasons.push("Missing source refs");
    if (!sq.objectiveTags?.length) reasons.push("Missing objective tags");
    if (!sq.explanation?.whyCorrect) reasons.push("Missing explanation");
    if (sq.stem.toLowerCase().includes("real exam")) reasons.push("Claims to be a real exam question");
    const optTexts = sq.options?.map((o) => o.text).join(" ") ?? "";
    const hasAbsolute = /\balways\b|\bnever\b/i.test(`${sq.stem} ${optTexts}`);
    if (hasAbsolute) reasons.push("Contains absolute wording that may create giveaway bias");

    return {
      ...sq,
      metadata: {
        ...sq.metadata,
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
  const merged = [...shuffledStandalone, ...groupedItems.flat()];

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
