import { describe, expect, it } from "vitest";
import { assembleExam, createPlan, validateBatch } from "../src/generation.js";
import { scoreAttempt } from "../src/scoring.js";
import { FIXTURE_QUESTIONS } from "./fixtures/questions.js";

function buildMockExam(total = 100) {
  const plan = createPlan(total);
  // Repeat the 6 fixture questions to fill any requested exam size
  const questions = Array.from({ length: total }, (_, i) => ({
    ...FIXTURE_QUESTIONS[i % FIXTURE_QUESTIONS.length],
    id: `fixture-${i}`,
  }));
  const validated = validateBatch(questions);
  const accepted = validated.filter((q) => q.metadata.validationStatus !== "rejected");
  return assembleExam(plan, accepted.slice(0, plan.totalQuestions), []);
}

describe("phase 3 full mock ops", () => {
  it("builds a stable 100-question mock exam", () => {
    const exam = buildMockExam(100);
    expect(exam.questions.length).toBe(100);
    expect(exam.antiBias).toBeTruthy();
  });

  it("runs two end-to-end mock attempts", () => {
    const exam1 = buildMockExam(100);
    const exam2 = buildMockExam(100);

    const answers1 = Object.fromEntries(exam1.questions.map((q) => [q.id, typeof q.correctAnswer === "string" ? q.correctAnswer : "A"]));
    const answers2 = Object.fromEntries(exam2.questions.map((q) => [q.id, typeof q.correctAnswer === "string" ? "B" : "A"]));

    const s1 = scoreAttempt(exam1.questions, answers1);
    const s2 = scoreAttempt(exam2.questions, answers2);
    expect(s1.total).toBe(100);
    expect(s2.total).toBe(100);
  });
});
