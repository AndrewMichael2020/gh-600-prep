import { BatchPlan, Difficulty, DomainBlueprint, GenerationPlan, ItemTypeBlueprint } from "./types.js";

const baseDomains: DomainBlueprint[] = [
  { id: "A", name: "Agent architecture and SDLC integration", count: 18 },
  { id: "B", name: "MCP/tool use and environment permissions", count: 23 },
  { id: "C", name: "Memory, state, and execution", count: 12 },
  { id: "D", name: "Evaluation, telemetry, error analysis, and tuning", count: 17 },
  { id: "E", name: "Multi-agent orchestration and incident response", count: 18 },
  { id: "F", name: "Guardrails, safety, accountability, and governance", count: 12 },
];

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
  for (let i = 1; i <= cases; i++) {
    batches.push({
      id: `batch-${batchIndex++}`,
      caseStudyId: `case-${i}`,
      typeFocus: ["case_study"],
      difficultyFocus: ["hard", "very_hard"],
      questionCount: Math.max(3, Math.floor(itemTypes.case_study / Math.max(1, cases))),
    });
  }
  batches.push({
    id: `batch-${batchIndex++}`,
    typeFocus: ["matching_magnet", "sequence_order"],
    difficultyFocus: ["hard", "very_hard"],
    questionCount: itemTypes.matching_magnet + itemTypes.sequence_order,
  });
  batches.push({
    id: `batch-${batchIndex++}`,
    typeFocus: ["single_choice", "multi_select", "code_or_config_artifact", "case_study"],
    difficultyFocus: ["hard", "very_hard"],
    questionCount: Math.max(1, safeTotal - batches.reduce((s, b) => s + b.questionCount, 0)),
  });

  return {
    totalQuestions: safeTotal,
    domains,
    itemTypes,
    caseStudyCount: cases,
    difficulty,
    batches: batches.filter((b) => b.questionCount > 0),
  };
}
