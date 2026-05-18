const state = {
  exam: null,
  currentIndex: 0,
  answers: {},
  flagged: new Set(),
  mode: "exam",
  timer: null,
  secondsLeft: 0,
  confidence: {},
  questionStartedAt: 0,
  responseTimeMs: {},
};

const el = {
  questionCount: document.getElementById("questionCount"),
  mode: document.getElementById("mode"),
  generateBtn: document.getElementById("generateBtn"),
  progressLog: document.getElementById("progressLog"),
  exam: document.getElementById("exam"),
  question: document.getElementById("question"),
  timer: document.getElementById("timer"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  submitBtn: document.getElementById("submitBtn"),
  flagBtn: document.getElementById("flagBtn"),
  review: document.getElementById("review"),
  reviewContent: document.getElementById("reviewContent"),
  analytics: document.getElementById("analytics"),
  analyticsContent: document.getElementById("analyticsContent"),
  antiBiasContent: document.getElementById("antiBiasContent"),
  weakDrillBtn: document.getElementById("weakDrillBtn"),
  mistakeReplayBtn: document.getElementById("mistakeReplayBtn"),
  studyLoopContent: document.getElementById("studyLoopContent"),
};

function rankForOptionLength(q, optionId) {
  const lengths = q.options.map((o) => o.text.length).sort((a, b) => a - b);
  const selected = q.options.find((o) => o.id === optionId);
  const len = selected?.text.length ?? lengths[Math.floor(lengths.length / 2)];
  if (len <= lengths[0]) return "shortest";
  if (len >= lengths[lengths.length - 1]) return "longest";
  return "middle";
}

function computeAntiBiasDashboard(questions, examAntiBias) {
  const totals = { shortest: 0, middle: 0, longest: 0 };
  let mcqCount = 0;
  for (const q of questions) {
    if (typeof q.correctAnswer !== "string") continue;
    mcqCount += 1;
    totals[rankForOptionLength(q, q.correctAnswer)] += 1;
  }

  const position = examAntiBias?.answerPositionDistribution || {};
  const posValues = ["A", "B", "C", "D"].map((k) => position[k] || 0);
  const totalPos = posValues.reduce((a, b) => a + b, 0);
  const targetPer = totalPos / 4;
  const maxGap = totalPos === 0 ? 0 : Math.max(...posValues.map((v) => Math.abs(v - targetPer))) / totalPos;

  return {
    positionDistribution: position,
    positionBalanceStatus: maxGap <= 0.1 ? "pass" : "review",
    longestOptionCorrectRatio: Number((examAntiBias?.longestOptionCorrectRatio || 0).toFixed(3)),
    longestOptionStatus: (examAntiBias?.longestOptionCorrectRatio || 0) <= 0.3 ? "pass" : "review",
    correctOptionLengthRankDistribution: totals,
    mcqCount,
    target: {
      position: "A/B/C/D roughly balanced (±10%)",
      longestRatio: "Longest option correct ratio <= 0.30",
    },
  };
}

function log(msg) {
  el.progressLog.textContent += `${msg}\n`;
  el.progressLog.scrollTop = el.progressLog.scrollHeight;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function renderQuestion() {
  const q = state.exam.questions[state.currentIndex];
  state.questionStartedAt = Date.now();
  const selected = state.answers[q.id] || (q.type === "multi_select" ? [] : "");
  const confidence = state.confidence[q.id] || "";
  const mode = state.mode;

  const optionsHtml = q.options
    .map((opt) => {
      if (q.type === "multi_select") {
        const isChecked = Array.isArray(selected) && selected.includes(opt.id);
        return `<label class="option"><input type="checkbox" data-opt="${opt.id}" ${isChecked ? "checked" : ""}/> ${opt.id}. ${opt.text}</label>`;
      }
      const isChecked = selected === opt.id;
      return `<label class="option"><input type="radio" name="opt" data-opt="${opt.id}" ${isChecked ? "checked" : ""}/> ${opt.id}. ${opt.text}</label>`;
    })
    .join("");

  const artifact = q.artifact ? `<h4>${q.artifact.title}</h4><pre class="artifact">${q.artifact.content}</pre>` : "";

  const revealAllowed = mode === "review";
  const explanation = revealAllowed
    ? `<details><summary>Explanation</summary><p>${q.explanation.whyCorrect}</p></details>
       <details><summary>Why the other options are wrong</summary><ul>${Object.entries(q.explanation.whyDistractorsWrong)
         .map(([k, v]) => `<li>${k}: ${v}</li>`)
         .join("")}</ul></details>
       <details><summary>Source/objective tags</summary><p>${q.objectiveTags.join(", ")}</p></details>`
    : "";

  el.question.innerHTML = `
    <div class="question-card">
      <p><strong>Q${state.currentIndex + 1}/${state.exam.questions.length}</strong> | Domain ${q.domainId} | ${q.type}</p>
      <p>${q.stem}</p>
      <p>${q.scenario || ""}</p>
      ${artifact}
      <div>${optionsHtml}</div>
      <label class="option">
        Confidence:
        <select id="confidenceSelect">
          <option value="" ${confidence === "" ? "selected" : ""}>Not set</option>
          <option value="guessed" ${confidence === "guessed" ? "selected" : ""}>Guessed</option>
          <option value="somewhat_confident" ${confidence === "somewhat_confident" ? "selected" : ""}>Somewhat confident</option>
          <option value="confident" ${confidence === "confident" ? "selected" : ""}>Confident</option>
        </select>
      </label>
      ${explanation}
    </div>
  `;

  el.question.querySelectorAll("input[data-opt]").forEach((node) => {
    node.addEventListener("change", () => {
      const id = node.getAttribute("data-opt");
      if (!id) return;
      if (q.type === "multi_select") {
        const current = new Set(Array.isArray(state.answers[q.id]) ? state.answers[q.id] : []);
        if (node.checked) current.add(id);
        else current.delete(id);
        state.answers[q.id] = [...current];
      } else {
        state.answers[q.id] = id;
      }
    });
  });

  const confidenceSelect = document.getElementById("confidenceSelect");
  confidenceSelect?.addEventListener("change", () => {
    const value = confidenceSelect.value;
    if (!value) {
      delete state.confidence[q.id];
      return;
    }
    state.confidence[q.id] = value;
  });
}

function recordQuestionTime() {
  if (!state.exam || !state.questionStartedAt) return;
  const q = state.exam.questions[state.currentIndex];
  const elapsed = Math.max(0, Date.now() - state.questionStartedAt);
  state.responseTimeMs[q.id] = (state.responseTimeMs[q.id] || 0) + elapsed;
}

function startTimer(questionCount) {
  const totalMinutes = Math.round(questionCount * 1.2);
  state.secondsLeft = totalMinutes * 60;
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.secondsLeft -= 1;
    const mm = String(Math.floor(state.secondsLeft / 60)).padStart(2, "0");
    const ss = String(state.secondsLeft % 60).padStart(2, "0");
    el.timer.textContent = `Time left: ${mm}:${ss}`;
    if (state.secondsLeft <= 0) {
      clearInterval(state.timer);
      submitExam();
    }
  }, 1000);
}

