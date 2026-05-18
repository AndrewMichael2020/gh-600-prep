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
