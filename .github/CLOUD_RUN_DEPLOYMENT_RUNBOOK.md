# Cloud Run Deployment Runbook (GCP Console-first)

Last updated: 2026-05-18 (UTC)

## 1) Pre-deploy checklist

- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] `.github/OPENAI_REAL_KEY_TEST_REPORT.md` has at least one passing real-key run row
- [ ] Container builds locally from `Dockerfile`

## 2) Build & push container image

Example (Cloud Shell):

```bash
gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT_ID/REPO/gh-600-prep:latest
```

## 3) Deploy from GCP Console

In **Cloud Run → Create Service**:

1. Select image from Artifact Registry.
2. Set port to `8080`.
3. Set minimum CPU/memory as needed (start small).
4. Configure environment variables:
   - `OPENAI_MODEL=gpt-5.5`
   - `OPENAI_REASONING_EFFORT=medium`
   - `OPENAI_REVIEW_REASONING_EFFORT=high`
5. Configure secrets:
   - `OPENAI_API_KEY` from Secret Manager, injected as env var.

## 4) Post-deploy verification checks

Replace `SERVICE_URL` with Cloud Run URL.

```bash
curl -fsS "${SERVICE_URL}/healthz"
curl -fsS "${SERVICE_URL}/" >/dev/null
```

Expected:
- `/healthz` returns JSON with `ok: true`.
- `/` serves the app shell.

## 5) Rollback procedure

In Cloud Run console:

1. Open service → **Revisions**.
2. Route 100% traffic to previous healthy revision.
3. Re-run health checks.

## 6) Production readiness checks

- [ ] No secrets in client code.
- [ ] `OPENAI_API_KEY` only from Secret Manager/env.
- [ ] Health endpoint up (`/healthz`).
- [ ] 429 rate-limit behavior verified.
- [ ] Error responses for missing exam/attempt verified.
- [ ] Export endpoint functional (`/api/exports/attempt/:attemptId`).
