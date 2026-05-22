# Cloud Run Deployment Runbook

> **Normal workflow:** just push to `main`. The CI/CD pipeline handles everything automatically.
> This runbook covers first-time setup, manual operations, and rollback.

---

## First-time setup (run once)

Prerequisites: `gcloud` authenticated, `gh` authenticated, repo cloned.

```bash
gcloud auth login
gcloud auth application-default login
gh auth login
bash scripts/gcp-setup.sh
```

`gcp-setup.sh` provisions all GCP infrastructure and sets all GitHub Actions secrets:

| Resource | Name |
|----------|------|
| Artifact Registry repo | `gh-600-prep` (us-central1) |
| GCS bucket | `gh-600-prep-pdfs` (public-read, stores generated PDFs) |
| Service account | `gh-600-prep-deploy@exam-prep-600.iam.gserviceaccount.com` |
| Workload Identity pool/provider | `github-actions` / `github` (scoped to this repo) |
| Secret Manager secret | `openai-api-key` (read from local `.env`) |
| GitHub Actions secrets set | `GCP_PROJECT_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GCS_BUCKET` |

After running the script, push to `main` to trigger the first deploy.

---

## Normal deploy

```bash
git push origin main
```

CI runs: **Test → TypeScript build → Deploy to Cloud Run**.  
Deploy only triggers on push to `main` after both other jobs pass.

The deploy step:
1. Builds Docker image (exam data + published.json baked in)
2. Pushes to Artifact Registry
3. Runs `gcloud run deploy` (zero-downtime rolling update)
4. Verifies `GET /healthz` returns `{"ok":true}`

---

## Publishing an exam to production

1. In dev mode (`npm run dev`), generate an exam
2. Click the **🔒 Unpublished** toggle → becomes **✅ Published** (updates `data/published.json`)
3. Generate a PDF if desired — it uploads to GCS automatically if `GCS_BUCKET` is set
4. Commit and push:
   ```bash
   git add data/published.json data/exams/exams.json data/exams/*.pdf
   git commit -m "publish: add exam <id>"
   git push origin main
   ```
5. The deploy bakes the updated exam data into the image — production users see it immediately

---

## Environment variables (Cloud Run)

Set automatically by the CI workflow. To update manually:

```bash
gcloud run services update gh-600-prep \
  --region us-central1 \
  --set-env-vars "OPENAI_MODEL=gpt-5.5,OPENAI_REASONING_EFFORT=medium,OPENAI_REVIEW_REASONING_EFFORT=high,GCS_BUCKET=gh-600-prep-pdfs" \
  --set-secrets "OPENAI_API_KEY=openai-api-key:latest"
```

To rotate the OpenAI key:
```bash
echo "sk-new-key" | gcloud secrets versions add openai-api-key --data-file=-
# then redeploy to pick up the new version:
git commit --allow-empty -m "chore: rotate openai key" && git push origin main
```

---

## Post-deploy verification

```bash
SERVICE_URL=$(gcloud run services describe gh-600-prep \
  --region us-central1 --format "value(status.url)")

curl -fsS "${SERVICE_URL}/healthz"          # → {"ok":true,...}
curl -fsS "${SERVICE_URL}/api/exams"        # → published exams array
curl -fsS "${SERVICE_URL}/" > /dev/null     # → 200 app shell
```

---

## Rollback

**Via CI:** revert the commit and push to `main` — a new deploy will run automatically.

**Via console (immediate):**
1. Cloud Run → `gh-600-prep` → Revisions
2. Find the last healthy revision → **Manage Traffic** → route 100% traffic to it

---

## Production readiness checklist

- [x] `npm test` passes (13/13)
- [x] `npm run build` passes (clean tsc)
- [x] At least one exam in `data/published.json`
- [x] `scripts/gcp-setup.sh` has been run (GitHub secrets set)
- [x] `npm audit` shows 0 vulnerabilities
- [ ] `/healthz` returns `{"ok":true}` at deployed URL
- [ ] Home page lists published exam(s)
- [ ] `OPENAI_API_KEY` only reachable server-side (verify: browser DevTools → Network, no key in responses)
