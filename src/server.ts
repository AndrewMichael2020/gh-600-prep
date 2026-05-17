import express from "express";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { assembleExam, createPlan, generateBatch, validateBatch } from "./generation.js";
import { getAttempt, getExam, saveAttempt, saveExam } from "./persistence.js";
import { scoreAttempt } from "./scoring.js";
import { Attempt } from "./types.js";
import {
  assembleRequestSchema,
  attemptRequestSchema,
  blueprintRequestSchema,
  generateBatchRequestSchema,
  validateBatchRequestSchema,
} from "./validators.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

const requestTracker = new Map<string, { count: number; resetAt: number }>();
app.use((req, res, next) => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const windowMs = 60_000;
  const maxPerWindow = 120;
  const bucket = requestTracker.get(key);
  if (!bucket || now > bucket.resetAt) {
    requestTracker.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }
  if (bucket.count >= maxPerWindow) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }
  bucket.count += 1;
  requestTracker.set(key, bucket);
  return next();
});
app.use(express.static(path.join(process.cwd(), "public")));

app.post("/api/exams/blueprint", (req, res) => {
  const parsed = blueprintRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return res.json(createPlan(parsed.data.questionCount));
});

app.post("/api/questions/generate-batch", async (req, res) => {
  const parsed = generateBatchRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const questions = await generateBatch(parsed.data.plan, parsed.data.batch, parsed.data.existingQuestionStems);
  return res.json({ questions });
});

app.post("/api/questions/validate-batch", (req, res) => {
  const parsed = validateBatchRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return res.json({ questions: validateBatch(parsed.data.questions) });
});

app.post("/api/exams/assemble", async (req, res) => {
  const parsed = assembleRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const exam = assembleExam(parsed.data.plan, parsed.data.questions, parsed.data.caseStudies);
  await saveExam(exam);
  return res.json(exam);
});

app.post("/api/attempts", async (req, res) => {
  const parsed = attemptRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const exam = await getExam(parsed.data.examId);
  if (!exam) return res.status(404).json({ error: "Exam not found" });
  const score = scoreAttempt(exam.questions, parsed.data.answers);
  const attempt: Attempt = {
    id: uuidv4(),
    examId: exam.id,
    createdAt: new Date().toISOString(),
    answers: parsed.data.answers,
    confidence: parsed.data.confidence,
    flagged: parsed.data.flagged,
    score,
  };
  await saveAttempt(attempt);
  return res.json(attempt);
});

app.get("/api/attempts/:id", async (req, res) => {
  const attempt = await getAttempt(req.params.id);
  if (!attempt) return res.status(404).json({ error: "Attempt not found" });
  return res.json(attempt);
});

app.get("/api/exams/:id", async (req, res) => {
  const exam = await getExam(req.params.id);
  if (!exam) return res.status(404).json({ error: "Exam not found" });
  return res.json(exam);
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`GH-600 prep app running on http://localhost:${port}`);
});
