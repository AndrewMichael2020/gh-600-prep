import { describe, expect, it } from "vitest";
import { assembleExam, createPlan, generateBatch, validateBatch } from "../src/generation.js";
import { scoreAttempt } from "../src/scoring.js";

async function buildMockExam(total = 100) {
  const plan = createPlan(total);
  let questions: any[] = [];
  for (const batch of plan.batches) {
    const generated = await generateBatch(plan, batch, questions.map((q) => q.stem));
    const validated = validateBatch(generated);
    questions.push(...validated.filter((q) => q.metadata.validationStatus !== "rejected"));
  }
  questions = questions.slice(0, plan.totalQuestions);
  return assembleExam(plan, questions, []);
}

describe("phase 3 full mock ops", () => {
  it("builds a stable 100-question mock exam", async () => {
    const exam = await buildMockExam(100);
    expect(exam.questions.length).toBe(100);
    expect(exam.antiBias).toBeTruthy();
  });

  it("runs two end-to-end mock attempts", async () => {
    const exam1 = await buildMockExam(100);
    const exam2 = await buildMockExam(100);

    const answers1 = Object.fromEntries(exam1.questions.map((q) => [q.id, typeof q.correctAnswer === "string" ? q.correctAnswer : "A"]));
    const answers2 = Object.fromEntries(exam2.questions.map((q) => [q.id, typeof q.correctAnswer === "string" ? "B" : "A"]));

    const s1 = scoreAttempt(exam1.questions, answers1);
    const s2 = scoreAttempt(exam2.questions, answers2);
    expect(s1.total).toBe(100);
    expect(s2.total).toBe(100);
  });
});
