import { PracticeQuestion } from "./types.js";

export function scoreQuestion(question: PracticeQuestion, answer: unknown): number {
  const correct = question.correctAnswer;
  if (typeof correct === "string") {
    return answer === correct ? 1 : 0;
  }
  if (Array.isArray(correct)) {
    const selected = new Set(Array.isArray(answer) ? answer : []);
    const target = new Set(correct);
    let credit = 0;
    for (const c of target) if (selected.has(c)) credit += 1;
    for (const s of selected) if (!target.has(s)) credit -= 1;
    return Math.max(0, Math.min(1, credit / Math.max(1, target.size)));
  }
  if ("order" in correct) {
    const user = Array.isArray((answer as { order?: string[] })?.order)
      ? (answer as { order: string[] }).order
      : [];
    return JSON.stringify(user) === JSON.stringify(correct.order) ? 1 : 0;
  }
  if ("pairs" in correct) {
    const user = (answer as { pairs?: Record<string, string> })?.pairs ?? {};
    const entries = Object.entries(correct.pairs);
    if (entries.length === 0) return 0;
    const matched = entries.filter(([k, v]) => user[k] === v).length;
    return matched / entries.length;
  }
  return 0;
}

export function scoreAttempt(questions: PracticeQuestion[], answers: Record<string, unknown>) {
  let totalPoints = 0;
  const byDomainRaw: Record<string, { points: number; total: number }> = {};
  const incorrectQuestionIds: string[] = [];

  for (const q of questions) {
    const value = scoreQuestion(q, answers[q.id]);
    totalPoints += value;
    byDomainRaw[q.domainId] ??= { points: 0, total: 0 };
    byDomainRaw[q.domainId].points += value;
    byDomainRaw[q.domainId].total += 1;
    if (value < 0.999) incorrectQuestionIds.push(q.id);
  }

  const byDomain: Record<string, number> = {};
  for (const [k, v] of Object.entries(byDomainRaw)) {
    byDomain[k] = Math.round((v.points / Math.max(1, v.total)) * 100);
  }

  return {
    overall: Math.round((totalPoints / Math.max(1, questions.length)) * 100),
    correct: Math.round(totalPoints),
    total: questions.length,
    byDomain,
    incorrectQuestionIds,
  };
}
