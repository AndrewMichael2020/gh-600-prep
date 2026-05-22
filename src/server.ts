import express from "express";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

import { assembleExam, createPlan, generateBatch, validateBatch } from "./generation.js";
import { getAttempt, getExam, listExams, saveAttempt, saveExam } from "./persistence.js";
import { scoreAttempt } from "./scoring.js";
import { buildDomainSubskillDrill, buildMistakeReplay, buildWeakDomainDrill } from "./studyLoops.js";
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

app.get("/healthz", (_req, res) => {
  return res.status(200).json({ ok: true, service: "gh-600-prep", timestamp: new Date().toISOString() });
});

// Reports whether server-side generation is available and how many exams are stored.
// The frontend uses this to decide whether to show the exam list or the generate flow.
app.get("/api/config", async (_req, res) => {
  const exams = await listExams();
  return res.json({
    hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    examCount: exams.length,
  });
});

// List all stored exams (summary only — no questions).
app.get("/api/exams", async (_req, res) => {
  const exams = await listExams();
  return res.json(exams);
});

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
  const { questions, caseStudy } = await generateBatch(
    parsed.data.plan,
    parsed.data.batch,
    parsed.data.existingQuestionStems
  );
  return res.json({ questions, caseStudy });
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

// NOTE: /api/exams/generate must be registered BEFORE /api/exams/:id
// to prevent Express matching "generate" as a dynamic :id parameter.
// Server-side generation pipeline via Server-Sent Events.
// The client connects once; the server streams batch progress and sends the
// finished exam on completion.  The generation terminal is never exposed to
// the user — they only see a progress overlay with human-readable status.
app.get("/api/exams/generate", async (req, res) => {
  const questionCount = Math.max(1, Math.min(200, Number(req.query.questionCount || 30)));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let closed = false;
  req.on("close", () => {
    closed = true;
    console.log(`[SSE] Client disconnected (questionCount=${questionCount})`);
  });

  // Keepalive: send SSE comment every 15 s so proxies/browsers don't drop the idle connection
  // during long OpenAI calls (case_study batches can take 60–90 s).
  const keepAlive = setInterval(() => {
    if (!closed) res.write(": keepalive\n\n");
  }, 15_000);

  const send = (data: object) => {
    if (!closed) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  console.log(`[SSE] Generation started — questionCount=${questionCount}`);

  try {
    const plan = createPlan(questionCount);
    console.log(`[SSE] Plan created — ${plan.batches.length} batches, ${plan.totalQuestions} questions`);
    send({ type: "plan", totalBatches: plan.batches.length, totalQuestions: plan.totalQuestions });

    const allQuestions: ReturnType<typeof validateBatch> = [];
    const allCaseStudies: import("./types.js").CaseStudy[] = [];

    for (let i = 0; i < plan.batches.length; i++) {
      if (closed) { console.log(`[SSE] Aborted at batch ${i} — client closed`); break; }
      const batch = plan.batches[i];
      console.log(`[SSE] Batch ${i + 1}/${plan.batches.length} starting — domain=${batch.domainId ?? "mixed"} type=${batch.typeFocus.join(",")} count=${batch.questionCount}`);
      send({
        type: "batch_start",
        index: i,
        total: plan.batches.length,
        domainId: batch.domainId ?? null,
        domainName: batch.domainName ?? null,
        typeFocus: batch.typeFocus,
        questionCount: batch.questionCount,
      });

      const { questions: generated, caseStudy } = await generateBatch(
        plan,
        batch,
        allQuestions.map((q) => q.stem)
      );
      console.log(`[SSE] Batch ${i + 1} raw=${generated.length} questions received`);
      if (caseStudy) allCaseStudies.push(caseStudy);
      const validated = validateBatch(generated);
      const accepted = validated.filter((q) => q.metadata.validationStatus !== "rejected");
      allQuestions.push(...accepted);
      console.log(`[SSE] Batch ${i + 1} accepted=${accepted.length} running_total=${allQuestions.length}`);

      send({ type: "batch_done", index: i, accepted: accepted.length, running: allQuestions.length });
    }

    const exam = assembleExam(
      plan,
      allQuestions as import("./types.js").PracticeQuestion[],
      allCaseStudies
    );
    await saveExam(exam);
    console.log(`[SSE] Exam assembled — id=${exam.id} questions=${exam.questions.length}`);
    send({ type: "complete", examId: exam.id, exam });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[SSE] Generation error:`, err);
    send({ type: "error", message: msg });
  } finally {
    clearInterval(keepAlive);
    res.end();
  }
});

app.get("/api/exams/:id", async (req, res) => {
  const exam = await getExam(req.params.id);
  if (!exam) return res.status(404).json({ error: "Exam not found" });
  return res.json(exam);
});

app.get("/api/study/weak-domain-drill/:attemptId", async (req, res) => {
  const attempt = await getAttempt(req.params.attemptId);
  if (!attempt) return res.status(404).json({ error: "Attempt not found" });
  const exam = await getExam(attempt.examId);
  if (!exam) return res.status(404).json({ error: "Exam not found" });
  const limit = Number(req.query.limit || 10);
  return res.json({ questions: buildWeakDomainDrill(exam.questions, attempt, limit) });
});

app.get("/api/study/mistake-replay/:attemptId", async (req, res) => {
  const attempt = await getAttempt(req.params.attemptId);
  if (!attempt) return res.status(404).json({ error: "Attempt not found" });
  const exam = await getExam(attempt.examId);
  if (!exam) return res.status(404).json({ error: "Exam not found" });
  const limit = Number(req.query.limit || 20);
  return res.json({ questions: buildMistakeReplay(exam.questions, attempt, limit) });
});

app.get("/api/study/domain-subskill-drill/:attemptId", async (req, res) => {
  const attempt = await getAttempt(req.params.attemptId);
  if (!attempt) return res.status(404).json({ error: "Attempt not found" });
  const exam = await getExam(attempt.examId);
  if (!exam) return res.status(404).json({ error: "Exam not found" });
  const limit = Number(req.query.limit || 12);
  return res.json({ questions: buildDomainSubskillDrill(exam.questions, attempt, limit) });
});

app.get("/api/exports/attempt/:attemptId", async (req, res) => {
  const attempt = await getAttempt(req.params.attemptId);
  if (!attempt) return res.status(404).json({ error: "Attempt not found" });
  const exam = await getExam(attempt.examId);
  if (!exam) return res.status(404).json({ error: "Exam not found" });

  const payload = {
    generatedAt: new Date().toISOString(),
    attemptId: attempt.id,
    examId: exam.id,
    score: attempt.score,
    flagged: attempt.flagged,
    confidence: attempt.confidence,
    incorrect: exam.questions
      .filter((q) => attempt.score.incorrectQuestionIds.includes(q.id))
      .map((q) => ({ id: q.id, domainId: q.domainId, objectiveTags: q.objectiveTags, type: q.type })),
  };
  res.setHeader("content-type", "application/json");
  res.setHeader("content-disposition", `attachment; filename=\"attempt-${attempt.id}-report.json\"`);
  return res.send(JSON.stringify(payload, null, 2));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`GH-600 prep app running on http://localhost:${port}`);
  console.log(`[CONFIG] model=${process.env.OPENAI_MODEL ?? "gpt-5.5"} hasApiKey=${Boolean(process.env.OPENAI_API_KEY)} effort=${process.env.OPENAI_REASONING_EFFORT ?? "medium"}`);
});
