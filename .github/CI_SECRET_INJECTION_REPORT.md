# CI Secret Injection Report (OPENAI_API_KEY)

Last updated: 2026-05-18 (UTC)

## Purpose

Provide an in-repo report confirming how to trigger CI and where `OPENAI_API_KEY` is injected for test/build steps.

## Workflow trigger modes

The CI workflow supports:

- `push`
- `pull_request`
- `workflow_dispatch` (manual trigger from GitHub Actions UI)

Reference: `.github/workflows/ci.yml`.

## Secret injection mapping

The workflow injects `OPENAI_API_KEY` into both runtime steps:

1. **Run tests**
   - command: `npm test`
   - env: `OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}`
2. **Build**
   - command: `npm run build`
   - env: `OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}`

## Verification checklist (operator-run)

1. Open **Actions** tab in GitHub.
2. Select workflow **CI**.
3. Trigger with **Run workflow** (manual) or via push/PR.
4. Open run summary and confirm:
   - `Install dependencies` succeeded.
   - `Run tests` executed.
   - `Build` executed.
5. Confirm step definitions in repo match expected env injection lines in `.github/workflows/ci.yml`.

## Expected outcome

When `secrets.OPENAI_API_KEY` is configured at repo level, both test and build steps receive `OPENAI_API_KEY` via `env`.
