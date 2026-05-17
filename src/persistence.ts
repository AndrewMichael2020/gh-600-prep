import { promises as fs } from "node:fs";
import path from "node:path";
import { Attempt, ExamSet } from "./types.js";

const base = process.cwd();
const examsDir = path.join(base, "data", "exams");
const attemptsDir = path.join(base, "data", "attempts");

async function ensureDirs() {
  await fs.mkdir(examsDir, { recursive: true });
  await fs.mkdir(attemptsDir, { recursive: true });
}

export async function saveExam(exam: ExamSet) {
  await ensureDirs();
  await fs.writeFile(path.join(examsDir, `${exam.id}.json`), JSON.stringify(exam, null, 2));
}

export async function getExam(id: string): Promise<ExamSet | null> {
  try {
    const text = await fs.readFile(path.join(examsDir, `${id}.json`), "utf8");
    return JSON.parse(text) as ExamSet;
  } catch {
    return null;
  }
}

export async function saveAttempt(attempt: Attempt) {
  await ensureDirs();
  await fs.writeFile(path.join(attemptsDir, `${attempt.id}.json`), JSON.stringify(attempt, null, 2));
}

export async function getAttempt(id: string): Promise<Attempt | null> {
  try {
    const text = await fs.readFile(path.join(attemptsDir, `${id}.json`), "utf8");
    return JSON.parse(text) as Attempt;
  } catch {
    return null;
  }
}
