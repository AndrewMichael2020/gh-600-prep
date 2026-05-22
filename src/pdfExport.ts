/**
 * Shared PDF export logic used by both the server API route (dev mode) and
 * the standalone CLI script (scripts/export-exam-pdf.ts).
 *
 * generateExamPdf(exam) → writes data/exams/<id>.pdf and returns the file path.
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { ExamSet } from "./types.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function domainColor(id: string): string {
  const map: Record<string, string> = {
    A: "#dbeafe", B: "#ede9fe", C: "#dcfce7",
    D: "#fef3c7", E: "#ffe4e6", F: "#e0f2fe",
  };
  return map[id] ?? "#f3f4f6";
}

function diffColor(d: string): string {
  if (d === "easy") return "#dcfce7";
  if (d === "hard") return "#ffebe9";
  return "#fff8c5";
}

function isCorrectOption(q: ExamSet["questions"][number], optId: string): boolean {
  const ca = q.correctAnswer;
  if (Array.isArray(ca)) return ca.includes(optId);
  if (typeof ca === "string") return ca === optId;
  return false;
}

function renderCaseStudyBlock(cs: NonNullable<ExamSet["caseStudies"]>[number]): string {
  const sections = cs.sections.map((s) => `
    <div class="cs-section">
      <div class="cs-section-heading">${esc(s.heading)}</div>
      <div class="cs-section-body">${esc(s.body)}</div>
    </div>`).join("");
  return `<div class="cs-panel">
    <div class="cs-header">📋 Case study — ${esc(cs.title)}</div>
    ${cs.intro ? `<p class="cs-intro">${esc(cs.intro)}</p>` : ""}
    ${sections}
  </div>`;
}

function renderOptions(q: ExamSet["questions"][number]): string {
  if (q.type === "sequence_order") {
    const ca = q.correctAnswer as { order?: string[] };
    const order = ca?.order ?? q.options.map((o) => o.id);
    return `<div class="options">
      <div class="match-hint">Correct order:</div>
      ${order.map((id, i) => {
        const opt = q.options.find((o) => o.id === id);
        return `<div class="opt correct">
          <span class="opt-id">${i + 1}.</span>
          <span>${esc(opt?.text ?? id)}</span>
        </div>`;
      }).join("")}
    </div>`;
  }

  if (q.type === "matching_magnet") {
    const ca = q.correctAnswer as { pairs?: Record<string, string> };
    const correctPairs = ca?.pairs ?? {};
    const choices = q.matchChoices ?? [];
    return `<div class="options">
      <div class="match-hint">Correct matches:</div>
      ${q.options.map((opt) => `
        <div class="opt correct">
          <span class="opt-id">${esc(opt.text)}</span>
          <span>→ <strong>${esc(correctPairs[opt.id] ?? "—")}</strong></span>
        </div>`).join("")}
      ${choices.length ? `<div class="choices-note">Choices: ${choices.map(esc).join(", ")}</div>` : ""}
    </div>`;
  }

  if (q.type === "dropdown_completion") {
    const ca = q.correctAnswer as { pairs?: Record<string, string> };
    const correctPairs = ca?.pairs ?? {};
    const template = q.statementTemplate ?? "";
    const parts = template.split(/(\{\{[^}]+\}\})/);
    const rendered = parts.map((part) => {
      const m = part.match(/^\{\{([^}]+)\}\}$/);
      if (!m) return `<span>${esc(part)}</span>`;
      const slotId = m[1];
      const correct = correctPairs[slotId] ?? slotId;
      return `<span class="dc-answer">${esc(correct)}</span>`;
    }).join("");
    return `<div class="options">
      <div class="match-hint">Completed statement:</div>
      <div class="dc-statement">${rendered}</div>
    </div>`;
  }

  return `<div class="options">
    ${q.options.map((opt) => {
      const correct = isCorrectOption(q, opt.id);
      return `<div class="opt ${correct ? "correct" : ""}">
        <span class="opt-id">${esc(opt.id)}</span>
        <span>${esc(opt.text)}</span>
        ${correct ? `<span class="tick">✓</span>` : ""}
      </div>`;
    }).join("")}
  </div>`;
}

function renderExplanation(q: ExamSet["questions"][number]): string {
  if (!q.explanation) return "";
  const { whyCorrect, whyDistractorsWrong, examStrategyNote } = q.explanation;
  const distractors = Object.entries(whyDistractorsWrong ?? {})
    .map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(String(v))}</li>`)
    .join("");
  const tags = (q.objectiveTags ?? []).map((t) => `<span class="tag">${esc(t)}</span>`).join(" ");
  return `<div class="explanation">
    <div class="exp-title">✅ Why the correct answer is right</div>
    <div class="exp-body">${esc(whyCorrect ?? "")}</div>
    ${distractors ? `<div class="exp-title">❌ Why the other options are wrong</div><ul class="distractor-list">${distractors}</ul>` : ""}
    ${examStrategyNote ? `<div class="strategy-note">💡 ${esc(examStrategyNote)}</div>` : ""}
    ${tags ? `<div class="tags">${tags}</div>` : ""}
  </div>`;
}

function renderQuestion(q: ExamSet["questions"][number], index: number, exam: ExamSet): string {
  const cs = exam.caseStudies?.find((c) => c.id === q.caseStudyId);
  const typeLabel = q.type.replace(/_/g, " ");
  return `<div class="question" id="q${index + 1}">
    <div class="q-header">
      <span class="q-num">Q${index + 1}</span>
      <span class="badge domain" style="background:${domainColor(q.domainId)}">
        Domain ${esc(q.domainId)}: ${esc(q.domainName)}
      </span>
      <span class="badge type">${esc(typeLabel)}</span>
      <span class="badge diff" style="background:${diffColor(q.difficulty)}">${esc(q.difficulty)}</span>
    </div>
    ${cs ? renderCaseStudyBlock(cs) : ""}
    <p class="stem">${esc(q.stem)}</p>
    ${q.scenario ? `<div class="scenario">${esc(q.scenario)}</div>` : ""}
    ${q.artifact ? `<div class="artifact">
      <div class="artifact-title">📄 ${esc(q.artifact.title)}</div>
      <pre><code>${esc(q.artifact.content)}</code></pre>
    </div>` : ""}
    ${renderOptions(q)}
    ${renderExplanation(q)}
  </div>`;
}

function buildHtml(exam: ExamSet): string {  const date = new Date(exam.createdAt).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const questionsHtml = exam.questions.map((q, i) => renderQuestion(q, i, exam)).join("\n");

  const answerKey = exam.questions.map((q, i) => {
    const ca = q.correctAnswer;
    let ans: string;
    if (typeof ca === "string") ans = ca;
    else if (Array.isArray(ca)) ans = ca.join(", ");
    else if (ca && typeof ca === "object" && "pairs" in ca)
      ans = Object.entries((ca as { pairs: Record<string, string> }).pairs)
        .map(([k, v]) => `${k}→${v}`).join("; ");
    else if (ca && typeof ca === "object" && "order" in ca)
      ans = ((ca as { order: string[] }).order).join(" → ");
    else ans = JSON.stringify(ca);
    return `<tr><td>Q${i + 1}</td><td>${esc(q.type.replace(/_/g, " "))}</td><td><strong>${esc(ans)}</strong></td></tr>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>GH-600 Practice Exam — ${date}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Segoe UI", Arial, sans-serif; font-size: 11pt; color: #1f2328; line-height: 1.5; }

    /* Cover */
    .cover { page-break-after: always; display: flex; flex-direction: column;
             align-items: center; justify-content: center; height: 100vh; text-align: center; }
    .cover h1 { font-size: 28pt; margin-bottom: 12px; }
    .cover .subtitle { font-size: 14pt; color: #57606a; margin-bottom: 24px; }
    .cover .meta { font-size: 11pt; color: #57606a; }

    /* Questions */
    .question { page-break-inside: avoid; border: 1px solid #d0d7de;
                border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; }
    .q-header { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 10px; }
    .q-num { font-weight: 700; font-size: 12pt; min-width: 36px; }
    .badge { padding: 2px 8px; border-radius: 12px; font-size: 8.5pt;
             font-weight: 600; border: 1px solid rgba(0,0,0,.08); }
    .badge.type { background: #f3f4f6; }

    .stem { font-size: 11.5pt; font-weight: 500; margin-bottom: 8px; }
    .scenario { background: #f6f8fa; border-left: 3px solid #0969da;
                padding: 8px 12px; margin-bottom: 10px; font-size: 10.5pt; }

    /* Artifact */
    .artifact { margin-bottom: 12px; }
    .artifact-title { font-size: 9pt; font-weight: 600; color: #57606a; margin-bottom: 4px; }
    pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px;
          padding: 10px 14px; font-size: 9pt; white-space: pre-wrap;
          word-break: break-all; font-family: "Consolas", "Monaco", monospace; }

    /* Options */
    .options { margin-bottom: 12px; }
    .opt { display: flex; align-items: baseline; gap: 8px; padding: 5px 8px;
           border-radius: 4px; margin-bottom: 4px; font-size: 10.5pt; }
    .opt.correct { background: #dafbe1; border: 1px solid #1a7f37; }
    .opt-id { font-weight: 700; min-width: 20px; }
    .tick { color: #1a7f37; font-weight: 700; margin-left: auto; }
    .match-hint { font-size: 9.5pt; color: #57606a; margin-bottom: 6px; }
    .choices-note { font-size: 9pt; color: #57606a; margin-top: 6px; }
    .dc-statement { font-size: 10.5pt; line-height: 2; }
    .dc-answer { background: #dafbe1; border: 1px solid #1a7f37; border-radius: 3px;
                 padding: 1px 6px; font-weight: 600; color: #1a7f37; }

    /* Explanation */
    .explanation { background: #f6f8fa; border-radius: 6px; padding: 12px 16px; margin-top: 10px; }
    .exp-title { font-weight: 600; font-size: 10pt; margin-bottom: 4px; margin-top: 8px; }
    .exp-title:first-child { margin-top: 0; }
    .exp-body { font-size: 10pt; color: #444; margin-bottom: 6px; }
    .distractor-list { font-size: 10pt; color: #444; padding-left: 20px; margin-bottom: 6px; }
    .distractor-list li { margin-bottom: 2px; }
    .strategy-note { font-size: 9.5pt; color: #9a6700; background: #fff8c5;
                     border-radius: 4px; padding: 6px 10px; margin-top: 6px; }
    .tags { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; }
    .tag { background: #e0f2fe; color: #0c4a6e; border-radius: 10px;
           padding: 2px 8px; font-size: 8pt; }

    /* Case study */
    .cs-panel { background: #fffbeb; border: 1px solid #f59e0b;
                border-radius: 6px; padding: 12px 16px; margin-bottom: 12px; }
    .cs-header { font-weight: 700; font-size: 10pt; margin-bottom: 6px; color: #92400e; }
    .cs-intro { font-size: 10pt; margin-bottom: 8px; }
    .cs-section { margin-bottom: 8px; }
    .cs-section-heading { font-weight: 600; font-size: 10pt; margin-bottom: 2px; }
    .cs-section-body { font-size: 10pt; color: #444; }

    /* Answer key */
    .answer-key { page-break-before: always; }
    .answer-key h2 { font-size: 16pt; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th, td { border: 1px solid #d0d7de; padding: 5px 10px; text-align: left; }
    th { background: #f6f8fa; font-weight: 600; }
    tr:nth-child(even) td { background: #fafbfc; }

    /* Section title */
    .section-title { font-size: 18pt; font-weight: 700; margin: 32px 0 20px; page-break-before: always; }
    .section-title:first-of-type { page-break-before: avoid; }

    @page { margin: 20mm 18mm; }
  </style>
</head>
<body>

  <!-- Cover -->
  <div class="cover">
    <div style="font-size:48pt;margin-bottom:16px;">⚡</div>
    <h1>GH-600 Practice Exam</h1>
    <div class="subtitle">Developing in Agentic AI Systems — Practice Mode</div>
    <div class="meta">
      ${exam.questions.length} questions &nbsp;·&nbsp; ${date}<br/>
      <small>Correct answers highlighted · Full explanations included</small>
    </div>
  </div>

  <!-- Questions -->
  <h2 class="section-title">Questions &amp; Answers</h2>
  ${questionsHtml}

  <!-- Answer Key -->
  <div class="answer-key">
    <h2>Quick Answer Key</h2>
    <table>
      <thead><tr><th>#</th><th>Type</th><th>Correct Answer</th></tr></thead>
      <tbody>${answerKey}</tbody>
    </table>
  </div>

</body>
</html>`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateExamPdf(exam: ExamSet): Promise<string> {
  const examsDir = path.join(process.cwd(), "data/exams");
  const tmpHtml = path.join(examsDir, `${exam.id}.html`);
  const outPath = path.join(examsDir, `${exam.id}.pdf`);

  console.log(`[PDF] Building PDF for exam ${exam.id} (${exam.questions.length} questions)…`);

  const html = buildHtml(exam);
  fs.writeFileSync(tmpHtml, html, "utf8");

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`file://${tmpHtml}`, { waitUntil: "load" });
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "18mm", right: "18mm" },
    });
    console.log(`[PDF] Saved → ${outPath}`);
  } finally {
    await browser.close();
    fs.unlinkSync(tmpHtml);
  }

  return outPath;
}
