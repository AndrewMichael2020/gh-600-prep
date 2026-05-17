import { describe, expect, it } from "vitest";
import { computeAntiBias } from "../src/antiBias.js";
import { PracticeQuestion } from "../src/types.js";

function q(id: string, correct: string, lengths: [number, number, number, number]): PracticeQuestion {
  return {
    id,
    examCode: "GH-600",
    domainId: "A",
    domainName: "A",
    objectiveTags: ["x"],
    type: "single_choice",
    difficulty: "hard",
    stem: "s",
    options: [
      { id: "A", text: "a".repeat(lengths[0]) },
      { id: "B", text: "b".repeat(lengths[1]) },
      { id: "C", text: "c".repeat(lengths[2]) },
      { id: "D", text: "d".repeat(lengths[3]) },
    ],
    correctAnswer: correct,
    explanation: { whyCorrect: "", whyDistractorsWrong: {} },
    sourceRefs: [{ title: "t", docType: "official_repo" }],
    metadata: { generatedAt: "", model: "", reasoningEffort: "", batchId: "", validationStatus: "validated" },
  };
}

describe("computeAntiBias", () => {
  it("reports position distribution and longest-correct ratio", () => {
    const result = computeAntiBias([
      q("1", "A", [1, 2, 3, 4]),
      q("2", "B", [4, 3, 2, 1]),
      q("3", "D", [1, 1, 1, 10]),
    ]);
    expect(result.answerPositionDistribution.A).toBe(1);
    expect(result.answerPositionDistribution.B).toBe(1);
    expect(result.answerPositionDistribution.D).toBe(1);
    expect(result.longestOptionCorrectRatio).toBeGreaterThanOrEqual(0);
  });
});
