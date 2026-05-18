import { promises as fs } from "node:fs";
import path from "node:path";
import { Attempt, ExamSet } from "./types.js";

const base = process.cwd();
const examsFile = path.join(base, "data", "exams", "exams.json");
const attemptsFile = path.join(base, "data", "attempts", "attempts.json");

function safeId(id: string) {
  const normalized = id.trim();
  if (!/^[a-zA-Z0-9-]+$/.test(normalized)) {
    throw new Error("Invalid identifier");
  }
  return normalized;
}

async function ensureDataFiles() {
  await fs.mkdir(path.dirname(examsFile), { recursive: true });
  await fs.mkdir(path.dirname(attemptsFile), { recursive: true });
  try {
    await fs.access(examsFile);
  } catch {
    await fs.writeFile(examsFile, "[]");
  }
  try {
    await fs.access(attemptsFile);
  } catch {
    await fs.writeFile(attemptsFile, "[]");
  }
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  const text = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

async function writeJsonArray<T>(filePath: string, rows: T[]) {
  await fs.writeFile(filePath, JSON.stringify(rows, null, 2));
}

export async function saveExam(exam: ExamSet) {
  await ensureDataFiles();
  const id = safeId(exam.id);
  const all = await readJsonArray<ExamSet>(examsFile);
  const filtered = all.filter((row) => row.id !== id);
  filtered.push({ ...exam, id });
  await writeJsonArray(examsFile, filtered);
}

export async function getExam(id: string): Promise<ExamSet | null> {
  try {
    await ensureDataFiles();
    const all = await readJsonArray<ExamSet>(examsFile);
    const found = all.find((row) => row.id === safeId(id));
    return found ?? null;
  } catch {
    return null;
  }
}

export async function saveAttempt(attempt: Attempt) {
  await ensureDataFiles();
  const id = safeId(attempt.id);
  const all = await readJsonArray<Attempt>(attemptsFile);
  const filtered = all.filter((row) => row.id !== id);
  filtered.push({ ...attempt, id });
  await writeJsonArray(attemptsFile, filtered);
}

export async function getAttempt(id: string): Promise<Attempt | null> {
  try {
    await ensureDataFiles();
    const all = await readJsonArray<Attempt>(attemptsFile);
    const found = all.find((row) => row.id === safeId(id));
    return found ?? null;
  } catch {
    return null;
  }
}
