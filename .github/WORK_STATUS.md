# GitHub Certified: Agentic AI Developer (GH-600) — Work Status

> **For the next developer.** This file tracks what is done, what is not, and the key decisions made along the way. Read `APP_PLAN.md` for the original spec; read `README.md` for how to run the app; read `CLOUD_RUN_DEPLOYMENT_RUNBOOK.md` for deployment operations.

Last updated: 2026-05-22 (UTC)

---

## Current status

**App complete. CI/CD pipeline wired. GCP infrastructure scripted — one `gcp-setup.sh` run away from first deploy.**

| Layer | State |
|-------|-------|
| Core generation pipeline | ✅ Complete |
| Exam + Practice UI | ✅ Complete |
| Scoring, review, analytics | ✅ Complete |
| Anti-bias enforcement | ✅ Complete |
| PDF export (UI + CLI + GCS upload) | ✅ Complete |
| Publish/unpublish toggle | ✅ Complete |
| Domain distribution (close to official weights) | ✅ Complete |
| Case-study theme anti-repetition | ✅ Complete |
| Dockerfile + `.dockerignore` | ✅ Complete |
| GCS bucket for PDF storage | ✅ Complete (`src/storage.ts`) |
| CI/CD — GitHub Actions workflow | ✅ Complete (`.github/workflows/ci.yml`) |
| One-shot GCP infra setup script | ✅ Complete (`scripts/gcp-setup.sh`) |
| Security audit (secrets, deps, Docker) | ✅ Complete |
| First Cloud Run deploy | 🔲 Run `bash scripts/gcp-setup.sh` then push to `main` |

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
- `src/pdfExport.ts`: shared Playwright/Chromium HTML→PDF renderer; `playwright` is dynamically imported (devDep only — never loaded in prod Docker)
- `src/storage.ts`: GCS helper — uploads PDFs to `gh-600-prep-pdfs` bucket after generation; falls back to local `data/exams/` if `GCS_BUCKET` not set
- Server routes: `GET /api/exams/:id/pdf-status`, `POST /api/exams/:id/pdf` (dev only); `pdf-status` returns GCS URL when available
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
    → after generation, PDF uploaded to GCS (if GCS_BUCKET set)
    → download URL = GCS public URL or /exams/<file> fallback
  - Publish/unpublish toggle visible per exam

Production (Cloud Run, NODE_ENV=production)
  - Only exams in data/published.json are returned
  - No generate panel, no PDF buttons, no publish toggle
  - Exam data (exams.json, published.json, PDFs) baked into Docker image at deploy time
  - OPENAI_API_KEY injected from Secret Manager — never reaches browser
