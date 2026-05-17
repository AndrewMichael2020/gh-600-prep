import { AnswerOption, PracticeQuestion } from "./types.js";

function optionRank(options: AnswerOption[], answerId: string): "shortest" | "middle" | "longest" {
  const lengths = options.map((o) => o.text.length);
  const sorted = [...lengths].sort((a, b) => a - b);
  const correct = options.find((o) => o.id === answerId);
  const len = correct?.text.length ?? sorted[Math.floor(sorted.length / 2)];
  if (len <= sorted[0]) return "shortest";
  if (len >= sorted[sorted.length - 1]) return "longest";
  return "middle";
}

export function computeAntiBias(questions: PracticeQuestion[]) {
  const positions: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  let mcqCount = 0;
  let longestCorrect = 0;

  for (const q of questions) {
    if (typeof q.correctAnswer !== "string") continue;
    const id = q.correctAnswer;
    positions[id] = (positions[id] ?? 0) + 1;
    if (q.options.length >= 2) {
      mcqCount += 1;
      if (optionRank(q.options, id) === "longest") longestCorrect += 1;
    }
  }

  return {
    answerPositionDistribution: positions,
    longestOptionCorrectRatio: mcqCount === 0 ? 0 : longestCorrect / mcqCount,
  };
}
