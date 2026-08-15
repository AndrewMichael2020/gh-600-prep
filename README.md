# gh-600-prep

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white)
![Vitest](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/e2e-Playwright-2EAD33?logo=playwright&logoColor=white)
![OpenAI](https://img.shields.io/badge/API-OpenAI-412991?logo=openai&logoColor=white)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](./LICENSE)

A full-stack TypeScript study app for the **GitHub Certified: Agentic AI Developer** (GH-600 beta) certification. It uses the OpenAI API to generate realistic, scenario-driven practice exams, lets you take them in timed **Exam** or self-paced **Practice** mode, and exports any exam to a human-readable PDF.

---

## Quick start

### 1. Install

```bash
npm install
npx playwright install chromium   # needed for PDF export
```

### 2. Configure environment

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Required:

```env
OPENAI_API_KEY=sk-...
```

Optional (defaults shown):

```env
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=medium
OPENAI_REVIEW_REASONING_EFFORT=high
PORT=3000
```

`OPENAI_API_KEY` is server-side only and never sent to the browser.

### 3. Run

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start server in **dev mode** at `http://localhost:3000` — generation UI and publish toggle are visible |
| `npm start` | Start in **production mode** — only published exams are shown, no generation UI |
| `npm test` | Run Vitest unit tests |
| `npm run build` | TypeScript compile check (`tsc`) |
| `npm run export-pdf` | CLI: export a specific exam to PDF |

---

## How it works

### Generating an exam (dev mode)

In dev mode the sidebar shows a **Generate New Exam** panel. Enter a question count and choose a mode (Exam or Practice), then click **Generate Exam**. The server:

1. Builds a **domain/item-type blueprint** (`src/blueprint.ts`) that distributes questions across the six GH-600 domains with weights close to the official exam distribution.
2. Calls OpenAI in **batches** (`src/generation.ts`) — each batch targets a specific domain and question type, passing previously generated question stems to avoid duplicates.
3. For case-study batches, already-used narrative themes are passed in the prompt so the generator avoids repeating them.
4. Assembles and persists the finished `ExamSet` to `data/exams/exams.json`.

The UI shows live batch-by-batch progress via Server-Sent Events.

### Taking an exam

From the home screen, choose any available exam and a mode:

- **🎯 Exam** — timed (`question_count × 1.2` minutes), answers hidden until you submit.
- **📖 Practice** — untimed; correct answers are revealed immediately after each question so you can learn as you go.

After submitting an exam you see a score breakdown by domain and can review every question with full explanations (why the correct answer is right, why each distractor is wrong).

### Question types

| Type | Description |
|------|-------------|
| `single_choice` | One correct answer from four options |
| `multi_select` | Two or three correct answers |
| `sequence_order` | Drag items into the correct order |
| `matching_magnet` | Match left-column items to right-column items |
| `code_or_config_artifact` | Scenario with an embedded YAML/JSON/log artifact |
| `case_study_child` | Question that references a shared case-study scenario |

### Domain distribution

Questions are spread across the six official GH-600 exam domains:

| Domain | Topic | Target weight |
|--------|-------|--------------|
| A | Agent architecture and SDLC processes | ~20% |
| B | MCP / tool use and environment permissions | ~22% |
| C | Memory, state, and execution | ~12% |
| D | Evaluation, telemetry, error analysis, and tuning | ~18% |
| E | Multi-agent orchestration and incident response | ~18% |
| F | Guardrails, safety, accountability, and governance | ~10% |

### Anti-bias enforcement

Every generated exam is checked for answer-position bias (`src/antiBias.ts`): correct answers should be roughly equally distributed across positions A–D. The generation prompt also enforces that the shortest/second-shortest option is correct ≥50% of the time and the longest option is correct ≤10% of the time — countering the LLM tendency to make longer answers correct.

---

## Developer features (dev mode only)

### Publish / unpublish exams

Each exam row in dev mode has a **🔒 Unpublished / ✅ Published** toggle. Clicking it updates `data/published.json`, which controls what production users see. In production (`npm start`) only published exams are returned by the API.

`data/published.json` format:
```json
{ "examIds": ["<uuid>", "..."] }
```

### PDF export

Each exam row has two buttons:

- **📄 Generate PDF** — calls `POST /api/exams/:id/pdf`, which uses Playwright/Chromium to render the full exam (with answers and explanations) as a print-quality PDF.
- **⬇ Download PDF** — appears once the PDF exists; links directly to the file.

PDFs are saved to `data/exams/` with a human-readable name:

```
gh-600-YYYY-MM-DD-<count>q-<id8>.pdf
# e.g. gh-600-2026-05-22-100q-a1ac29d0.pdf
```

You can also generate a PDF from the command line:

```bash
npm run export-pdf -- <exam-id>
```

---

## Project layout

```
src/
  server.ts          Express server — all API routes and SSE generation stream
  generation.ts      OpenAI batch generation, blueprint, assemble
  blueprint.ts       Domain/item-type distribution logic
  pdfExport.ts       Playwright HTML→PDF renderer (shared by server and CLI)
  persistence.ts     Read/write exams and attempts to data/
  scoring.ts         Score an attempt, domain breakdowns
  studyLoops.ts      Weak-domain drills, mistake replay helpers
  antiBias.ts        Answer-position and length-rank bias checks
  types.ts           All TypeScript types (ExamSet, PracticeQuestion, Attempt, …)
  validators.ts      Zod schemas for API request validation
  config.ts          Runtime config (model, effort, dev/prod flags)

public/
  index.html         Single-page app shell
  app.js             All frontend logic (exam list, question rendering, timer, review)
  styles.css         UI styles

prompts/
  blueprint.prompt.md
  generate-batch.prompt.md    Main generation prompt — includes domain boundary rules,
                               anti-repetition instructions, and case-study theme avoidance
  generate-case-study.prompt.md
  validate-question.prompt.md
  anti-bias-review.prompt.md
  assemble-exam.prompt.md
  weakness-drill.prompt.md
  knowledge/
    domain-A.md … domain-F.md   Per-domain knowledge injected at generation time
    gh-600-study-guide.md

scripts/
  export-exam-pdf.ts   CLI wrapper around src/pdfExport.ts
  generate.ts          Standalone generation script (no server)
  fetch-knowledge.ts   Utility to refresh knowledge files

data/
  exams/exams.json     All generated exams (questions, case studies, anti-bias stats)
  exams/*.pdf          Generated PDFs (human-readable filenames)
  attempts/            One JSON file per exam attempt
  published.json       IDs of exams visible in production

tests/
  schema.test.ts       Type/schema validation
  scoring.test.ts      Scoring logic
  blueprint.test.ts    Blueprint generation
  studyLoops.test.ts   Study loop helpers
  antiBias.test.ts     Anti-bias checks
  fullMockOps.test.ts  Full generate → score round-trip (mocked OpenAI)
  e2e/exam.spec.ts     Playwright end-to-end tests (run separately with Playwright)
```

---

## API reference

All JSON endpoints. `IS_DEV` endpoints return 403 in production.

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/config` | `{ isDev, hasApiKey, examCount }` |
| `GET` | `/api/exams` | List exams. Dev: all with `isPublished` flag. Prod: published only. |
| `GET` | `/api/exams/:id` | Full exam (questions + case studies) |
| `GET` | `/api/exams/generate` | SSE stream — generates exam in batches |
| `GET` | `/api/exams/:id/pdf-status` | `{ exists, url, filename }` |
| `POST` | `/api/exams/:id/pdf` | Generate PDF (IS_DEV) |
| `POST` | `/api/exams/:id/publish` | Toggle publish `{ published: bool }` (IS_DEV) |
| `POST` | `/api/exams/blueprint` | Create generation plan |
| `POST` | `/api/questions/generate-batch` | Generate one batch |
| `POST` | `/api/questions/validate-batch` | Validate a batch |
| `POST` | `/api/exams/assemble` | Assemble questions into an ExamSet |
| `POST` | `/api/attempts` | Submit an attempt; returns scored result |
| `GET` | `/api/attempts/:id` | Fetch a stored attempt |
| `GET` | `/healthz` | Health check |

---

## CI / CD and production deployment

### GitHub Actions pipeline

Every push triggers `.github/workflows/ci.yml`, which runs three jobs:

| Job | Trigger | What it does |
|-----|---------|-------------|
| **Test** | every push / PR | `npm ci && npm test` (Vitest, 13 unit tests) |
| **TypeScript build** | every push / PR | `npm ci && npm run build` — full `tsc` compile check |
| **Deploy to Cloud Run** | push to `main` only | Builds Docker image → pushes to Artifact Registry → deploys to Cloud Run → verifies `/healthz` |

The deploy job uses **Workload Identity Federation** (no long-lived SA keys checked in). It only runs after both Test and Build pass.

### First-time GCP setup

A one-shot setup script is provided. Run it once from any machine with `gcloud` and `gh` authenticated:

```bash
gcloud auth login
gcloud auth application-default login
gh auth login
bash scripts/gcp-setup.sh
```

The script creates everything needed and sets all four GitHub Actions secrets automatically:

| What | Detail |
|------|--------|
| Artifact Registry repo | `gh-600-prep` in `us-central1` |
| GCS bucket | `gh-600-prep-pdfs` — public-read, for generated PDFs |
| Service account | `gh-600-prep-deploy@exam-prep-600.iam.gserviceaccount.com` |
| WIF pool / provider | `github-actions` / `github` scoped to this repo |
| Secret Manager | `openai-api-key` read from local `.env` |

### Required GitHub Actions secrets

Set in **Settings → Secrets and variables → Actions** (the setup script does this automatically):

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | `exam-prep-600` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full WIF provider resource name |
| `GCP_SERVICE_ACCOUNT` | Deploy SA email |
| `GCS_BUCKET` | GCS bucket name for PDFs |

### Deploy flow

```
git push origin main
  └─ CI: test → build → deploy
       └─ docker build + push to Artifact Registry
            └─ gcloud run deploy (zero-downtime rolling update)
                 └─ curl /healthz → must return {"ok":true}
```

### Production vs dev

In production (`NODE_ENV=production`):
- Only **published** exams appear (controlled by `data/published.json` + publish toggle in dev mode)
- **No** generation panel, publish toggle, PDF generate, or PDF download buttons
- Exams and PDFs are baked into the Docker image at build time; PDFs are served from GCS

To publish an exam to production: toggle it in dev mode → commit `data/published.json` + `data/exams/exams.json` → push to `main`. The CI deploy bakes the new data into the image automatically.

See `.github/CLOUD_RUN_DEPLOYMENT_RUNBOOK.md` for operational details (key rotation, rollback, verification).

---

## Reference sources for question content

Use only these verified GitHub/Microsoft repositories as primary material. Avoid braindump sites.

| Priority | Repository | Why it matters |
|----------|-----------|----------------|
| 1 | [github-samples/agents-in-sdlc](https://github.com/github-samples/agents-in-sdlc) | Copilot Agent Mode, coding agent, SDLC collaboration — Domains A & E |
| 2 | [skills/integrate-mcp-with-copilot](https://github.com/skills/integrate-mcp-with-copilot) | MCP server integration, Agent Mode, issues → PR — Domain B |
| 3 | [github/github-mcp-server](https://github.com/github/github-mcp-server) | Authoritative MCP server: tools, toolsets, permissions — Domain B |
| 4 | [github/awesome-copilot](https://github.com/github/awesome-copilot) | Custom agents, instructions, hooks, MCP references (illustrative) |
| 5 | [github-samples/copilot-in-a-box](https://github.com/github-samples/copilot-in-a-box) | DevRel hub: samples, walkthroughs, MCP exercise |
| 6 | [github/copilot-sdk](https://github.com/github/copilot-sdk) | Programmable agent workflows, tool invocation, hooks — Domains A, B, D |
| 7 | [skills/getting-started-with-github-copilot](https://github.com/skills/getting-started-with-github-copilot) | Copilot basics — foundational coverage |
| 8 | [github-samples/pets-workshop](https://github.com/github-samples/pets-workshop) | Actions, Codespaces, GHAS, secure workflows |
| 9 | [microsoft/mcp-for-beginners](https://github.com/microsoft/mcp-for-beginners) | MCP server/client patterns and fundamentals |
| 10 | [microsoft/ai-agents-for-beginners](https://github.com/microsoft/ai-agents-for-beginners) | Agent design patterns: planning, tool use, multi-agent |
