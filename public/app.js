// ── State ───────────────────────────────────────────────────────────
const state = {
  exam: null,
  attempt: null,
  mode: "exam",
  questionCount: 30,
  currentIndex: 0,
  answers: {},
  confidence: {},
  flagged: new Set(),
  responseTimeMs: {},
  questionStartedAt: 0,
  timerInterval: null,
  secondsLeft: 0,
};

// ── View routing ────────────────────────────────────────────────────
function showView(id) {
  document.querySelectorAll(".view").forEach((v) => {
    const isTarget = v.id === id;
    v.classList.toggle("active", isTarget);
    // Each #view-* has display:flex via ID selector (beats .view { display:none }).
    // Only .hidden { display:none !important } can override it, so we must
    // explicitly add/remove .hidden rather than relying on CSS class precedence.
    v.classList.toggle("hidden", !isTarget);
  });
}

// ── Initialise setup view ───────────────────────────────────────────
// Fetches /api/config and /api/exams on load.
// · If exams exist  → renders the exam list (users pick a pre-built exam).
// · If hasApiKey    → shows the generation form (dev mode only).
// · If neither      → shows a "no exams" message.
async function initSetupView() {
  const [cfg, exams] = await Promise.all([
    fetch("/api/config").then((r) => r.json()).catch(() => ({ hasApiKey: false, examCount: 0 })),
    fetch("/api/exams").then((r) => r.json()).catch(() => []),
  ]);

  if (exams.length > 0) {
    renderExamList(exams);
    document.getElementById("examListSection").classList.remove("hidden");
  }

  if (cfg.hasApiKey) {
    document.getElementById("generateSection").classList.remove("hidden");
  } else if (exams.length === 0) {
    document.getElementById("noExamsMsg").classList.remove("hidden");
  }
}

function renderExamList(exams) {
  const ul = document.getElementById("examList");
  ul.innerHTML = exams
    .slice()
    .reverse() // newest first
    .map((e) => {
      const date = new Date(e.createdAt).toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric",
      });
      return `<li class="exam-list-item">
        <div class="exam-list-meta">
          <span class="exam-list-date">${escHtml(date)}</span>
          <span class="exam-list-count">${e.questionCount} questions</span>
        </div>
        <button class="btn btn-primary btn-sm" data-exam-id="${escHtml(e.id)}">Take Exam</button>
      </li>`;
    })
    .join("");

  ul.querySelectorAll("[data-exam-id]").forEach((btn) => {
    btn.addEventListener("click", () => loadExam(btn.dataset.examId));
  });
}

async function loadExam(examId) {
  const exam = await fetch(`/api/exams/${examId}`).then((r) => r.json());
  if (!exam || exam.error) {
    alert("Could not load exam. Please try again.");
    return;
  }
  state.exam = exam;
  state.currentIndex = 0;
  state.answers = {};
  state.confidence = {};
  state.responseTimeMs = {};
  state.flagged = new Set();
  startExam();
}

initSetupView();

// ── Setup form (generation) ─────────────────────────────────────────
document.querySelectorAll("#countPills .pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#countPills .pill").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    state.questionCount = Number(btn.dataset.count);
    document.getElementById("customCount").value = "";
  });
});

document.getElementById("customCount").addEventListener("input", (e) => {
  const v = Number(e.target.value);
  if (v > 0) {
    document.querySelectorAll("#countPills .pill").forEach((p) => p.classList.remove("active"));
    state.questionCount = v;
  }
});

document.querySelectorAll("#modePills .pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#modePills .pill").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    state.mode = btn.dataset.mode;
  });
});

document.getElementById("startBtn").addEventListener("click", startGeneration);

