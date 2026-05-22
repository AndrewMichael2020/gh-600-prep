# GitHub Certified: Agentic AI Developer (GH-600) — Work Status

> **For the next developer.** This file tracks what is done, what is not, and the key decisions made along the way. Read `APP_PLAN.md` for the original spec; read `README.md` for how to run the app.

Last updated: 2026-05-22 (UTC)

---

## Current status

**All planned phases complete.** The app generates, stores, and serves GH-600-style practice exams in a polished single-page UI. Dev-mode features (live generation, publish toggle, PDF export) are fully wired. The only remaining work is a production Cloud Run deployment.

| Layer | State |
|-------|-------|
| Core generation pipeline | ✅ Complete |
| Exam + Practice UI | ✅ Complete |
| Scoring, review, analytics | ✅ Complete |
| Anti-bias enforcement | ✅ Complete |
| PDF export (UI + CLI) | ✅ Complete |
| Publish/unpublish toggle | ✅ Complete |
| Domain distribution (close to official weights) | ✅ Complete |
| Case-study theme anti-repetition | ✅ Complete |
| Dockerfile + `.dockerignore` | ✅ Complete |
| Cloud Run deployment | 🔲 Not yet done |

---

## How the app evolved from APP_PLAN.md

`APP_PLAN.md` describes the original spec (Issue #2). Here is how each plan item translated into the actual implementation — and where we diverged.

### Phase 1 — Vertical slice ✅

Everything in the plan was implemented:
- Configurable question count, domain/item-type blueprint, batched generation
- Exam mode with timer (`question_count × 1.2` minutes) + review mode with collapsible explanations
- Score with per-domain breakdown
- Local JSON persistence (`data/exams/`, `data/attempts/`)

**Divergence from plan:** The plan described a fully headless developer workflow (`npm run generate` only). We later added a live SSE generation endpoint (`GET /api/exams/generate`) so generation can be triggered directly from the browser in dev mode. The `npm run generate` script still exists as a CLI alternative.

### Phase 2 — Analytics + adaptive review ✅

Implemented as planned:
- Confidence capture per question
- Weak-domain drill and mistake-replay study loops
- Anti-bias dashboard (answer-position balance, longest-option ratio)
- Matching/sequence question UX

### Phase 3 — Full mock ops ✅

- Stable 100-question generation confirmed working end-to-end
- All question types render correctly (single, multi-select, sequence, matching, case-study, artifact)
- Export/report workflows operational

### Phase 3.5 — Architecture hardening ✅

This phase was mostly about security invariants and dev/prod split:
- `generateBatch()` throws immediately without `OPENAI_API_KEY` — no silent fallback
- `GET /api/config` tells the UI whether to show the generate panel (`isDev`, `hasApiKey`)
- `GET /api/exams` in production returns only published exams; in dev returns all with `isPublished` flag
- Test fixtures moved to `tests/fixtures/questions.ts` — never imported by production code
- Express route ordering fixed: `/api/exams/generate` registered before `/api/exams/:id`

### Phase 3.6 — Web-grounded generation ✅

- 6 domain knowledge files created under `prompts/knowledge/domain-{A-F}.md` — injected into every generation batch via `{{DOMAIN_KNOWLEDGE}}`
- `gh-600-study-guide.md` contains the full official skills outline with exact domain names
- `npm run fetch-knowledge` re-fetches all official sources (GitHub Docs + Microsoft Learn) on demand
- `web_search_preview` tool enabled in Responses API calls so the model can look up documentation autonomously
- All hardcoded fallback questions removed from `src/generation.ts`

### Post-plan improvements (this session)

These were not in APP_PLAN.md but emerged from real usage:

**Exam vs Practice mode distinction**
- The plan mentioned both modes but did not differentiate the UI clearly. We aligned them: Exam = timed, answers hidden; Practice = untimed, correct answer shown immediately after each question. Each exam row lets you pick the mode before starting.

**Multi-select answer selection fix**
- Checked answers could not be unchecked; the checkbox selection was also capped incorrectly for 3-correct questions. Fixed: toggle works; max selections enforced per-question based on actual correct-answer count.

**Domain distribution rebalancing**
- The original generated exams were heavily Domain-A skewed (~45%). We adjusted weights in `src/blueprint.ts` to be closer to official exam distribution while keeping questions more evenly spread than the real exam:
  - A: ~20%, B: ~22%, C: ~12%, D: ~18%, E: ~18%, F: ~10%

**Case-study theme anti-repetition**
- In 100-question exams, the case-study section repeated the same 5–6 themes (inputs/outputs, human approval, PR review, branch protection…). Fix: `generateWithOpenAI` and `generateBatch` now accept a `usedCaseStudyThemes: string[]` parameter. After each case-study batch the server collects the narrative title and passes it to all subsequent batches, preventing the generator from reusing it.

**Prompt quality improvements**
- `prompts/generate-batch.prompt.md`: added a domain-boundary rules table so the model assigns questions to the correct domain (several questions were mislabeled Domain A when they were really B, D, or F)
- `prompts/knowledge/domain-A.md`: scope boundary section; note on `disable-model-invocation` vs deprecated `infer: false`
- `prompts/knowledge/domain-B.md`: firewall/network ownership rules; MCP auth patterns (PAT scoping, OAuth flows, secret naming)

**PDF export**
- `src/pdfExport.ts`: shared Playwright/Chromium HTML→PDF renderer
- Server routes: `GET /api/exams/:id/pdf-status`, `POST /api/exams/:id/pdf` (dev only)
- Static serving: `data/exams/` served at `/exams/*`
- Filenames are human-readable: `gh-600-YYYY-MM-DD-<count>q-<id8>.pdf`
- CLI: `npm run export-pdf -- <exam-id>`

**Publish/unpublish toggle**
- `data/published.json` lists exam IDs visible in production
- Dev UI has a per-exam ✅/🔒 button that calls `POST /api/exams/:id/publish { published: bool }`
- In production, `/api/exams` filters to published IDs only

---

## Architecture: dev vs. production

```
Dev mode (npm run dev, NODE_ENV != "production")
  - All exams listed with isPublished flag
  - Generate panel visible (if OPENAI_API_KEY set)
  - PDF generate/download buttons visible per exam
  - Publish/unpublish toggle visible per exam

Production (npm start, NODE_ENV=production)
  - Only exams in data/published.json are returned
  - No generate panel, no PDF buttons, no publish toggle
```

**Key invariants (must never break):**
- `OPENAI_API_KEY` never reaches the browser under any circumstance
- `generateBatch()` throws immediately without `OPENAI_API_KEY`
- Test fixtures (`tests/fixtures/questions.ts`) are imported only by test files

---

## File map (what to touch for each concern)

| Concern | Files |
|---------|-------|
| Question generation logic | `src/generation.ts`, `prompts/generate-batch.prompt.md` |
| Domain knowledge | `prompts/knowledge/domain-{A-F}.md`, `prompts/knowledge/gh-600-study-guide.md` |
| Domain/item-type distribution | `src/blueprint.ts` |
| API routes | `src/server.ts` |
| PDF export | `src/pdfExport.ts`, `scripts/export-exam-pdf.ts` |
| Frontend (all views) | `public/app.js`, `public/styles.css` |
| Published exam control | `data/published.json` (edit directly or use UI toggle) |
| Persistence | `src/persistence.ts`, `data/exams/exams.json`, `data/attempts/` |
| Scoring / study loops | `src/scoring.ts`, `src/studyLoops.ts` |
| Anti-bias checks | `src/antiBias.ts` |
| Types | `src/types.ts` |
| Config (model, effort, dev/prod) | `src/config.ts`, `.env` |

---

## Test and build

```bash
npm test        # Vitest — 13 tests, 6 files, no API key needed
npm run build   # tsc — must be clean before any commit
```

All 13 unit tests are fixture-based (no OpenAI calls). The Playwright e2e spec (`tests/e2e/exam.spec.ts`) must be run with `npx playwright test` separately — it requires the dev server running and is not included in `npm test`.

---

## Phase 4 — Cloud Run deployment checklist

- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] At least one exam is published in `data/published.json`
- [ ] `docker build -t gh-600-prep .` succeeds locally
- [ ] Image pushed to Artifact Registry (`gcr.io/<project>/gh-600-prep`)
- [ ] Cloud Run service created with `OPENAI_API_KEY` from Secret Manager
- [ ] `/healthz` returns `{ ok: true }` at deployed URL
- [ ] Home page lists published exam(s) at deployed URL

See `.github/CLOUD_RUN_DEPLOYMENT_RUNBOOK.md` for the full deployment steps.

---

## Known issues / future work

| Item | Notes |
|------|-------|
| Playwright e2e tests not in `npm test` | `tests/e2e/exam.spec.ts` uses `@playwright/test` which conflicts with Vitest runner. Run with `npx playwright test` separately. |
| Sequence/matching drag-and-drop | Current UI uses click-to-select; true drag-and-drop was deferred to a future phase. |
| Analytics view | Score + domain breakdown is shown in review; the deeper per-item-type / distractor-attraction analytics panel is wired in `src/studyLoops.ts` and the endpoints exist but the UI tab was simplified. |
| `infer: false` in some questions | Some generated questions reference the deprecated `infer: false` field. Domain-A knowledge file now notes this, but existing generated exams may still contain it. Regenerate or edit affected questions if needed. |
| PDF generation requires Chromium | `npx playwright install chromium` must be run in any new environment. The Dockerfile handles this. |

