# gh-600-prep

Preparing for GH-600 (beta).

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