// ── Generation (SSE) ────────────────────────────────────────────────
function startGeneration() {
  showView("view-loading");
  document.getElementById("loadingBar").style.width = "0%";
  document.getElementById("loadingStatus").textContent = "Building exam blueprint…";
  document.getElementById("loadingDetail").textContent = "";
  document.getElementById("batchLog").innerHTML = "";

  const url = `/api/exams/generate?questionCount=${state.questionCount}`;
  const es = new EventSource(url);

  es.onmessage = (e) => {
    const data = JSON.parse(e.data);

    if (data.type === "plan") {
      document.getElementById("loadingStatus").textContent =
        `Generating ${data.totalQuestions} questions across ${data.totalBatches} batches…`;
    }

    if (data.type === "batch_start") {
      const pct = Math.round((data.index / data.total) * 90);
      document.getElementById("loadingBar").style.width = pct + "%";

      const domainLabel = data.domainName
        ? `Domain ${data.domainId}: ${data.domainName}`
        : data.typeFocus?.join(", ") ?? "Special batch";
      document.getElementById("loadingDetail").textContent = `Generating ${domainLabel}…`;

      const li = document.createElement("li");
      li.id = `bl-${data.index}`;
      li.className = "active";
      li.innerHTML = `<span>⏳</span> <span>${domainLabel}</span>`;
      document.getElementById("batchLog").appendChild(li);
      li.scrollIntoView({ block: "nearest" });
    }

    if (data.type === "batch_done") {
      const li = document.getElementById(`bl-${data.index}`);
      if (li) {
        li.className = "done";
        li.innerHTML = `<span>✅</span> <span>${li.querySelector("span:last-child").textContent.replace("…", "")} (${data.accepted}q)</span>`;
      }
    }

    if (data.type === "complete") {
      es.close();
      document.getElementById("loadingBar").style.width = "100%";
      document.getElementById("loadingStatus").textContent = "Exam ready!";
      state.exam = data.exam;
      state.currentIndex = 0;
      state.answers = {};
      state.confidence = {};
      state.responseTimeMs = {};
      state.flagged = new Set();
      setTimeout(() => startExam(), 400);
    }

    if (data.type === "error") {
      es.close();
      document.getElementById("loadingStatus").textContent = "Generation failed — " + data.message;
      document.getElementById("loadingDetail").textContent = "Please try again.";
      setTimeout(() => showView("view-setup"), 3000);
    }
  };

  es.onerror = () => {
    es.close();
    document.getElementById("loadingStatus").textContent = "Connection error. Please try again.";
    setTimeout(() => showView("view-setup"), 3000);
  };
}

// ── Exam start ──────────────────────────────────────────────────────
function startExam() {
  showView("view-exam");
  renderQuestion();
  renderQMap();
  if (state.mode === "exam") startTimer();
  else document.getElementById("examTimer").textContent = "Practice";
}

// ── Timer ───────────────────────────────────────────────────────────
function startTimer() {
  clearInterval(state.timerInterval);
  state.secondsLeft = Math.round(state.exam.questions.length * 1.2) * 60;
  tickTimer();
  state.timerInterval = setInterval(tickTimer, 1000);
}

function tickTimer() {
  state.secondsLeft = Math.max(0, state.secondsLeft - 1);
  const mm = String(Math.floor(state.secondsLeft / 60)).padStart(2, "0");
  const ss = String(state.secondsLeft % 60).padStart(2, "0");
  const el = document.getElementById("examTimer");
  el.textContent = `${mm}:${ss}`;
  const total = Math.round(state.exam.questions.length * 1.2) * 60;
  const ratio = state.secondsLeft / total;
  el.classList.toggle("warning", ratio < 0.25 && ratio >= 0.1);
  el.classList.toggle("danger",  ratio < 0.1);
  if (state.secondsLeft === 0) submitExam();
}

