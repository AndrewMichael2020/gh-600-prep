import { BatchPlan, Difficulty, DomainBlueprint, GenerationPlan, ItemTypeBlueprint } from "./types.js";

// Official GH-600 domain weights (mid-range), slightly equalised so no single
// domain dominates. All counts are within the official percentage bands.
// A 15–20 % | B 20–25 % | C 10–15 % | D 15–20 % | E 15–20 % | F 10–15 %
const baseDomains: DomainBlueprint[] = [
  { id: "A", name: "Agent architecture and SDLC integration",              count: 17 },
  { id: "B", name: "MCP/tool use and environment permissions",             count: 21 },
  { id: "C", name: "Memory, state, and execution",                        count: 14 },
  { id: "D", name: "Evaluation, telemetry, error analysis, and tuning",   count: 17 },
  { id: "E", name: "Multi-agent orchestration and incident response",      count: 18 },
  { id: "F", name: "Guardrails, safety, accountability, and governance",   count: 13 },
];

// Domain assignment order for case-study batches (highest-weight domains first).
// Each batch gets the next domain in this cycle so scenarios spread across the exam.
const CASE_STUDY_DOMAIN_CYCLE = ["B", "A", "D", "E", "C", "F"] as const;

// Domains that receive matching/sequence batches.
// Chosen to balance the domains that get fewer case-study questions.
const MATCH_SEQ_DOMAINS = ["B", "A", "C", "F"] as const;

const baseItemTypes: ItemTypeBlueprint = {
  single_choice: 42,
  multi_select: 18,
  sequence_order: 10,
  matching_magnet: 8,
  case_study: 16,
  code_or_config_artifact: 6,
};

function scaleCounts<T extends { count: number }>(items: T[], total: number): T[] {
  const baseTotal = items.reduce((s, d) => s + d.count, 0);
  const scaled = items.map((item) => ({ ...item, count: Math.floor((item.count / baseTotal) * total) }));
  let remainder = total - scaled.reduce((s, d) => s + d.count, 0);
  const order = [...items].sort((a, b) => b.count - a.count);
  let i = 0;
  while (remainder > 0) {
    const target = order[i % order.length];
    const found = scaled.find((x) => (x as unknown as { id?: string }).id === (target as unknown as { id?: string }).id) ?? scaled[i % scaled.length];
    found.count += 1;
    remainder -= 1;
    i += 1;
  }
  return scaled;
}

function scaleItemTypes(total: number): ItemTypeBlueprint {
  if (total === 100) return { ...baseItemTypes };
  const entries = Object.entries(baseItemTypes) as Array<[keyof ItemTypeBlueprint, number]>;
  const scaled: ItemTypeBlueprint = {
    single_choice: 0,
    multi_select: 0,
    sequence_order: 0,
    matching_magnet: 0,
    case_study: 0,
    code_or_config_artifact: 0,
  };
  for (const [k, v] of entries) scaled[k] = Math.floor((v / 100) * total);
  let remainder = total - Object.values(scaled).reduce((s, n) => s + n, 0);
  for (const [k] of entries.sort((a, b) => b[1] - a[1])) {
    if (remainder <= 0) break;
    scaled[k] += 1;
    remainder -= 1;
  }
  if (total >= 25 && scaled.case_study === 0) {
    scaled.single_choice = Math.max(0, scaled.single_choice - 1);
    scaled.case_study = 1;
  }
  if (total >= 20 && scaled.code_or_config_artifact === 0) {
    scaled.single_choice = Math.max(0, scaled.single_choice - 1);
    scaled.code_or_config_artifact = 1;
  }
  if (total >= 10 && scaled.multi_select === 0) {
    scaled.single_choice = Math.max(0, scaled.single_choice - 1);
    scaled.multi_select = 1;
  }
  if (total < 10) {
    scaled.sequence_order = 0;
    scaled.matching_magnet = 0;
    scaled.case_study = 0;
    scaled.code_or_config_artifact = Math.min(scaled.code_or_config_artifact, 1);
    const used = Object.values(scaled).reduce((s, n) => s + n, 0);
    if (used < total) scaled.single_choice += total - used;
  }
  return scaled;
}