async function generate() {
  el.progressLog.textContent = "";
  state.mode = el.mode.value;
  const questionCount = Number(el.questionCount.value || 30);

  log("Building blueprint...");
  const plan = await fetch("/api/exams/blueprint", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ questionCount }),
  }).then((r) => r.json());

  let questions = [];
  for (const batch of plan.batches) {
    log(`Generating ${batch.id} (${batch.questionCount})`);
    const generated = await fetch("/api/questions/generate-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan, batch, existingQuestionStems: questions.map((q) => q.stem) }),
    }).then((r) => r.json());

    log(`Validating ${batch.id}`);
    const validated = await fetch("/api/questions/validate-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questions: generated.questions }),
    }).then((r) => r.json());

    questions.push(...validated.questions.filter((q) => q.metadata.validationStatus !== "rejected"));
  }

  questions = shuffle(questions).slice(0, plan.totalQuestions);

  log("Assembling exam...");
  const exam = await fetch("/api/exams/assemble", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan, questions, caseStudies: [] }),
  }).then((r) => r.json());

  log(`Exam ready: ${exam.id}`);
  log(`Anti-bias: ${JSON.stringify(exam.antiBias)}`);

  state.exam = exam;
  state.currentIndex = 0;
  state.answers = {};
  state.confidence = {};
  state.responseTimeMs = {};
  state.flagged.clear();
  document.getElementById("exam").classList.remove("hidden");
  renderQuestion();
  startTimer(questionCount);
}