// ── Question rendering ──────────────────────────────────────────────
function renderQuestion() {
  if (!state.exam) return;
  const q = state.exam.questions[state.currentIndex];
  state.questionStartedAt = Date.now();

  // Header badges
  const domainBadge = document.getElementById("domainBadge");
  domainBadge.textContent = `Domain ${q.domainId}: ${q.domainName}`;
  domainBadge.className = `badge badge-domain badge-domain-${q.domainId}`;
  document.getElementById("typeBadge").textContent = q.type.replace(/_/g, " ");
  const diffEl = document.getElementById("diffBadge");
  diffEl.textContent = q.difficulty.replace(/_/g, " ");
  diffEl.className = `badge badge-diff badge-diff-${q.difficulty}`;
  document.getElementById("examCounter").textContent = `Q ${state.currentIndex + 1} / ${state.exam.questions.length}`;

  // Card content
  const card = document.getElementById("questionCard");
  const showExplanation = state.mode === "review";

  let artifactHtml = "";
  if (q.artifact) {
    artifactHtml = `<div class="q-artifact">
      <div class="q-artifact-title">📄 ${q.artifact.title}</div>
      <pre><code>${escHtml(q.artifact.content)}</code></pre>
    </div>`;
  }

  card.innerHTML = `
    <p class="q-stem">${escHtml(q.stem)}</p>
    ${q.scenario ? `<div class="q-scenario">${escHtml(q.scenario)}</div>` : ""}
    ${artifactHtml}
    <div class="options" id="optionsContainer"></div>
    ${renderStructuredInteraction(q)}
    <div class="confidence-row">
      <span>Confidence:</span>
      <select id="confidenceSelect">
        <option value="">Not set</option>
        <option value="guessed" ${state.confidence[q.id] === "guessed" ? "selected" : ""}>Guessed</option>
        <option value="somewhat_confident" ${state.confidence[q.id] === "somewhat_confident" ? "selected" : ""}>Somewhat confident</option>
        <option value="confident" ${state.confidence[q.id] === "confident" ? "selected" : ""}>Confident</option>
      </select>
    </div>
    ${showExplanation ? renderExplanation(q) : ""}
  `;

  renderOptions(q);
  wireOptionListeners(q);
  wireConfidence(q);
}

function renderOptions(q) {
  if (q.type === "sequence_order" || q.type === "matching_magnet") return;
  const container = document.getElementById("optionsContainer");
  const selected = state.answers[q.id];
  const showResult = state.mode === "review";

  container.innerHTML = q.options.map((opt) => {
    const isMulti = q.type === "multi_select";
    const isSelected = isMulti
      ? Array.isArray(selected) && selected.includes(opt.id)
      : selected === opt.id;
    const isCorrect = showResult && (
      isMulti ? (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.id)) : q.correctAnswer === opt.id
    );
    const isWrong = showResult && isSelected && !isCorrect;

    let cls = "option-btn";
    if (isCorrect) cls += " correct";
    else if (isWrong) cls += " wrong";
    else if (isSelected) cls += " selected";

    return `<button class="${cls}" data-opt="${opt.id}" type="button">
      <span class="opt-id">${opt.id}</span>
      <span>${escHtml(opt.text)}</span>
    </button>`;
  }).join("");
}

function wireOptionListeners(q) {
  document.querySelectorAll("#optionsContainer .option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.mode === "review") return;
      const id = btn.dataset.opt;
      if (q.type === "multi_select") {
        const cur = new Set(Array.isArray(state.answers[q.id]) ? state.answers[q.id] : []);
        if (cur.has(id)) cur.delete(id); else cur.add(id);
        state.answers[q.id] = [...cur];
      } else {
        state.answers[q.id] = id;
      }
      renderOptions(q);
      renderQMap();
    });
  });
}

function wireConfidence(q) {
  document.getElementById("confidenceSelect")?.addEventListener("change", (e) => {
    if (e.target.value) state.confidence[q.id] = e.target.value;
    else delete state.confidence[q.id];
  });
}

