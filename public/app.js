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
    fetch("/api/config").then((r) => r.json()).catch(() => ({ isDev: false, hasApiKey: false, examCount: 0 })),
    fetch("/api/exams").then((r) => r.json()).catch(() => []),
  ]);

  if (exams.length > 0) {
    renderExamList(exams, cfg.isDev);
    document.getElementById("examListSection").classList.remove("hidden");
  }

  if (cfg.isDev && cfg.hasApiKey) {
    document.getElementById("generateSection").classList.remove("hidden");
    renderDistPreview(state.questionCount);
  } else if (exams.length === 0) {
    document.getElementById("noExamsMsg").classList.remove("hidden");
  }
}

async function renderExamList(exams, isDev = false) {
  const ul = document.getElementById("examList");

  // Fetch PDF status for all exams in parallel (dev only)
  let pdfStatusMap = {};
  if (isDev) {
    const statuses = await Promise.all(
      exams.map((e) =>
        fetch(`/api/exams/${e.id}/pdf-status`)
          .then((r) => r.json())
          .catch(() => ({ exists: false, url: null }))
      )
    );
    exams.forEach((e, i) => { pdfStatusMap[e.id] = statuses[i]; });
  }

  ul.innerHTML = exams
    .slice()
    .reverse() // newest first
    .map((e) => {
      const date = new Date(e.createdAt).toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric",
      });
      const pdfStatus = pdfStatusMap[e.id] ?? { exists: false, url: null };
      const publishBtn = isDev ? `
        <button class="btn btn-outline btn-sm btn-publish${e.isPublished ? " is-published" : ""}"
          data-exam-id="${escHtml(e.id)}" data-published="${e.isPublished ? "true" : "false"}"
          title="${e.isPublished ? "Remove from production (currently visible to users)" : "Publish to production (make visible to users)"}">
          ${e.isPublished ? "✅ Published" : "🔒 Unpublished"}
        </button>
      ` : "";
      const pdfButtons = isDev ? `
        <div class="exam-pdf-actions">
          <button class="btn btn-outline btn-sm btn-pdf-generate" data-exam-id="${escHtml(e.id)}" title="Generate Practice PDF (takes ~30s)">
            📄 Generate PDF
          </button>
          ${pdfStatus.exists ? `
          <a class="btn btn-outline btn-sm btn-pdf-download" href="${escHtml(pdfStatus.url)}" download title="Download PDF">
            ⬇ Download PDF
          </a>` : `
          <span class="btn btn-outline btn-sm btn-pdf-download hidden" data-exam-id="${escHtml(e.id)}"></span>`}
        </div>
      ` : "";
      return `<li class="exam-list-item${isDev ? " exam-list-item--dev" : ""}">
        <div class="exam-list-meta">
          <span class="exam-list-date">${escHtml(date)}</span>
          <span class="exam-list-count">${e.questionCount} questions</span>
        </div>
        <div class="exam-list-right">
          <div class="exam-list-actions">
            <button class="btn btn-primary btn-sm" data-exam-id="${escHtml(e.id)}" data-exam-mode="exam">🎯 Exam</button>
            <button class="btn btn-secondary btn-sm" data-exam-id="${escHtml(e.id)}" data-exam-mode="review">📖 Practice</button>
            ${publishBtn}
          </div>
          ${pdfButtons}
        </div>
      </li>`;
    })
    .join("");

  ul.querySelectorAll("[data-exam-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.mode = btn.dataset.examMode ?? "exam";
      loadExam(btn.dataset.examId);
    });
  });

  if (isDev) {
    ul.querySelectorAll(".btn-pdf-generate").forEach((btn) => {
      btn.addEventListener("click", () => triggerPdfGeneration(btn.dataset.examId, btn));
    });
    ul.querySelectorAll(".btn-publish").forEach((btn) => {
      btn.addEventListener("click", () => togglePublish(btn.dataset.examId, btn));
    });
  }
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

