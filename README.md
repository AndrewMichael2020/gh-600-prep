# gh-600-prep

Preparing for GH-600 (beta).

## Current implementation (Phase 1 vertical slice)

This repository now includes a minimal full-stack TypeScript app that can:

- Generate a configurable GH-600 practice set (30, 70, 100, or custom count)
- Build a weighted domain/item-type blueprint
- Generate questions in batches (not one-shot)
- Validate batches and assemble a final exam
- Persist exams/attempts to local JSON files
- Run timed exam mode (`time_minutes = question_count * 1.2`)
- Hide answers during exam mode, then show collapsible explanations in review
- Show score + domain breakdown analytics

## Quick start

### 1) Install

```bash
npm install
```

### 2) Configure environment

Create `.env` (or export environment variables):

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=medium
OPENAI_REVIEW_REASONING_EFFORT=high
```

`OPENAI_API_KEY` is server-side only and is never exposed in frontend code.  
If no key is provided, the app uses a safe local fallback generator for development.

### 3) Run locally

```bash
npm run dev
```

Open: `http://localhost:3000`

### 4) Test and build

```bash
npm test
npm run build
```

## API endpoints

- `POST /api/exams/blueprint`
- `POST /api/questions/generate-batch`
- `POST /api/questions/validate-batch`
- `POST /api/exams/assemble`
- `POST /api/attempts`
- `GET /api/attempts/:id`
- `GET /api/exams/:id`

## Prompt templates

Prompt templates are stored under `/prompts`:

- `blueprint.prompt.md`
- `generate-batch.prompt.md`
- `generate-case-study.prompt.md`
- `validate-question.prompt.md`
- `anti-bias-review.prompt.md`
- `assemble-exam.prompt.md`
- `weakness-drill.prompt.md`

## Limitations (Phase 1)

- Generation quality is best with an OpenAI API key configured.
- Matching/sequence UI is still baseline (fully advanced interactions are Phase 2).
- Analytics currently focuses on overall score, domain score, and incorrect list.

## Plan: Personal GH-600 Prep App (100 tough simulated questions)

### 1) Objective
- Build a personal practice app with **100 high-difficulty, scenario-first questions** that mirror Microsoft-style certification pressure (ambiguity, trade-offs, governance, and implementation details).
- Emphasize GH-600 beta themes: agent architecture, MCP/tooling, supervision, security, CI/CD integration, evaluation, and operations.

### 2) Question blueprint (100 total)
- **Domain A: Agent architecture + SDLC integration** (20)
- **Domain B: MCP/tool use + environment permissions** (25)
- **Domain C: Governance, safety, and policy controls** (20)
- **Domain D: Evaluation, telemetry, and tuning** (20)
- **Domain E: Multi-agent orchestration + incident response** (15)

### 3) Difficulty and realism profile
- **70 scenario MCQs** (single best answer; 4 options)
- **20 multi-select** (2–3 correct answers; partial-credit style in review mode)
- **10 sequence/order or matching** (workflow ordering under constraints)
- Include long case stems with logs, policy snippets, CI output, and agent transcripts.

### 4) Authoring standards for tough, fair questions
- Each question must contain:
  - Role context (developer/platform/security/ops)
  - Constraints (budget, compliance, branch policy, latency/SLA, blast radius)
  - One clearly best answer + rationale
  - Plausible distractors tied to common mistakes (over-permissioning, weak guardrails, missing human-in-loop, bad rollback design)
- Require applied reasoning over memorization.

### 5) Anti-bias rule for answer choices (critical)
- **Do not let the longest option be correct by default.**
- Enforce distribution over 100 questions:
  - Correct option positions: A/B/C/D each ~25%
  - Correct option length rank (short/medium/longest) balanced; longest ≤ 30%
  - Use concise but specific correct answers; keep distractors equally polished

### 6) Generation workflow
1. Define a skills matrix (sub-skills per domain).
2. Draft 2x question pool (200 items) to allow curation.
3. Run quality gate:
   - no duplicate stems
   - no giveaway wording (“always”, “never”) unless objectively true
   - no answer-length leakage
4. Select final 100 by domain/format/difficulty targets.
5. Add explanations:
   - why correct
   - why each distractor is wrong
   - references to docs/objective tags.