function renderStructuredInteraction(q) {
  if (q.type === "sequence_order") {
    const order = Array.isArray(state.answers[q.id]?.order) && state.answers[q.id].order.length
      ? state.answers[q.id].order
      : q.options.map((o) => o.id);
    return `<div class="structured-block">
      <p>Drag or use arrows to set the correct order:</p>
      <ul class="seq-list" id="seqList">
        ${order.map((id, i) => {
          const opt = q.options.find((o) => o.id === id);
          return `<li class="seq-item" data-id="${id}">
            <span class="seq-pos">${i + 1}.</span>
            <span class="seq-label">${escHtml(opt?.text ?? id)}</span>
            <button class="btn btn-icon" data-seq-up="${i}" style="padding:.2rem .45rem">↑</button>
            <button class="btn btn-icon" data-seq-down="${i}" style="padding:.2rem .45rem">↓</button>
          </li>`;
        }).join("")}
      </ul>
    </div>`;
  }
  if (q.type === "matching_magnet") {
    const pairs = state.answers[q.id]?.pairs ?? {};
    return `<div class="structured-block">
      <p>Match each item to its value:</p>
      ${q.options.map((opt) => `
        <div class="match-row">
          <label>${opt.id}. ${escHtml(opt.text)}</label>
          <input data-match-key="${opt.id}" value="${escHtml(pairs[opt.id] ?? "")}" placeholder="Enter match…" />
        </div>
      `).join("")}
    </div>`;
  }
  return "";
}

function renderExplanation(q) {
  const whyWrong = Object.entries(q.explanation.whyDistractorsWrong ?? {})
    .map(([k, v]) => `<li><strong>${k}:</strong> ${escHtml(String(v))}</li>`)
    .join("");
  return `<div class="explanation-block">
    <details>
      <summary>✅ Why the correct answer is right</summary>
      <div class="exp-body">${escHtml(q.explanation.whyCorrect)}</div>
    </details>
    ${whyWrong ? `<details>
      <summary>❌ Why the other options are wrong</summary>
      <div class="exp-body"><ul class="exp-why-list">${whyWrong}</ul></div>
    </details>` : ""}
    ${q.explanation.examStrategyNote ? `<div class="strategy-note">💡 ${escHtml(q.explanation.examStrategyNote)}</div>` : ""}
    <details>
      <summary>🏷 Objective tags</summary>
      <div class="exp-body">${q.objectiveTags.map((t) => `<span class="badge badge-type">${t}</span>`).join(" ")}</div>
    </details>
  </div>`;
}

// ── Question map ────────────────────────────────────────────────────
function renderQMap() {
  if (!state.exam) return;
  const container = document.getElementById("qMap");
  // Only show first 40 dots to avoid overflow
  const qs = state.exam.questions.slice(0, 40);
  container.innerHTML = qs.map((q, i) => {
    let cls = "q-dot";
    if (i === state.currentIndex) cls += " current";
    else if (state.flagged.has(q.id)) cls += " flagged";
    else if (state.answers[q.id] !== undefined) cls += " answered";
    return `<button class="${cls}" data-qi="${i}" title="Q${i + 1}">${i + 1}</button>`;
  }).join("");
  container.querySelectorAll(".q-dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      recordTime();
      state.currentIndex = Number(dot.dataset.qi);
      renderQuestion();
      renderQMap();
    });
  });
}

// ── Navigation ──────────────────────────────────────────────────────
function recordTime() {
  if (!state.exam || !state.questionStartedAt) return;
  const q = state.exam.questions[state.currentIndex];
  state.responseTimeMs[q.id] = (state.responseTimeMs[q.id] ?? 0) + Math.max(0, Date.now() - state.questionStartedAt);
}

document.getElementById("prevBtn").addEventListener("click", () => {
  if (!state.exam) return;
  recordTime();
  state.currentIndex = Math.max(0, state.currentIndex - 1);
  renderQuestion(); renderQMap();
});

document.getElementById("nextBtn").addEventListener("click", () => {
  if (!state.exam) return;
  recordTime();
  state.currentIndex = Math.min(state.exam.questions.length - 1, state.currentIndex + 1);
  renderQuestion(); renderQMap();
});