// ── PDF generation trigger ───────────────────────────────────────────
async function triggerPdfGeneration(examId, triggerBtn) {
  const li = triggerBtn.closest("li");
  triggerBtn.disabled = true;
  triggerBtn.textContent = "⏳ Building PDF…";

  try {
    const res = await fetch(`/api/exams/${examId}/pdf`, { method: "POST" });
    // Read as text first so a non-JSON response doesn't swallow the real error
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(text || `HTTP ${res.status}`); }
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

    triggerBtn.textContent = "📄 Regenerate PDF";
    triggerBtn.disabled = false;

    // Show / update the download link
    const dlBtn = li.querySelector(".btn-pdf-download");
    if (dlBtn && dlBtn.tagName === "SPAN") {
      // Replace placeholder span with a real anchor
      const a = document.createElement("a");
      a.className = "btn btn-outline btn-sm btn-pdf-download";
      a.href = data.url;
      a.download = "";
      a.title = "Download PDF";
      a.textContent = "⬇ Download PDF";
      dlBtn.replaceWith(a);
    } else if (dlBtn && dlBtn.tagName === "A") {
      dlBtn.href = data.url;
    }
  } catch (err) {
    triggerBtn.textContent = "📄 Generate PDF";
    triggerBtn.disabled = false;
    alert(`PDF generation failed:\n${err.message}`);
  }
}

