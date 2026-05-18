# OpenAI Real-Key Test Report (Pre-Cloud Run Gate)

Last updated: 2026-05-18 (UTC)

## Objective

Track **real OpenAI API key** validation results for this app before Phase 4 Cloud Run publishing.

This report is the required release-gate artifact for "tested with real `OPENAI_API_KEY`".

---

## Architecture note

Generation is a **developer-only operation**. Users never trigger it.

- Developers run `npm run generate` (or use the in-app form when `hasApiKey=true` on the server).
- Users see pre-generated exams served from `data/exams/exams.json`.
- `FALLBACK_QUESTIONS` in `src/generation.ts` are test fixtures only — never served to users.

---

## Scope of required live-key tests

1. **`npm run generate` succeeds end-to-end**:
   - All batches complete via `generateWithOpenAI` (no fallback code path).
   - Exam saved to `data/exams/exams.json`.
2. **Home page lists the generated exam**:
   - `/api/exams` returns the new exam.
   - UI renders the exam list without errors.
3. **Full exam attempt flow**:
   - User can select exam, take it, submit, and see results/review/analytics.
4. **No secret leakage**:
   - `OPENAI_API_KEY` never appears in any API response or frontend JS bundle.
   - `/api/config` returns `{ hasApiKey: true }` — key value is never returned.

---

## Confirmed working (2026-05-18)

- `gpt-5.5` responds correctly via `client.responses.create` with `reasoning: { effort: "medium" }`.
- `/api/exams/generate` SSE endpoint streams `plan` → `batch_start` / `batch_done` × N → `complete` events.
- Express route ordering fixed: `/api/exams/generate` now resolves before `/api/exams/:id`.
- Server health: `GET /healthz` → `{ ok: true }`.

---

## Real-key execution records

| Date (UTC) | Trigger | Live key | OpenAI generation confirmed | Exam saved | UI exam list | Full attempt flow | Notes |
|---|---|---|---|---|---|---|---|
| 2026-05-18 | Manual curl | ✅ | ✅ SSE events streamed (5 batches) | ✅ | Pending Playwright run | Pending Playwright run | JS syntax error blocked browser; now fixed |
| TBD | `npm run generate` | TBD | TBD | TBD | TBD | TBD | Run after fix deployment |

---

## Release gate decision (for Phase 4)

- **Gate status:** 🟡 Partial — server-side generation confirmed; full browser flow pending one clean Playwright run after fixes.
- **To pass gate:** Add one completed row above with UI exam list + full attempt flow both marked pass.
