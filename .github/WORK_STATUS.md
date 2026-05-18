# Codex Work Status Tracker

Last updated: 2026-05-18 (UTC)

## Current phase snapshot

- **Plan reference:** `.github/APP_PLAN.md`
- **Current phase target:** **Phase 3** (full mock operations + export workflows)
- **Overall status:** **In progress**

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

### Phase 4 — Cloud Run publish

- [ ] Add production Dockerfile and `.dockerignore`
- [ ] Add Cloud Run deployment steps and env/secret mapping docs
- [ ] Deploy service and verify public health/app endpoint

## Recent implementation log

- `7966402` — Added confidence capture + richer frontend analytics.
- `3ccdf11` — Added weak-domain drill + mistake replay study loops (API, UI wiring, tests).
- `d6f95a6` — Added user-facing anti-bias dashboard.
- `e8f9e5d` — Hardened matching/sequence UX + token/cost tracking section.
- `5f8ebe9` — Added domain/sub-skill drill curation endpoint and prioritization tuning.
- `a9d4b4b` — Implemented domain/sub-skill drill curation and prioritization.
- `059175f` — Completed Phase 3 ops checks and added attempt export workflow.

## OpenAI API token and cost tracker (Codex + GitHub)

> Update this section per PR/iteration (best effort). Values may remain `TBD` when provider billing detail is unavailable in-runtime.

| Date (UTC) | Surface | Prompt tokens | Completion tokens | Total tokens | Estimated cost (USD) | Notes |
|---|---:|---:|---:|---:|---:|---|
| 2026-05-18 | Codex (this repo iteration) | TBD | TBD | TBD | TBD | Runtime did not expose tokenized billing counters. |
| 2026-05-18 | GitHub/Copilot-side usage | TBD | TBD | TBD | TBD | Track from GitHub billing/export if available. |

## Immediate next tasks

1. Start Phase 4 by preparing Cloud Run container/deployment assets.
2. Add Cloud Run deployment runbook checks (health, rollback, secrets).
3. Complete `.github/OPENAI_REAL_KEY_TEST_REPORT.md` with passing real-key run evidence before publish.