// ── Publish toggle ───────────────────────────────────────────────────
async function togglePublish(examId, btn) {
  const isCurrentlyPublished = btn.dataset.published === "true";
  const willPublish = !isCurrentlyPublished;
  btn.disabled = true;

  try {
    const res = await fetch(`/api/exams/${examId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: willPublish }),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(text || `HTTP ${res.status}`); }
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

    btn.dataset.published = willPublish ? "true" : "false";
    btn.textContent = willPublish ? "✅ Published" : "🔒 Unpublished";
    btn.title = willPublish
      ? "Remove from production (currently visible to users)"
      : "Publish to production (make visible to users)";
    btn.classList.toggle("is-published", willPublish);
  } catch (err) {
    alert(`Failed to update publish status:\n${err.message}`);
  } finally {
    btn.disabled = false;
  }
}


const DOMAIN_BASES = [
  { id: "A", name: "Agent architecture & SDLC", count: 17 },
  { id: "B", name: "MCP & permissions",          count: 21 },
  { id: "C", name: "Memory & state",              count: 14 },
  { id: "D", name: "Evaluation & telemetry",      count: 17 },
  { id: "E", name: "Multi-agent orchestration",   count: 18 },
  { id: "F", name: "Guardrails & governance",     count: 13 },
];

function calcDomainDist(total) {
  if (total < 1) return [];
  const scaled = DOMAIN_BASES.map((d) => ({ ...d, count: Math.floor((d.count / 100) * total) }));
  let rem = total - scaled.reduce((s, d) => s + d.count, 0);
  const order = [...scaled].sort((a, b) => b.count - a.count);
  let i = 0;
  while (rem-- > 0) {
    scaled.find((d) => d.id === order[i % order.length].id).count += 1;
    i++;
  }
  return scaled;
}

function renderDistPreview(total) {
  const el = document.getElementById("domainDistPreview");
  if (!el) return;
  const n = Number(total);
  if (!n || n < 1) { el.innerHTML = ""; return; }
  const domains = calcDomainDist(n);
  const maxCount = Math.max(...domains.map((d) => d.count), 1);

  const caseQs  = n >= 100 ? 16 : n >= 70 ? 12 : n >= 30 ? 8 : n >= 10 ? 4 : 0;
  const matchQs = n >= 100 ? 18 : Math.max(0, Math.floor(n * 0.18));

  el.innerHTML = `
    <p class="form-label" style="margin-bottom:.2rem">Distribution</p>
    ${domains.map((d) => `
      <div class="dist-row">
        <span class="dist-label">${escHtml(d.id)}</span>
        <span class="dist-name">${escHtml(d.name)}</span>
        <span class="dist-count">${d.count}q</span>
        <div class="dist-bar-wrap" style="grid-column:1/-1">
          <div class="dist-bar-fill" style="width:${Math.round((d.count / maxCount) * 100)}%"></div>
        </div>
      </div>`).join("")}
    <p class="dist-special">+ ~${caseQs} case-study questions · ~${matchQs} matching/sequence</p>`;
}

// ── Setup form (generation) ─────────────────────────────────────────
document.getElementById("questionCount").addEventListener("input", (e) => {
  const v = Number(e.target.value);
  if (v > 0) { state.questionCount = v; renderDistPreview(v); }
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
      document.getElementById("loadingStatus").textContent = "Exam generated — choose it below to begin.";
      setTimeout(async () => {
        // Refresh exam list and return to setup view so user picks mode there.
        const exams = await fetch("/api/exams").then((r) => r.json()).catch(() => []);
        renderExamList(exams);
        document.getElementById("examListSection").classList.remove("hidden");
        showView("view-setup");
      }, 600);
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
  const showExplanation = state.mode === "review" && state.answers[q.id] !== undefined;

  let artifactHtml = "";
  if (q.artifact) {
    artifactHtml = `<div class="q-artifact">
      <div class="q-artifact-title">📄 ${q.artifact.title}</div>
      <pre><code>${escHtml(q.artifact.content)}</code></pre>
    </div>`;
  }

  card.innerHTML = `
    ${renderCaseStudyPanel(q)}
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
  if (q.type === "sequence_order" || q.type === "matching_magnet" || q.type === "dropdown_completion") return;
  const container = document.getElementById("optionsContainer");
  const selected = state.answers[q.id];
  const showResult = state.mode === "review" && state.answers[q.id] !== undefined;
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
      wireOptionListeners(q); // re-wire new DOM nodes created by renderOptions
      // In Practice mode, inject explanation block once answered
      if (state.mode === "review" && state.answers[q.id] !== undefined) {
        const card = document.getElementById("questionCard");
        if (!card.querySelector(".explanation-block")) {
          const expHtml = renderExplanation(q);
          if (expHtml) {
            const confRow = card.querySelector(".confidence-row");
            if (confRow) confRow.insertAdjacentHTML("afterend", expHtml);
            else card.insertAdjacentHTML("beforeend", expHtml);
          }
        }
      }
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
    const choices = q.matchChoices ?? [];
    const showResult = state.mode === "review" && state.answers[q.id] !== undefined;
    const correctPairs = (typeof q.correctAnswer === "object" && q.correctAnswer !== null && "pairs" in q.correctAnswer)
      ? q.correctAnswer.pairs : {};
    if (choices.length === 0) {
      return `<div class="structured-block">
        <p class="match-hint">Match each item to its value:</p>
        ${q.options.map((opt) => `
          <div class="match-row">
            <label class="match-label">${opt.id}. ${escHtml(opt.text)}</label>
            <input data-match-key="${opt.id}" value="${escHtml(pairs[opt.id] ?? "")}" placeholder="Enter match…" />
          </div>
        `).join("")}
      </div>`;
    }
    return `<div class="structured-block">
      <p class="match-hint">Select the correct match for each item:</p>
      ${q.options.map((opt) => {
        const selected = pairs[opt.id] ?? "";
        const correct = correctPairs[opt.id] ?? "";
        const isCorr = showResult && selected === correct;
        const isWrong = showResult && selected !== correct;
        return `<div class="match-row ${showResult ? (isCorr ? "match-correct" : (selected ? "match-wrong" : "")) : ""}">
          <label class="match-label">${escHtml(opt.text)}</label>
          <select class="match-select" data-match-key="${opt.id}"${showResult ? " disabled" : ""}>
            <option value="">-- Select --</option>
            ${choices.map((c) => `<option value="${escHtml(c)}"${selected === c ? " selected" : ""}>${escHtml(c)}</option>`).join("")}
          </select>
          ${showResult ? `<span class="match-feedback">${isCorr ? "✅" : `❌ → ${escHtml(correct)}`}</span>` : ""}
        </div>`;
      }).join("")}
    </div>`;
  }
  if (q.type === "dropdown_completion") {
    const pairs = state.answers[q.id]?.pairs ?? {};
    const showResult = state.mode === "review" && state.answers[q.id] !== undefined;
    const slots = q.slots ?? [];
    const correctPairs = (typeof q.correctAnswer === "object" && q.correctAnswer !== null && "pairs" in q.correctAnswer)
      ? q.correctAnswer.pairs : {};
    const template = q.statementTemplate ?? "";

    // Split template on {{slotN}} placeholders and interleave selects
    const parts = template.split(/(\{\{[^}]+\}\})/);
    const rendered = parts.map((part) => {
      const match = part.match(/^\{\{([^}]+)\}\}$/);
      if (!match) return `<span class="dc-text">${escHtml(part)}</span>`;
      const slotId = match[1];
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) return `<span class="dc-blank">[${slotId}]</span>`;
      const selected = pairs[slotId] ?? "";
      const correct = correctPairs[slotId] ?? "";
      const isCorr = showResult && selected === correct;
      const isWrong = showResult && selected && selected !== correct;
      let cls = "dc-select";
      if (showResult) cls += isCorr ? " dc-correct" : (isWrong ? " dc-wrong" : "");
      return `<select class="${cls}" data-match-key="${slotId}"${showResult ? " disabled" : ""}>
        <option value="">▼</option>
        ${slot.choices.map((c) => `<option value="${escHtml(c)}"${selected === c ? " selected" : ""}>${escHtml(c)}</option>`).join("")}
      </select>${showResult ? `<span class="dc-feedback">${isCorr ? "✅" : (isWrong ? `❌ → ${escHtml(correct)}` : "")}</span>` : ""}`;
    }).join("");

    return `<div class="structured-block dc-block">
      <p class="match-hint">Select the appropriate options to complete the statement. Each correct selection is worth one point.</p>
      <div class="dc-statement">${rendered}</div>
    </div>`;
  }
  return "";
}

