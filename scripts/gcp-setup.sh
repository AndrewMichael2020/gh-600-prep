#!/usr/bin/env bash
# scripts/gcp-setup.sh
#
# One-time GCP infrastructure setup for gh-600-prep.
# Run from any machine with gcloud + gh authenticated:
#
#   gcloud auth login
#   gcloud auth application-default login
#   gh auth login
#   bash scripts/gcp-setup.sh
#
# Idempotent — safe to re-run.

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT_ID="exam-prep-600"
PROJECT_NUMBER="552752121046"
REGION="us-central1"
GH_REPO="AndrewMichael2020/gh-600-prep"

AR_REPO="gh-600-prep"
RUN_SERVICE="gh-600-prep"
GCS_BUCKET="gh-600-prep-pdfs"
SA_NAME="gh-600-prep-deploy"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
WIF_POOL="github-actions"
WIF_PROVIDER="github"

echo "=== GCP setup for ${PROJECT_ID} ==="
gcloud config set project "${PROJECT_ID}"

# ── 1. Enable required APIs ───────────────────────────────────────────────────
echo "--- Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project="${PROJECT_ID}"

# ── 2. Artifact Registry repository ──────────────────────────────────────────
echo "--- Creating Artifact Registry repository..."
gcloud artifacts repositories create "${AR_REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --project="${PROJECT_ID}" 2>/dev/null || echo "  (already exists)"

# ── 3. GCS bucket for PDFs ────────────────────────────────────────────────────
echo "--- Creating GCS bucket gs://${GCS_BUCKET}..."
gcloud storage buckets create "gs://${GCS_BUCKET}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --uniform-bucket-level-access 2>/dev/null || echo "  (already exists)"

echo "--- Setting public read on bucket..."
gcloud storage buckets add-iam-policy-binding "gs://${GCS_BUCKET}" \
  --member="allUsers" \
  --role="roles/storage.objectViewer"

# ── 4. Service account ────────────────────────────────────────────────────────
echo "--- Creating service account ${SA_EMAIL}..."
gcloud iam service-accounts create "${SA_NAME}" \
  --display-name="gh-600-prep GitHub Actions deploy SA" \
  --project="${PROJECT_ID}" 2>/dev/null || echo "  (already exists)"

echo "--- Granting roles to service account..."
for ROLE in \
  roles/run.admin \
  roles/artifactregistry.writer \
  roles/iam.serviceAccountTokenCreator \
  roles/storage.objectAdmin \
  roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --condition=None --quiet
done

# Cloud Run needs to act as itself when deploying
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --condition=None

# ── 5. Workload Identity Federation ──────────────────────────────────────────
echo "--- Setting up Workload Identity Federation..."
gcloud iam workload-identity-pools create "${WIF_POOL}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions pool" 2>/dev/null || echo "  (pool already exists)"

gcloud iam workload-identity-pools providers create-oidc "${WIF_PROVIDER}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="${WIF_POOL}" \
  --display-name="GitHub OIDC provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository == '${GH_REPO}'" 2>/dev/null || echo "  (provider already exists)"

WIF_PROVIDER_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/providers/${WIF_PROVIDER}"

gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/attribute.repository/${GH_REPO}" \
  --condition=None

# ── 6. Secret Manager — OpenAI API key ───────────────────────────────────────
echo "--- Creating Secret Manager secret 'openai-api-key'..."
OPENAI_KEY=$(grep OPENAI_API_KEY "$(dirname "$0")/../.env" 2>/dev/null | cut -d= -f2- || true)

if gcloud secrets describe openai-api-key --project="${PROJECT_ID}" &>/dev/null; then
  echo "  (secret already exists — not overwriting)"
elif [ -n "${OPENAI_KEY}" ]; then
  echo "${OPENAI_KEY}" | gcloud secrets create openai-api-key \
    --project="${PROJECT_ID}" \
    --data-file=-
  echo "  Created secret from local .env"
else
  echo "  ⚠️  OPENAI_API_KEY not found in .env — create the secret manually:"
  echo "     echo 'sk-...' | gcloud secrets create openai-api-key --project=${PROJECT_ID} --data-file=-"
fi

# ── 7. Grant Cloud Run SA access to the secret ───────────────────────────────
# The default Cloud Run SA also needs to read the secret at runtime
CLOUDRUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding openai-api-key \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${CLOUDRUN_SA}" \
  --role="roles/secretmanager.secretAccessor" 2>/dev/null || true

# ── 8. Set GitHub Actions secrets ────────────────────────────────────────────
echo "--- Setting GitHub Actions secrets..."
gh secret set GCP_PROJECT_ID        --repo="${GH_REPO}" --body="${PROJECT_ID}"
gh secret set GCP_WORKLOAD_IDENTITY_PROVIDER --repo="${GH_REPO}" --body="${WIF_PROVIDER_RESOURCE}"
gh secret set GCP_SERVICE_ACCOUNT   --repo="${GH_REPO}" --body="${SA_EMAIL}"
gh secret set GCS_BUCKET            --repo="${GH_REPO}" --body="${GCS_BUCKET}"
echo "  GitHub secrets set ✅"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Setup complete!                                             ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Artifact Registry : ${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}"
echo "║  GCS bucket        : gs://${GCS_BUCKET}"
echo "║  Cloud Run service : ${RUN_SERVICE} (${REGION})"
echo "║  Deploy SA         : ${SA_EMAIL}"
echo "║  WIF provider      : ${WIF_PROVIDER_RESOURCE}"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Push to main to trigger first deploy.                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