function difficultyDistribution(total: number): Record<Difficulty, number> {
  const medium = Math.floor(total * 0.35);
  const hard = Math.floor(total * 0.45);
  const veryHard = total - medium - hard;
  return { medium, hard, very_hard: veryHard };
}

function caseStudyCount(total: number): number {
  if (total >= 100) return 4;
  if (total >= 70) return 3;
  if (total >= 30) return 2;
  if (total >= 20) return 2;
  if (total >= 10) return 1;
  return 0;
}

export function buildBlueprint(totalQuestions: number): GenerationPlan {
  const safeTotal = Math.max(1, totalQuestions);
  const domains = safeTotal === 100 ? baseDomains.map((d) => ({ ...d })) : scaleCounts(baseDomains, safeTotal);
  const itemTypes = scaleItemTypes(safeTotal);
  const cases = caseStudyCount(safeTotal);
  const difficulty = difficultyDistribution(safeTotal);

  const batches: BatchPlan[] = [];
  let batchIndex = 1;

  // ── Per-domain SC / MS / code batches ───────────────────────────────
  // Generate ~70 % of each domain's quota here; the rest comes from
  // case-study and matching batches that are also domain-tagged below.
  for (const domain of domains) {
    if (domain.count <= 0) continue;
    batches.push({
      id: `batch-${batchIndex++}`,
      domainId: domain.id,
      domainName: domain.name,
      typeFocus: ["single_choice", "multi_select", "code_or_config_artifact"],
      difficultyFocus: ["medium", "hard", "very_hard"],
      questionCount: Math.max(1, Math.floor(domain.count * 0.7)),
    });
  }

  // ── Case-study batches — each tagged to a specific domain ───────────
  // Cycling through CASE_STUDY_DOMAIN_CYCLE spreads scenarios evenly.
  const caseQPerBatch = Math.max(3, Math.floor(itemTypes.case_study / Math.max(1, cases)));
  for (let i = 0; i < cases; i++) {
    const domId = CASE_STUDY_DOMAIN_CYCLE[i % CASE_STUDY_DOMAIN_CYCLE.length];
    const domMeta = domains.find((d) => d.id === domId) ?? { id: domId, name: domId, count: 0 };
    batches.push({
      id: `batch-${batchIndex++}`,
      domainId: domId,
      domainName: domMeta.name,
      caseStudyId: `case-${i + 1}`,
      typeFocus: ["case_study"],
      difficultyFocus: ["hard", "very_hard"],
      questionCount: caseQPerBatch,
    });
  }

  // ── Matching / sequence batches — split across MATCH_SEQ_DOMAINS ────
  // Distributing these to domains that receive fewer case-study questions
  // (C, F) plus the two heaviest (B, A) keeps the overall distribution
  // within the official percentage bands.
  if (itemTypes.matching_magnet + itemTypes.sequence_order > 0) {
    const matchSeqTotal = itemTypes.matching_magnet + itemTypes.sequence_order;
    const baseCount = Math.floor(matchSeqTotal / MATCH_SEQ_DOMAINS.length);
    const remainder = matchSeqTotal - baseCount * MATCH_SEQ_DOMAINS.length;

    MATCH_SEQ_DOMAINS.forEach((domId, idx) => {
      const qCount = baseCount + (idx < remainder ? 1 : 0);
      if (qCount <= 0) return;
      const domMeta = domains.find((d) => d.id === domId) ?? { id: domId, name: domId, count: 0 };
      batches.push({
        id: `batch-${batchIndex++}`,
        domainId: domId,
        domainName: domMeta.name,
        typeFocus: ["matching_magnet", "sequence_order"],
        difficultyFocus: ["hard", "very_hard"],
        questionCount: qCount,
      });
    });
  }

  return {
    totalQuestions: safeTotal,
    domains,
    itemTypes,
    caseStudyCount: cases,
    difficulty,
    batches: batches.filter((b) => b.questionCount > 0),
  };
}
