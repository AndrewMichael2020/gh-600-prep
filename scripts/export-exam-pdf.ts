/**
 * Export an exam as a human-readable PDF in Practice mode:
 * all questions with correct answers highlighted and full explanations.
 *
 * Usage:
 *   npx tsx scripts/export-exam-pdf.ts [examId]
 *
 * If no examId is given the most-recently-created exam is used.
 * Output: data/exams/<examId>.pdf
 */

import fs from "fs";
import path from "path";
import { generateExamPdf } from "../src/pdfExport.js";
import { ExamSet } from "../src/types.js";

async function main() {
  const examsPath = path.join(process.cwd(), "data/exams/exams.json");
  const exams: ExamSet[] = JSON.parse(fs.readFileSync(examsPath, "utf8"));
  if (!exams.length) throw new Error("No exams found in data/exams/exams.json");

  const targetId = process.argv[2];
  const exam = targetId
    ? exams.find((e) => e.id === targetId || e.id.startsWith(targetId))
    : exams.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!exam) throw new Error(`Exam not found: ${targetId}`);

  console.log(`Exporting exam ${exam.id} (${exam.questions.length} questions)…`);
  const { outPath } = await generateExamPdf(exam);
  console.log(`✅  PDF saved → ${outPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
