import { describe, expect, it } from "vitest";
import { buildDomainSubskillDrill, buildMistakeReplay, buildWeakDomainDrill } from "../src/studyLoops.js";
import { Attempt, PracticeQuestion } from "../src/types.js";

const q = (id: string, domainId: string, objectiveTags: string[] = []): PracticeQuestion => ({
  id,
  examCode: "GH-600",
  domainId,
  domainName: domainId,
  objectiveTags,
  type: "single_choice",
  difficulty: "hard",
  stem: id,
  options: [{ id: "A", text: "a" }, { id: "B", text: "b" }],
  correctAnswer: "A",
  explanation: { whyCorrect: "", whyDistractorsWrong: {} },
  sourceRefs: [],
  metadata: { generatedAt: "", model: "", reasoningEffort: "", batchId: "", validationStatus: "validated" },
});

describe("study loops", () => {
  const questions = [q("q1", "A"), q("q2", "A"), q("q3", "B"), q("q4", "B")];
  const attempt: Attempt = {
    id: "a1",
    examId: "e1",
    createdAt: "",
    answers: {},
    confidence: {},
    flagged: [],
    score: { overall: 50, correct: 2, total: 4, byDomain: { A: 40, B: 70 }, incorrectQuestionIds: ["q1", "q3"] },
  };

  it("builds weak-domain drill prioritized by missed questions", () => {
    expect(buildWeakDomainDrill(questions, attempt, 2).map((x) => x.id)).toEqual(["q1", "q2"]);
  });

  it("builds mistake replay from incorrect question ids", () => {
    expect(buildMistakeReplay(questions, attempt, 5).map((x) => x.id)).toEqual(["q1", "q3"]);
  });

  it("curates domain/sub-skill drill with miss-first and weak-subskill priority", () => {
    const richer = [
      q("q1", "A", ["permissions"]),
      q("q2", "A", ["permissions", "audit"]),
      q("q3", "A", ["audit"]),
      q("q4", "B", ["mcp"]),
    ];
    const a2: Attempt = {
      ...attempt,
      score: { ...attempt.score, byDomain: { A: 30, B: 80 }, incorrectQuestionIds: ["q2", "q3"] },
      confidence: { q2: "guessed", q3: "somewhat_confident" },
    };
    expect(buildDomainSubskillDrill(richer, a2, 3).map((x) => x.id)).toEqual(["q2", "q3", "q1"]);
  });
});