document.getElementById("flagBtn").addEventListener("click", () => {
  if (!state.exam) return;
  const q = state.exam.questions[state.currentIndex];
  if (state.flagged.has(q.id)) state.flagged.delete(q.id);
  else state.flagged.add(q.id);
  renderQMap();
});

// Wire sequence and matching after render
document.getElementById("questionCard").addEventListener("click", (e) => {
  const upBtn = e.target.closest("[data-seq-up]");
  const dnBtn = e.target.closest("[data-seq-down]");
  if (!upBtn && !dnBtn) return;
  const q = state.exam.questions[state.currentIndex];
  const order = Array.isArray(state.answers[q.id]?.order)
    ? [...state.answers[q.id].order]
    : q.options.map((o) => o.id);
  const idx = Number((upBtn ?? dnBtn).dataset[upBtn ? "seqUp" : "seqDown"]);
  if (upBtn && idx > 0) [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
  if (dnBtn && idx < order.length - 1) [order[idx + 1], order[idx]] = [order[idx], order[idx + 1]];
  state.answers[q.id] = { order };
  renderQuestion(); renderQMap();
});

document.getElementById("questionCard").addEventListener("change", (e) => {
  const input = e.target.closest("[data-match-key]");
  if (!input) return;
  const q = state.exam.questions[state.currentIndex];
  const pairs = { ...(state.answers[q.id]?.pairs ?? {}) };
  if (input.value.trim()) pairs[input.dataset.matchKey] = input.value.trim();
  else delete pairs[input.dataset.matchKey];
  state.answers[q.id] = { pairs };
});

// ── Submit ──────────────────────────────────────────────────────────
document.getElementById("submitBtn").addEventListener("click", submitExam);

async function submitExam() {
  if (!state.exam) return;
  recordTime();
  clearInterval(state.timerInterval);

  const res = await fetch("/api/attempts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      examId: state.exam.id,
      answers: state.answers,
      flagged: [...state.flagged],
      confidence: state.confidence,
    }),
  });
  state.attempt = await res.json();
  showResults();
}

// ── Results view ────────────────────────────────────────────────────
function showResults() {
  showView("view-results");
  const score = state.attempt.score;
  const pct = Math.round((score.correct / score.total) * 100);

  // Animated ring
  document.getElementById("scorePercent").textContent = pct + "%";
  const circumference = 314;
  const offset = circumference - (circumference * pct) / 100;
  setTimeout(() => {
    document.getElementById("ringFill").style.strokeDashoffset = offset;
    document.getElementById("ringFill").style.stroke = pct >= 70 ? "var(--color-success)" : pct >= 50 ? "var(--color-warning)" : "var(--color-danger)";
  }, 100);

  const pass = pct >= 70;
  document.getElementById("scoreSummary").innerHTML = `
    <h2>${pass ? "🎉 Passed!" : "📚 Keep studying"}</h2>
    <p>${score.correct} / ${score.total} correct · ${pct}%</p>
  `;

  // Domain breakdown
  const breakdown = document.getElementById("domainBreakdown");
  const domainNames = {
    A: "Agent architecture", B: "MCP & permissions", C: "Memory & state",
    D: "Evaluation & telemetry", E: "Multi-agent orchestration", F: "Guardrails & governance",
  };
  breakdown.innerHTML = Object.entries(score.byDomain).map(([domain, domScore]) => {
    const dpct = Math.round(Number(domScore) * 100);
    const cls = dpct >= 70 ? "good" : dpct >= 50 ? "" : "bad";
    return `<div class="domain-row">
      <div class="domain-row-label">
        <strong>Domain ${domain}: ${domainNames[domain] ?? domain}</strong>
        <span>${dpct}%</span>
      </div>
      <div class="domain-bar-track">
        <div class="domain-bar-fill ${cls}" style="width:${dpct}%"></div>
      </div>
    </div>`;
  }).join("");
}

document.getElementById("reviewBtn").addEventListener("click", () => {
  buildReviewView("all");
  showView("view-review");
});

