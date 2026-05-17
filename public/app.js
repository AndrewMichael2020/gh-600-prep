const state = {
  exam: null,
  currentIndex: 0,
  answers: {},
  flagged: new Set(),
  mode: "exam",
  timer: null,
  secondsLeft: 0,
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
};

function log(msg) {
  el.progressLog.textContent += `${msg}\n`;
  el.progressLog.scrollTop = el.progressLog.scrollHeight;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function renderQuestion() {
  const q = state.exam.questions[state.currentIndex];
  const selected = state.answers[q.id] || (q.type === "multi_select" ? [] : "");
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
  state.flagged.clear();
  document.getElementById("exam").classList.remove("hidden");
  renderQuestion();
  startTimer(questionCount);
}

async function submitExam() {
  if (!state.exam) return;
  clearInterval(state.timer);
  const attempt = await fetch("/api/attempts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ examId: state.exam.id, answers: state.answers, flagged: [...state.flagged], confidence: {} }),
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

  el.analyticsContent.textContent = JSON.stringify({
    overallScore: attempt.score.overall,
    domainBreakdown: attempt.score.byDomain,
    incorrectQuestionIds: attempt.score.incorrectQuestionIds,
    flagged: [...state.flagged],
  }, null, 2);
}

el.generateBtn.addEventListener("click", generate);
el.prevBtn.addEventListener("click", () => {
  if (!state.exam) return;
  state.currentIndex = Math.max(0, state.currentIndex - 1);
  renderQuestion();
});
el.nextBtn.addEventListener("click", () => {
  if (!state.exam) return;
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
