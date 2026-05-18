# Codex Work Status Tracker

Last updated: 2026-05-18 (UTC)

## Current phase

- **Plan reference:** `.github/APP_PLAN.md`
- **API usage reference:** `.github/OPENAI_API_USAGE.md`
- **Current phase target:** **Phase 4** (Cloud Run deploy)
- **Overall status:** ✅ Generation + UI complete — ready to deploy

---

## Architecture (current)

| Mode | Trigger | OpenAI? | Output |
|------|---------|---------|--------|
| **Dev generation** | `npm run generate` | ✅ gpt-5.5 + web_search | `data/exams/exams.json` |
| **User exam UI** | Browser | ❌ | Reads `data/exams/` |
| **Test** | `npm test` | ❌ | `tests/fixtures/questions.ts` |

Key invariants:
- `generateBatch()` throws immediately without `OPENAI_API_KEY` — no fallback, no test bypass
- Fixture questions are imported only by test files — zero production code dependency
- `OPENAI_API_KEY` never appears in any HTTP response or frontend bundle

---

## Milestone checklist

### Phase 1 — Vertical slice ✅
- [x] Configurable question counts and batched generation
- [x] Exam mode + timer + review mode
- [x] Score reporting with domain breakdown
- [x] Local persistence for exams and attempts

### Phase 2 — Analytics + adaptive review ✅
- [x] Confidence capture, response-time tracking
- [x] Analytics view (confidence distribution, time by item type, distractor-attraction)
- [x] Weak-domain drill and mistake-replay endpoints
- [x] Anti-bias dashboard, matching/sequence UX hardening

### Phase 3 — Full mock ops ✅
- [x] Stable 100-question operations flow
- [x] 2 full end-to-end mock exams validated
- [x] Export/report workflows

### Phase 3.5 — Architecture hardening ✅
- [x] Dev-only generation: `generateBatch()` throws in production without API key
- [x] `GET /api/config` endpoint — exposes `hasApiKey` / `examCount` without leaking key
- [x] `GET /api/exams` list endpoint — home page shows pre-generated exams
- [x] UI: exam list shown; generate form shown only when `hasApiKey=true`
- [x] `scripts/generate.ts` + `npm run generate`
- [x] Express route ordering fixed (`/api/exams/generate` before `/api/exams/:id`)
- [x] JavaScript syntax error in `public/app.js` fixed
- [x] OpenAI gpt-5.5 confirmed working with real key

### Phase 3.6 — Web-grounded generation ✅
- [x] Official GH-600 domain names from study guide used everywhere (domainMap updated)
- [x] 6 domain knowledge files created: `prompts/knowledge/domain-{A-F}.md`
  - Each contains exact study-guide sub-skills + GitHub Docs + Microsoft Learn content
- [x] `gh-600-study-guide.md` — full official skills outline in `prompts/knowledge/`
- [x] `loadDomainKnowledge()` replaces hardcoded `DOMAIN_KNOWLEDGE` constant
- [x] `web_search_preview` tool enabled in Responses API call
- [x] System prompt instructs model to use web search and reference official URLs
- [x] `scripts/fetch-knowledge.ts` + `npm run fetch-knowledge` — refreshes all 11 sources
- [x] `FALLBACK_QUESTIONS` array completely removed from `generation.ts`
- [x] `createQuestion()` removed from `generation.ts`
- [x] Fixture questions moved to `tests/fixtures/questions.ts` (6 typed `PracticeQuestion` objects)
- [x] `tests/fullMockOps.test.ts` updated to use fixtures directly — no API key needed in CI
- [x] CI updated: test and build jobs no longer pass `OPENAI_API_KEY`; Docker build job added
- [x] All 12 tests pass; build clean

### Phase 4 — Cloud Run deployment 🔲
- [ ] Run `npm run generate` to populate ≥1 exam in `data/exams/`
- [ ] Docker image builds locally
- [ ] Image pushed to Artifact Registry
- [ ] Cloud Run service deployed with `OPENAI_API_KEY` from Secret Manager
- [ ] `/healthz` returns `{ ok: true }` at deployed URL
- [ ] Home page lists exams at deployed URL

---

## Scripts reference

| Script | Requires | Purpose |
|--------|----------|---------|
| `npm test` | Nothing | Vitest unit tests (fixture-based, no API key) |
| `npm run build` | Nothing | TypeScript → `dist/` |
| `npm run dev` | `.env` optional | Dev server with live reload |
| `npm start` | `dist/` built | Production server |
| `npm run generate` | `.env` with `OPENAI_API_KEY` | Generate + save a practice exam |
| `npm run fetch-knowledge` | Network access | Refresh `prompts/knowledge/` from official docs |


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

1. Run `npm run generate` to pre-populate at least one exam in `data/exams/`.
2. Deploy on Cloud Run from GCP Console and verify `/healthz` + `/`.
3. Record deployed service URL and rollback-tested revision in runbook notes.