document.getElementById("analyticsBtn").addEventListener("click", () => {
  buildAnalyticsView();
  showView("view-analytics");
});

document.getElementById("newExamBtn").addEventListener("click", () => {
  clearInterval(state.timerInterval);
  state.exam = null; state.attempt = null;
  showView("view-setup");
});

document.getElementById("backToResultsBtn").addEventListener("click", () => showView("view-results"));
document.getElementById("backToResultsBtn2").addEventListener("click", () => showView("view-results"));

// ── Review view ─────────────────────────────────────────────────────
function buildReviewView(filter) {
  const qs = state.exam.questions;
  const list = document.getElementById("reviewList");

  document.querySelectorAll(".filter-pill").forEach((p) => {
    p.classList.toggle("active", p.dataset.filter === filter);
  });

  const items = qs.map((q, i) => {
    const user = state.answers[q.id];
    const correct = isCorrect(q, user);
    if (filter === "wrong" && correct) return null;
    if (filter === "right" && !correct) return null;

    const userLabel = user === undefined ? "(no answer)" : JSON.stringify(user);
    const correctLabel = JSON.stringify(q.correctAnswer);
    const sameAnswer = userLabel === correctLabel;

    return `<div class="review-item ${correct ? "correct" : "wrong"}" data-correct="${correct}" data-wrong="${!correct}">
      <div class="review-item-header" onclick="this.parentElement.querySelector('.review-body').toggleAttribute('hidden')">
        <span class="review-num">Q${i + 1}</span>
        <span class="review-stem">${escHtml(q.stem.slice(0, 120))}${q.stem.length > 120 ? "…" : ""}</span>
        <span class="review-verdict">${correct ? "✅" : "❌"}</span>
      </div>
      <div class="review-body" hidden>
        <p class="q-stem">${escHtml(q.stem)}</p>
        ${q.scenario ? `<div class="q-scenario">${escHtml(q.scenario)}</div>` : ""}
        <div class="options">
          ${q.options.map((opt) => {
            const isCorr = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt.id) : q.correctAnswer === opt.id;
            const isUser = Array.isArray(user) ? user.includes(opt.id) : user === opt.id;
            let cls = "option-btn";
            if (isCorr) cls += " correct";
            else if (isUser && !isCorr) cls += " wrong";
            return `<div class="${cls}" style="cursor:default">
              <span class="opt-id">${opt.id}</span>
              <span>${escHtml(opt.text)}</span>
            </div>`;
          }).join("")}
        </div>
        <div class="review-answers">
          ${sameAnswer
            ? `<span class="ans-same">✅ Your answer: ${userLabel}</span>`
            : `<span class="ans-user">Your answer: ${userLabel}</span>
               <span class="ans-correct">Correct: ${correctLabel}</span>`}
        </div>
        ${renderExplanation(q)}
      </div>
    </div>`;
  }).filter(Boolean);

  list.innerHTML = items.length ? items.join("") : `<p style="color:var(--color-muted);padding:1rem">No questions match this filter.</p>`;
}

document.querySelectorAll(".filter-pill").forEach((p) => {
  p.addEventListener("click", () => buildReviewView(p.dataset.filter));
});

