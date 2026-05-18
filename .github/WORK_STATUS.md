# Codex Work Status Tracker

Last updated: 2026-05-18 (UTC)

## Current phase snapshot

- **Plan reference:** `.github/APP_PLAN.md`
- **Current phase target:** **Phase 4** (Cloud Run deploy)
- **Overall status:** ✅ Core architecture complete — ready to deploy

## Architecture (clarified)

The app has two clearly separated modes:

1. **Dev generation** (`npm run generate`): Calls OpenAI API (requires `OPENAI_API_KEY`), saves a full practice exam to `data/exams/`. This is never triggered by users.
2. **User exam UI**: Serves pre-generated exams from `data/`. No OpenAI calls at runtime. The home page lists available exams; users pick one and take it.
3. **Test fixtures**: `FALLBACK_QUESTIONS` in `src/generation.ts` are used only when `VITEST=true` or `NODE_ENV=test`. They are never served to real users.

## Milestone checklist

### Phase 1 — Vertical slice

- [x] Configurable question counts and batched generation flow
- [x] Exam mode + timer + review mode
- [x] Score reporting with domain breakdown
- [x] Local persistence for exams and attempts

### Phase 2 — Analytics + adaptive review

- [x] Confidence capture in exam flow
- [x] Response-time tracking by question
- [x] Analytics view includes confidence distribution
- [x] Analytics view includes average response time by item type
- [x] Analytics view includes distractor-attraction signals
- [x] Weak-domain drill endpoint and UI trigger
- [x] Mistake-replay endpoint and UI trigger
- [x] Anti-bias dashboard (expanded, user-facing)
- [x] Matching/sequence interaction UX hardening
- [x] Domain/sub-skill drill curation and prioritization tuning

### Phase 3 — Full mock ops

- [x] Reach stable 100-question operations flow
- [x] Run + validate 2 full mock exams end-to-end
- [x] Export/report workflows

### Phase 3.5 — Architecture hardening (clarified intent)

- [x] Dev-only generation: `generateBatch` throws in production without API key (no silent fallback)
- [x] `FALLBACK_QUESTIONS` guarded behind test env — never exposed to users
- [x] `GET /api/config` endpoint — UI learns `hasApiKey` and `examCount` without leaking secrets
- [x] `GET /api/exams` list endpoint — home page shows pre-generated exams
- [x] Home page shows exam list; generate form shown only when `hasApiKey=true`
- [x] `scripts/generate.ts` + `npm run generate` — developer CLI for pre-generation
- [x] OpenAI API confirmed working with gpt-5.5 (real key tested)
- [x] JavaScript syntax error in `public/app.js` fixed
- [x] Express route ordering fixed (`/api/exams/generate` before `/api/exams/:id`)

### Phase 4 — Cloud Run publish

- [x] Add production Dockerfile and `.dockerignore`
- [x] Add Cloud Run deployment steps and env/secret mapping docs
- [ ] Deploy service and verify public health/app endpoint

## Recent implementation log

- Architecture hardened: generation is dev-only (`npm run generate`), fallback questions are test-only, UI serves pre-generated exams
- Fixed critical Express route ordering bug (`/api/exams/generate` was shadowed by `/:id`)
- Fixed JavaScript syntax error (orphaned state block at end of `public/app.js`)
- Complete UI redesign: 6-view SPA replacing bare-bones terminal UI
- OpenAI gpt-5.5 API confirmed working with real key

## Immediate next tasks

1. Run `npm run generate` with real key to pre-populate at least one exam.
2. Deploy on Cloud Run from GCP Console and verify `/healthz` + `/`.
3. Complete `.github/OPENAI_REAL_KEY_TEST_REPORT.md` with passing real-key run evidence.
4. Record deployed service URL and rollback-tested revision in runbook notes.