function renderCaseStudyPanelMarkup(cs) {
  if (!cs) return "";
  const sections = (cs.sections ?? []).map((s) => `
    <details class="cs-section" open>
      <summary class="cs-section-heading">${escHtml(s.heading)} -</summary>
      <div class="cs-section-body">${escHtml(s.body)}</div>
    </details>
  `).join("");
  return `<div class="case-study-panel">
    <div class="cs-header">
      <span class="cs-badge">📋 Case study</span>
      <span class="cs-title">${escHtml(cs.title)}</span>
    </div>
    ${cs.intro ? `<p class="cs-intro">${escHtml(cs.intro)}</p>` : ""}
    ${sections}
  </div>`;
}

function renderCaseStudyPanel(q) {
  if (!q.caseStudyId || !state.exam?.caseStudies?.length) return "";
  const cs = state.exam.caseStudies.find((c) => c.id === q.caseStudyId);
  if (!cs) return "";
  return renderCaseStudyPanelMarkup(cs);
}

function renderExplanation(q, open = false) {
  if (!q.explanation) return "";
  const o = open ? " open" : "";
  const whyWrong = Object.entries(q.explanation.whyDistractorsWrong ?? {})
    .map(([k, v]) => `<li><strong>${k}:</strong> ${escHtml(String(v))}</li>`)
    .join("");
  return `<div class="explanation-block">
    <details${o}>
      <summary>✅ Why the correct answer is right</summary>
      <div class="exp-body">${escHtml(q.explanation.whyCorrect)}</div>
    </details>
    ${whyWrong ? `<details${o}>
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
    const dpct = Math.round(Number(domScore));
    const cls = dpct >= 70 ? "good" : dpct >= 50 ? "" : "bad";
    return `<div class="domain-row">
      <div class="domain-row-label">
        <strong>Domain ${domain}: ${domainNames[domain] ?? domain}</strong>
        <span>${dpct}%</span>
      </div>
      <div class="domain-bar-track">
        <div class="domain-bar-fill ${cls}" style="width:${Math.min(dpct, 100)}%"></div>
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
    const cs = state.exam?.caseStudies?.find((c) => c.id === q.caseStudyId);

    const optionsHtml = q.type === "matching_magnet"
      ? (() => {
          const pairs = user?.pairs ?? {};
          const choices = q.matchChoices ?? [];
          const correctPairs = (typeof q.correctAnswer === "object" && q.correctAnswer !== null && "pairs" in q.correctAnswer)
            ? q.correctAnswer.pairs : {};
          if (choices.length === 0) {
            return `<div class="structured-block">
              <p class="match-hint">Match each item to its value:</p>
              ${q.options.map((opt) => `
                <div class="match-row ${pairs[opt.id] === correctPairs[opt.id] ? "match-correct" : (pairs[opt.id] ? "match-wrong" : "")}">
                  <label class="match-label">${opt.id}. ${escHtml(opt.text)}</label>
                  <input value="${escHtml(pairs[opt.id] ?? "")}" disabled />
                  <span class="match-feedback">${pairs[opt.id] === correctPairs[opt.id] ? "✅" : `❌ → ${escHtml(correctPairs[opt.id] ?? "")}`}</span>
                </div>
              `).join("")}
            </div>`;
          }
          return `<div class="structured-block">
            <p class="match-hint">Select the correct match for each item:</p>
            ${q.options.map((opt) => {
              const selected = pairs[opt.id] ?? "";
              const expected = correctPairs[opt.id] ?? "";
              const isCorr = selected === expected;
              return `<div class="match-row ${isCorr ? "match-correct" : (selected ? "match-wrong" : "")}">
                <label class="match-label">${escHtml(opt.text)}</label>
                <select class="match-select" disabled>
                  <option value="">-- Select --</option>
                  ${choices.map((c) => `<option value="${escHtml(c)}"${selected === c ? " selected" : ""}>${escHtml(c)}</option>`).join("")}
                </select>
                <span class="match-feedback">${isCorr ? "✅" : `❌ → ${escHtml(expected)}`}</span>
              </div>`;
            }).join("")}
          </div>`;
        })()
      : q.type === "dropdown_completion"
      ? (() => {
          const pairs = user?.pairs ?? {};
          const correctPairs = (typeof q.correctAnswer === "object" && q.correctAnswer !== null && "pairs" in q.correctAnswer)
            ? q.correctAnswer.pairs : {};
          const slots = q.slots ?? [];
          const template = q.statementTemplate ?? "";
          const parts = template.split(/(\{\{[^}]+\}\})/);
          const rendered = parts.map((part) => {
            const m = part.match(/^\{\{([^}]+)\}\}$/);
            if (!m) return `<span class="dc-text">${escHtml(part)}</span>`;
            const slotId = m[1];
            const slot = slots.find((s) => s.id === slotId);
            const selected = pairs[slotId] ?? "";
            const correct = correctPairs[slotId] ?? "";
            const isCorr = selected === correct;
            return `<select class="dc-select${isCorr ? " dc-correct" : " dc-wrong"}" disabled>
              <option value="${escHtml(selected)}">${escHtml(selected || "—")}</option>
            </select><span class="dc-feedback">${isCorr ? "✅" : `❌ → ${escHtml(correct)}`}</span>`;
          }).join("");
          return `<div class="structured-block dc-block">
            <p class="match-hint">Statement completion — review:</p>
            <div class="dc-statement">${rendered}</div>
          </div>`;
        })()
      : `<div class="options">
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
        </div>`;

    return `<div class="review-item ${correct ? "correct" : "wrong"}" data-correct="${correct}" data-wrong="${!correct}">
      <div class="review-item-header" onclick="this.parentElement.querySelector('.review-body').toggleAttribute('hidden')">
        <span class="review-num">Q${i + 1}</span>
        <span class="review-stem">${escHtml(q.stem.slice(0, 120))}${q.stem.length > 120 ? "…" : ""}</span>
        <span class="review-verdict">${correct ? "✅" : "❌"}</span>
      </div>
      <div class="review-body" hidden>
        ${renderCaseStudyPanelMarkup(cs)}
        <p class="q-stem">${escHtml(q.stem)}</p>
        ${q.scenario ? `<div class="q-scenario">${escHtml(q.scenario)}</div>` : ""}
        ${optionsHtml}
        <div class="review-answers">
          ${sameAnswer
            ? `<span class="ans-same">✅ Your answer: ${userLabel}</span>`
            : `<span class="ans-user">Your answer: ${userLabel}</span>
               <span class="ans-correct">Correct: ${correctLabel}</span>`}
        </div>
        ${renderExplanation(q, true)}
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
    const dpct = Math.round(Number(v));
    const cls = dpct >= 70 ? "good" : dpct >= 50 ? "" : "bad";
    return `<div class="domain-row">
      <div class="domain-row-label">
        <strong>Domain ${d}: ${domainNames[d] ?? d}</strong><span>${dpct}%</span>
      </div>
      <div class="domain-bar-track"><div class="domain-bar-fill ${cls}" style="width:${Math.min(dpct, 100)}%"></div></div>
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
