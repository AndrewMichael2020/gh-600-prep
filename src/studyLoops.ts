import { Attempt, PracticeQuestion } from "./types.js";

export function buildWeakDomainDrill(questions: PracticeQuestion[], attempt: Attempt, limit = 10): PracticeQuestion[] {
  const incorrect = new Set(attempt.score.incorrectQuestionIds);
  const byDomain = Object.entries(attempt.score.byDomain).sort((a, b) => a[1] - b[1]);
  const weakestDomain = byDomain[0]?.[0];
  if (!weakestDomain) return [];

  const inWeakDomain = questions.filter((q) => q.domainId === weakestDomain);
  const prioritized = inWeakDomain
    .filter((q) => incorrect.has(q.id))
    .concat(inWeakDomain.filter((q) => !incorrect.has(q.id)));
  return prioritized.slice(0, Math.max(1, limit));
}

export function buildMistakeReplay(questions: PracticeQuestion[], attempt: Attempt, limit = 20): PracticeQuestion[] {
  const incorrect = new Set(attempt.score.incorrectQuestionIds);
  return questions.filter((q) => incorrect.has(q.id)).slice(0, Math.max(1, limit));
}

export function buildDomainSubskillDrill(questions: PracticeQuestion[], attempt: Attempt, limit = 12): PracticeQuestion[] {
  const incorrect = new Set(attempt.score.incorrectQuestionIds);
  const weakestDomain = Object.entries(attempt.score.byDomain).sort((a, b) => a[1] - b[1])[0]?.[0];
  const scoped = weakestDomain ? questions.filter((q) => q.domainId === weakestDomain) : questions;

  const subskillMisses = new Map<string, number>();
  for (const q of scoped) {
    if (!incorrect.has(q.id)) continue;
    for (const tag of q.objectiveTags) {
      subskillMisses.set(tag, (subskillMisses.get(tag) ?? 0) + 1);
    }
  }

  const ranked = [...scoped].sort((a, b) => {
    const aWrong = incorrect.has(a.id) ? 1 : 0;
    const bWrong = incorrect.has(b.id) ? 1 : 0;
    if (aWrong !== bWrong) return bWrong - aWrong;

    const aConf = attempt.confidence[a.id];
    const bConf = attempt.confidence[b.id];
    const confWeight = { guessed: 2, somewhat_confident: 1, confident: 0 } as const;
    const aConfW = aConf ? confWeight[aConf] : 0;
    const bConfW = bConf ? confWeight[bConf] : 0;
    if (aConfW !== bConfW) return bConfW - aConfW;

    const aSub = Math.max(0, ...a.objectiveTags.map((t) => subskillMisses.get(t) ?? 0));
    const bSub = Math.max(0, ...b.objectiveTags.map((t) => subskillMisses.get(t) ?? 0));
    if (aSub !== bSub) return bSub - aSub;
    return a.id.localeCompare(b.id);
  });

  return ranked.slice(0, Math.max(1, limit));
}
