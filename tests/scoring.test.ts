import { describe, expect, it } from "vitest";
import { scoreQuestion } from "../src/scoring.js";
import { PracticeQuestion } from "../src/types.js";

const base = {
  id: "1",
  examCode: "GH-600",
  domainId: "A",
  domainName: "A",
  objectiveTags: ["x"],
  type: "single_choice",
  difficulty: "hard",
  stem: "s",
  options: [
    { id: "A", text: "a" },
    { id: "B", text: "b" },
  ],
  correctAnswer: "A",
  explanation: { whyCorrect: "", whyDistractorsWrong: {} },
  sourceRefs: [{ title: "t", docType: "official_repo" }],
  metadata: {
    generatedAt: "",
    model: "",
    reasoningEffort: "",
    batchId: "",
    validationStatus: "validated",
  },
} satisfies PracticeQuestion;

describe("scoreQuestion", () => {
  it("scores multi-select partial credit", () => {
    const q: PracticeQuestion = { ...base, type: "multi_select", correctAnswer: ["A", "B"] };
    expect(scoreQuestion(q, ["A"])).toBe(0.5);
    expect(scoreQuestion(q, ["A", "B", "C"])).toBe(0.5);
  });

  it("scores matching and order", () => {
    const m: PracticeQuestion = { ...base, type: "matching_magnet", correctAnswer: { pairs: { x: "1", y: "2" } } };
    const o: PracticeQuestion = { ...base, type: "sequence_order", correctAnswer: { order: ["A", "B"] } };
    expect(scoreQuestion(m, { pairs: { x: "1", y: "2" } })).toBe(1);
    expect(scoreQuestion(o, { order: ["A", "B"] })).toBe(1);
  });
});