// ── Analytics view ──────────────────────────────────────────────────
function buildAnalyticsView() {
  const score = state.attempt.score;
  const pct = Math.round((score.correct / score.total) * 100);
  document.getElementById("statScore").textContent = `${pct}% (${score.correct}/${score.total})`;
  document.getElementById("statFlagged").textContent = state.flagged.size;

  const totalMs = Object.values(state.responseTimeMs).reduce((s, v) => s + v, 0);
  const avgSec = (totalMs / Math.max(1, state.exam.questions.length) / 1000).toFixed(1);
  document.getElementById("statAvgTime").textContent = `${avgSec}s`;

  const domainNames = {
    A: "Agent architecture", B: "MCP & permissions", C: "Memory & state",
    D: "Evaluation & telemetry", E: "Multi-agent orchestration", F: "Guardrails & governance",
  };
  document.getElementById("analyticsBreakdown").innerHTML = Object.entries(score.byDomain).map(([d, v]) => {
    const dpct = Math.round(Number(v) * 100);
    const cls = dpct >= 70 ? "good" : dpct >= 50 ? "" : "bad";
    return `<div class="domain-row">
      <div class="domain-row-label">
        <strong>Domain ${d}: ${domainNames[d] ?? d}</strong><span>${dpct}%</span>
      </div>
      <div class="domain-bar-track"><div class="domain-bar-fill ${cls}" style="width:${dpct}%"></div></div>
    </div>`;
  }).join("");

  const ab = state.exam.antiBias ?? {};
  const pos = ab.answerPositionDistribution ?? {};
  const total = Object.values(pos).reduce((s, v) => s + v, 0);
  const posRows = ["A","B","C","D"].map((k) => {
    const n = pos[k] ?? 0;
    const pct = total ? Math.round(n / total * 100) : 0;
    return `<div class="antibias-row"><span class="ab-label">Position ${k}</span><span>${n} (${pct}%)</span></div>`;
  }).join("");
  const lratio = (ab.longestOptionCorrectRatio ?? 0).toFixed(2);
  const lOk = Number(lratio) <= 0.3;
  const posMax = total ? Math.max(...["A","B","C","D"].map((k) => pos[k] ?? 0)) / total : 0;
  const posOk = posMax <= 0.35;
  document.getElementById("antiBiasPanel").innerHTML = `
    ${posRows}
    <div class="antibias-row"><span class="ab-label">Position balance</span><span class="ab-status ${posOk ? "ab-pass" : "ab-fail"}">${posOk ? "✅ Pass" : "⚠ Review"}</span></div>
    <div class="antibias-row"><span class="ab-label">Longest option correct ratio</span><span class="ab-status ${lOk ? "ab-pass" : "ab-fail"}">${lratio} — ${lOk ? "✅ Pass" : "⚠ Review"}</span></div>
  `;
}

// Drill buttons
document.getElementById("weakDrillBtn").addEventListener("click", async () => {
  const data = await fetch(`/api/study/weak-domain-drill/${state.attempt.id}?limit=10`).then((r) => r.json());
  showDrillResult("Weak-domain drill", data.questions ?? []);
});
document.getElementById("mistakeReplayBtn").addEventListener("click", async () => {
  const data = await fetch(`/api/study/mistake-replay/${state.attempt.id}?limit=20`).then((r) => r.json());
  showDrillResult("Mistake replay", data.questions ?? []);
});
document.getElementById("subskillDrillBtn").addEventListener("click", async () => {
  const data = await fetch(`/api/study/domain-subskill-drill/${state.attempt.id}?limit=12`).then((r) => r.json());
  showDrillResult("Sub-skill drill", data.questions ?? []);
});
document.getElementById("exportAttemptBtn").addEventListener("click", async () => {
  const resp = await fetch(`/api/exports/attempt/${state.attempt.id}`);
  if (!resp.ok) return;
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `attempt-${state.attempt.id}.json`; a.click();
  URL.revokeObjectURL(url);
});

function showDrillResult(title, questions) {
  const el = document.getElementById("drillResult");
  el.classList.remove("hidden");
  el.innerHTML = `<strong>${title}</strong> — ${questions.length} questions
    <ul>${questions.slice(0, 15).map((q) => `<li>${escHtml(q.stem?.slice(0, 100) ?? q.id)}…</li>`).join("")}</ul>
    ${questions.length > 15 ? `<p>…and ${questions.length - 15} more.</p>` : ""}`;
}

// ── Helpers ─────────────────────────────────────────────────────────
function isCorrect(q, answer) {
  if (answer === undefined) return false;
  return JSON.stringify(answer) === JSON.stringify(q.correctAnswer);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