async function submitExam() {
  if (!state.exam) return;
  recordQuestionTime();
  clearInterval(state.timer);
  const attempt = await fetch("/api/attempts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ examId: state.exam.id, answers: state.answers, flagged: [...state.flagged], confidence: state.confidence }),
  }).then((r) => r.json());

  document.getElementById("review").classList.remove("hidden");
  document.getElementById("analytics").classList.remove("hidden");

  const reviewHtml = state.exam.questions
    .map((q, i) => {
      const user = state.answers[q.id];
      const isCorrect = JSON.stringify(user) === JSON.stringify(q.correctAnswer);
      return `<div class="question-card">
        <p><strong>Q${i + 1}</strong> ${isCorrect ? "✅" : "❌"}</p>
        <p>${q.stem}</p>
        <p><em>Your answer:</em> ${JSON.stringify(user ?? null)} | <em>Correct:</em> ${JSON.stringify(q.correctAnswer)}</p>
        <details><summary>Explanation</summary><p>${q.explanation.whyCorrect}</p></details>
        <details><summary>Why the other options are wrong</summary><ul>${Object.entries(q.explanation.whyDistractorsWrong)
          .map(([k, v]) => `<li>${k}: ${v}</li>`)
          .join("")}</ul></details>
        <details><summary>Source/objective tags</summary><p>${q.objectiveTags.join(", ")}</p></details>
      </div>`;
    })
    .join("");
  el.reviewContent.innerHTML = reviewHtml;

  const byTypeTimes = {};
  const distractorAttraction = {};
  for (const q of state.exam.questions) {
    const ms = state.responseTimeMs[q.id] || 0;
    byTypeTimes[q.type] ??= { totalMs: 0, count: 0 };
    byTypeTimes[q.type].totalMs += ms;
    byTypeTimes[q.type].count += 1;
    const user = state.answers[q.id];
    if (typeof q.correctAnswer === "string" && typeof user === "string" && user !== q.correctAnswer) {
      const key = `${q.id}:${user}`;
      distractorAttraction[key] = (distractorAttraction[key] || 0) + 1;
    }
  }
  const avgResponseTimeByTypeSeconds = Object.fromEntries(
    Object.entries(byTypeTimes).map(([type, v]) => [type, Number((v.totalMs / Math.max(1, v.count) / 1000).toFixed(1))]),
  );

  el.analyticsContent.textContent = JSON.stringify({
    overallScore: attempt.score.overall,
    domainBreakdown: attempt.score.byDomain,
    incorrectQuestionIds: attempt.score.incorrectQuestionIds,
    confidenceDistribution: Object.values(state.confidence).reduce((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {}),
    avgResponseTimeByTypeSeconds,
    distractorAttraction,
    flagged: [...state.flagged],
  }, null, 2);
  el.antiBiasContent.textContent = JSON.stringify(
    computeAntiBiasDashboard(state.exam.questions, state.exam.antiBias),
    null,
    2,
  );

  el.weakDrillBtn.onclick = async () => {
    const payload = await fetch(`/api/study/weak-domain-drill/${attempt.id}?limit=10`).then((r) => r.json());
    const ids = (payload.questions || []).map((q) => q.id);
    el.studyLoopContent.textContent = `Weak-domain drill (${ids.length}):\n${ids.join("\n")}`;
  };
  el.mistakeReplayBtn.onclick = async () => {
    const payload = await fetch(`/api/study/mistake-replay/${attempt.id}?limit=20`).then((r) => r.json());
    const ids = (payload.questions || []).map((q) => q.id);
    el.studyLoopContent.textContent = `Mistake replay (${ids.length}):\n${ids.join("\n")}`;
  };
}

el.generateBtn.addEventListener("click", generate);
el.prevBtn.addEventListener("click", () => {
  if (!state.exam) return;
  recordQuestionTime();
  state.currentIndex = Math.max(0, state.currentIndex - 1);
  renderQuestion();
});
el.nextBtn.addEventListener("click", () => {
  if (!state.exam) return;
  recordQuestionTime();
  state.currentIndex = Math.min(state.exam.questions.length - 1, state.currentIndex + 1);
  renderQuestion();
});
el.flagBtn.addEventListener("click", () => {
  if (!state.exam) return;
  const q = state.exam.questions[state.currentIndex];
  if (state.flagged.has(q.id)) state.flagged.delete(q.id);
  else state.flagged.add(q.id);
});
el.submitBtn.addEventListener("click", submitExam);