### 7) Scoring and study loops
- Timed full exam mode: 120 minutes / 100 questions.
- Adaptive review mode:
  - weak-domain drills
  - mistake replay
  - confidence tracking (user marks certainty before submit).
- Analytics:
  - accuracy by domain/sub-skill
  - average response time by item type
  - distractor attraction rate (which wrong options are most tempting).

### 8) Release plan (phased)
- **Phase 1:** 30 validated questions + scoring + explanations
- **Phase 2:** Expand to 70 with analytics and anti-bias checks
- **Phase 3:** Reach 100, run 2 full mock exams, tune weak areas

### 9) Acceptance criteria
- 100 questions delivered with target domain mix.
- Difficulty calibrated so experienced users are challenged.
- Anti-bias metrics met (no systematic longest-answer advantage).
- Every question includes explanation and objective tag(s).

---

## Official source repositories (curated, trusted only)

No dedicated official GH-600 question bank exists yet. Use only these verified GitHub/Microsoft repos as primary research material. Avoid braindump-style prep sites — low-trust for a beta exam.

| Priority | Repository | Why it matters for GH-600 |
|----------|-----------|--------------------------|
| 1 | [github-samples/agents-in-sdlc](https://github.com/github-samples/agents-in-sdlc) | Guided workshop: Copilot Agent Mode, coding agent, Copilot instructions, SDLC agent collaboration — directly maps to Domains A & E |
| 2 | [skills/integrate-mcp-with-copilot](https://github.com/skills/integrate-mcp-with-copilot) | GitHub Skills exercise: MCP server integration, Agent Mode, issues → PR workflow — core for Domain B |
| 3 | [github/github-mcp-server](https://github.com/github/github-mcp-server) | GitHub's official MCP Server: setup, tools, toolsets, repos, issues, PRs, Actions, code security — authoritative for MCP/permissions/tool-scope questions |
| 4 | [github/awesome-copilot](https://github.com/github/awesome-copilot) | Community-contributed (treat as illustrative, not canonical): custom agents, instructions, skills, hooks, workflows, MCP references, Learning Hub |
| 5 | [github-samples/copilot-in-a-box](https://github.com/github-samples/copilot-in-a-box) | GitHub DevRel hub: links to samples, walkthroughs, videos, MCP exercise, agents-in-SDLC workshop |
| 6 | [github/copilot-sdk](https://github.com/github/copilot-sdk) | Public preview SDK: programmable agent workflows, tool invocation, custom agents, skills, MCP, hooks, permission handling |
| 7 | [skills/getting-started-with-github-copilot](https://github.com/skills/getting-started-with-github-copilot) | Copilot basics: interaction modes, planning, PR summarization, review, Codespaces — use to confirm foundational coverage |
| 8 | [github-samples/pets-workshop](https://github.com/github-samples/pets-workshop) | Broader DevOps context: Copilot, Actions, Codespaces, GHAS, secure workflows — useful for SDLC/CI/CD and security framing |
| 9 | [microsoft/mcp-for-beginners](https://github.com/microsoft/mcp-for-beginners) | Official Microsoft MCP curriculum: server/client patterns, fundamentals — use after #2 and #3 |
| 10 | [microsoft/ai-agents-for-beginners](https://github.com/microsoft/ai-agents-for-beginners) | Microsoft agent design patterns: planning, tool use, agentic RAG, multi-agent concepts — conceptual reinforcement only |

### How source repos map to question domains

| Domain | Primary sources | Secondary sources |
|--------|----------------|-------------------|
| A — Agent architecture + SDLC | #1 agents-in-sdlc, #5 copilot-in-a-box | #8 pets-workshop, #10 ai-agents-for-beginners |
| B — MCP / tool use / permissions | #3 github-mcp-server, #2 integrate-mcp-with-copilot | #6 copilot-sdk, #9 mcp-for-beginners |
| C — Governance, safety, policy | #3 github-mcp-server, #6 copilot-sdk | #4 awesome-copilot, #8 pets-workshop |
| D — Evaluation, telemetry, tuning | #1 agents-in-sdlc, #6 copilot-sdk | #10 ai-agents-for-beginners |
| E — Multi-agent orchestration | #1 agents-in-sdlc, #6 copilot-sdk | #9 mcp-for-beginners, #10 ai-agents-for-beginners |