```

**Key invariants (must never break):**
- `OPENAI_API_KEY` never reaches the browser under any circumstance
- `generateBatch()` throws immediately without `OPENAI_API_KEY`
- `playwright` is a devDependency — dynamically imported inside `generateExamPdf()` only; never loaded in prod
- Test fixtures (`tests/fixtures/questions.ts`) are imported only by test files

---

## Production deployment workflow

See `CLOUD_RUN_DEPLOYMENT_RUNBOOK.md` for full details. Summary:

1. **First time only:** `bash scripts/gcp-setup.sh` (provisions all GCP infra, sets GitHub secrets)
2. **Every deploy:** `git push origin main` — CI does the rest
3. **Publish an exam:** toggle in dev UI → commit `data/published.json` + `data/exams/exams.json` → push

CI pipeline (`.github/workflows/ci.yml`):

| Job | Runs on | Does |
|-----|---------|------|
| Test | every push/PR | `npm test` — 13 Vitest unit tests |
| TypeScript build | every push/PR | `npm run build` — full tsc check |
| Deploy | push to `main` only | Docker build → Artifact Registry → Cloud Run → `/healthz` check |

GitHub Actions secrets required (set by `gcp-setup.sh`):

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | `exam-prep-600` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource name |
| `GCP_SERVICE_ACCOUNT` | `gh-600-prep-deploy@exam-prep-600.iam.gserviceaccount.com` |
| `GCS_BUCKET` | `gh-600-prep-pdfs` |

---

## File map (what to touch for each concern)

| Concern | Files |
|---------|-------|
| Question generation logic | `src/generation.ts`, `prompts/generate-batch.prompt.md` |
| Domain knowledge | `prompts/knowledge/domain-{A-F}.md`, `prompts/knowledge/gh-600-study-guide.md` |
| Domain/item-type distribution | `src/blueprint.ts` |
| API routes | `src/server.ts` |
| PDF export | `src/pdfExport.ts`, `scripts/export-exam-pdf.ts` |
| PDF cloud storage | `src/storage.ts` |
| Frontend (all views) | `public/app.js`, `public/styles.css` |
| Published exam control | `data/published.json` (edit directly or use UI toggle) |
| Persistence | `src/persistence.ts`, `data/exams/exams.json`, `data/attempts/` |
| Scoring / study loops | `src/scoring.ts`, `src/studyLoops.ts` |
| Anti-bias checks | `src/antiBias.ts` |
| Types | `src/types.ts` |
| Config (model, effort, dev/prod) | `src/config.ts`, `.env` (copy from `.env.example`) |
| GCP infra setup | `scripts/gcp-setup.sh` |
| CI/CD pipeline | `.github/workflows/ci.yml` |
| Docker image | `Dockerfile`, `.dockerignore` |
| Deployment operations | `.github/CLOUD_RUN_DEPLOYMENT_RUNBOOK.md` |

---

## Test and build

```bash
npm test        # Vitest — 13 tests, 6 files, no API key needed
npm run build   # tsc — must be clean before any commit
```

All 13 unit tests are fixture-based (no OpenAI calls). The Playwright e2e spec (`tests/e2e/exam.spec.ts`) must be run with `npx playwright test` separately — it requires the dev server running and is not included in `npm test`.

---

## Phase 4 — Cloud Run deployment checklist

- [x] CI/CD pipeline configured (`.github/workflows/ci.yml`)
- [x] One-shot GCP setup script (`scripts/gcp-setup.sh`)
- [x] GCS bucket wired for PDF storage (`src/storage.ts`)
- [x] Security audit clean — `npm audit` 0 vulnerabilities, no secrets in source
- [x] `npm test` passes (13/13)
- [x] `npm run build` passes
- [x] `.env.example` documents all env vars
- [x] `bash scripts/gcp-setup.sh` run (provisions infra + sets GitHub secrets)
- [x] At least one exam published in `data/published.json` and committed
- [ ] Push to `main` → CI deploys → `/healthz` returns `{"ok":true}`
- [ ] Home page lists published exam(s) at Cloud Run URL

---

## Known issues / future work

| Item | Notes |
|------|-------|
| Playwright e2e tests not in `npm test` | `tests/e2e/exam.spec.ts` uses `@playwright/test` which conflicts with Vitest runner. Run with `npx playwright test` separately. |
| Sequence/matching drag-and-drop | Current UI uses click-to-select; true drag-and-drop was deferred. |
| Analytics view | Score + domain breakdown shown in review; deeper per-item-type analytics wired in `src/studyLoops.ts` but UI tab was simplified. |
| `infer: false` in some questions | Some generated questions reference deprecated `infer: false`. Domain-A knowledge file notes this, but existing generated exams may contain it. Regenerate or edit if needed. |
| GCS uuid transitive vulnerability | `@google-cloud/storage@7.x` pulls in `uuid < 11.1.1` via transitive deps. Mitigated via `overrides` in `package.json`. Revisit when GCS SDK releases a fix. |
| PDF generation needs Chromium | `npx playwright install chromium` must be run in any new dev environment. Not needed in prod (PDF generation is dev-only). |

