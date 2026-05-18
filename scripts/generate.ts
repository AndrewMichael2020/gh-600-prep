/**
 * Dev-mode exam generation script.
 *
 * Calls the OpenAI API (requires OPENAI_API_KEY in env), generates a full
 * GH-600 practice exam, and persists it to data/exams/exams.json.
 * The UI serves pre-generated exams — it never calls OpenAI directly.
 *
 * Usage:
 *   npm run generate              # default: 30 questions
 *   npm run generate -- --count 100
 */

import { assembleExam, createPlan, generateBatch, validateBatch } from "../src/generation.js";
import { saveExam } from "../src/persistence.js";
import { PracticeQuestion } from "../src/types.js";

const args = process.argv.slice(2);
const countArg = args.indexOf("--count");
const questionCount = countArg !== -1 ? Number(args[countArg + 1]) : 30;

if (!process.env.OPENAI_API_KEY) {
  console.error("❌  OPENAI_API_KEY is not set. Export it before running this script.");
  process.exit(1);
}

if (isNaN(questionCount) || questionCount < 1 || questionCount > 200) {
  console.error("❌  --count must be between 1 and 200.");
  process.exit(1);
}

console.log(`\n🔧  Generating ${questionCount}-question GH-600 practice exam…\n`);

const plan = createPlan(questionCount);
const allQuestions: PracticeQuestion[] = [];

for (let i = 0; i < plan.batches.length; i++) {
  const batch = plan.batches[i];
  const label = batch.domainName
    ? `Domain ${batch.domainId}: ${batch.domainName}`
    : `Special batch (${batch.typeFocus.join(", ")})`;

  process.stdout.write(`  [${i + 1}/${plan.batches.length}] ${label}… `);

  const generated = await generateBatch(plan, batch, allQuestions.map((q) => q.stem));
  const validated = validateBatch(generated);
  const accepted = validated.filter((q) => q.metadata.validationStatus !== "rejected");
  allQuestions.push(...(accepted as PracticeQuestion[]));

  console.log(`✅  ${accepted.length} questions accepted (running total: ${allQuestions.length})`);
}

const exam = assembleExam(plan, allQuestions, []);
await saveExam(exam);

console.log(`\n✅  Exam saved  id=${exam.id}  questions=${exam.questions.length}\n`);
console.log("Start the server and open http://localhost:3000 to take the exam.\n");
