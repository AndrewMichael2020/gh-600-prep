# OpenAI Real-Key Test Report (Pre-Cloud Run Gate)

Last updated: 2026-05-18 (UTC)

## Objective

Track **real OpenAI API key** validation results for this app before Phase 4 Cloud Run publishing.

This report is the required release-gate artifact for “tested with real `OPENAI_API_KEY`”.

---

## Scope of required live-key tests

1. **Generation path uses OpenAI (not fallback)**:
   - Trigger question generation for at least one batch.
   - Confirm generated payload shape is valid and non-empty.
2. **Full 100-question flow smoke**:
   - Build blueprint.
   - Generate/validate/assemble exam.
   - Persist exam and submit attempt.
3. **Post-attempt study/export APIs**:
   - Weak-domain drill
   - Mistake replay
   - Domain/sub-skill drill
   - Attempt export endpoint
4. **No secret leakage**:
   - API key remains server-side only.

---

## Environment status (current runner)

- Local code-runner environment variable check:
  - `OPENAI_API_KEY` is **not present** in this runtime.
- Result:
  - Local live-key execution is **blocked** here.
  - Functional tests can still run using fallback generation path.

---

## Real-key execution records

> Fill these rows from GitHub Actions runs where `OPENAI_API_KEY` is injected via workflow env.

| Date (UTC) | Run ID / URL | Trigger | Live key available | OpenAI generation confirmed | 100Q flow pass | Study/export APIs pass | Notes |
|---|---|---|---|---|---|---|---|
| TBD | TBD | workflow_dispatch/push/PR | TBD | TBD | TBD | TBD | Pending first real-key run |

---

## Release gate decision (for Phase 4)

- **Gate status:** ❌ Not yet satisfied (no recorded successful real-key run evidence in this report).
- **To pass gate:** Add at least one completed row above with all required checks marked pass.
