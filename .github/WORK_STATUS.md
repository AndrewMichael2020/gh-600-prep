# Codex Work Status Tracker

Last updated: 2026-05-18 (UTC)

## Current phase snapshot

- **Plan reference:** `.github/APP_PLAN.md`
- **Current phase target:** **Phase 2** (analytics + adaptive review loops)
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
- [ ] Domain/sub-skill drill curation and prioritization tuning

### Phase 3 — Full mock ops

- [ ] Reach stable 100-question operations flow
- [ ] Run + validate 2 full mock exams end-to-end
- [ ] Export/report workflows

## Recent implementation log

- `7966402` — Added confidence capture + richer frontend analytics.
- `3ccdf11` — Added weak-domain drill + mistake replay study loops (API, UI wiring, tests).
- `d6f95a6` — Added user-facing anti-bias dashboard.

## OpenAI API token and cost tracker (Codex + GitHub)

> Update this section per PR/iteration (best effort). Values may remain `TBD` when provider billing detail is unavailable in-runtime.

| Date (UTC) | Surface | Prompt tokens | Completion tokens | Total tokens | Estimated cost (USD) | Notes |
|---|---:|---:|---:|---:|---:|---|
| 2026-05-18 | Codex (this repo iteration) | TBD | TBD | TBD | TBD | Runtime did not expose tokenized billing counters. |
| 2026-05-18 | GitHub/Copilot-side usage | TBD | TBD | TBD | TBD | Track from GitHub billing/export if available. |

## Immediate next tasks

1. Add a visible anti-bias dashboard section in analytics (position distribution + longest-option ratio trend).
2. Improve sequence/matching UI interactions for exam realism and lower input ambiguity.
3. Extend study-loop logic to include sub-skill tagging and weighted replay ordering.
