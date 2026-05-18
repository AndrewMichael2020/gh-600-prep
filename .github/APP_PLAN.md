# GH-600 Prep App Plan (Restored from Original Issue #2)

This file restores the original detailed plan content as the canonical planning reference for this repository.

- Source of truth: the original **Issue #2** specification (before later refinement/implementation PRs).
- Intent: preserve product principles, architecture, schema, pipeline, UX requirements, and phased delivery criteria exactly as planning guidance.

---

## Restored original Issue #2 plan

# Issue #2: Refine and implement GH-600 practice exam app architecture

## Goal

Build a personal GH-600 beta practice app that generates, stores, reviews, and presents high-quality Microsoft/GitHub-style certification practice questions.

The number of questions must be configurable. The app should support 30, 70, 100, or any custom number of questions, rather than assuming a fixed 100-question exam.

The app must avoid generating the entire exam in one model call. It should split generation intelligently by domain, item type, difficulty, and case-study grouping, then validate and assemble the final practice set.

## Context

This repo is for preparing for GH-600 beta: Developing in Agentic AI Systems.

The app should simulate the pressure and style of tough Microsoft/GitHub certification exams such as DP-600, DP-700, AI-100-style exams, and GitHub certification questions.

It should focus on:

- Agent architecture and SDLC integration
- MCP/tool use and environment permissions
- Governance, safety, policy controls, and accountability
- Evaluation, telemetry, error analysis, and tuning
- Multi-agent orchestration and incident response
- GitHub Copilot cloud agent, custom agents, GitHub MCP server, Actions, issues, pull requests, reviews, and auditability

Use the existing repo plan as the source of intent. Preserve the current emphasis on tough, fair, scenario-first questions.

## Important product principle

This is not a braindump app.

It must generate defensible, original study questions based on public documentation, official GitHub/Microsoft repos, and the GH-600 skills outline. It should not scrape or reproduce real exam questions.

## Model/API direction

Use the OpenAI API through the Responses API.

Use a configurable model setting, with default:

```json
{
  "model": "gpt-5.5",
  "reasoning": {
    "effort": "medium"
  }
}
```

Recommended model usage pattern:

Use gpt-5.5 with reasoning.effort = "medium" for normal question generation.
Use gpt-5.5 with reasoning.effort = "high" or "xhigh" for quality review, ambiguity detection, and final adjudication.
Allow the model name and reasoning effort to be changed through environment variables or config.
Do not expose the API key in frontend code.
Store the API key server-side only.

Suggested environment variables:

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=medium
OPENAI_REVIEW_REASONING_EFFORT=high

## Core user stories

### 1. Generate a practice exam

As a user, I want to specify the number of questions, so that I can generate a short drill, a medium practice set, or a full exam.

Inputs:

- Total number of questions
- Optional exam mode:
  - Full exam
  - Domain drill
  - Case-study drill
  - Weakness review
- Optional difficulty:
  - Mixed
  - Hard only
  - Extreme Microsoft-style ambiguity
- Optional selected domains

Example:

Generate 100 GH-600-style questions.
Use official GH-600 domain weighting.
Include case studies, multi-select, matching, sequence/order, and code/config artifact questions.

### 2. Generate in batches, not one shot

As a user, I want the app to split generation into planned batches, so that question quality is higher and the model does not lose structure.

The app should generate questions in logical batches:

- By domain
- By item type
- By case study
- By difficulty band

Example for 100 questions:

- Batch 1: Domain A standalone questions
- Batch 2: Domain B standalone questions
- Batch 3: Domain C/D governance and evaluation questions
- Batch 4: Domain E multi-agent questions
- Batch 5: Case study 1
- Batch 6: Case study 2
- Batch 7: Matching/sequence/code artifact questions
- Batch 8: Review and anti-bias validation
- Batch 9: Final assembly

Each batch should produce structured JSON, not raw markdown.

### 3. Review answers with collapsible explanations

As a user, I want answers hidden by default, with explanations that can be toggled open and closed.

For each question, the review screen must support:

- Show/hide correct answer
- Show/hide explanation
- Show/hide why each distractor is wrong
- Show/hide source/objective tags
- Mark as:
  - Got it
  - Review again
  - Weak area
  - Ambiguous or questionable

UI behavior:

- During exam mode, do not show explanations until submission.
- During review mode, allow immediate feedback.
- Explanations should be inside collapsible panels/details sections.
- For multi-select questions, explain each selected and unselected option.

### 4. Simulate Microsoft/GitHub exam item types

As a user, I want the app to simulate the feel of Microsoft/GitHub exams, not just simple quiz cards.

Required item types:

- Single-answer multiple choice
- Multi-select
- Case study with multiple linked questions
- Sequence/order question
- Matching / “magnet-style” question
- Code/config snippet selection
- Log/artifact interpretation
- Policy/control selection

For “magnet-style” questions, implement a practical web equivalent:

- Left column: prompts/categories
- Right column: draggable or clickable answer cards
- User maps each card to the correct target
- Store answer as structured pairs

If drag-and-drop is expensive in Phase 1, implement click-to-match first and add true drag-and-drop later.

### 5. Case studies

The app should support configurable case studies.

Recommended default for a 100-question exam:

- 4 case studies
- 4 questions per case study
- 16 total case-study questions

For a smaller 30-question exam:

- 1 or 2 case studies
- 3–4 questions per case study

For a 70-question exam:

- 3 case studies
- 4 questions per case study

Case-study examples:

- Case Study A: Regulated healthcare repo
- Case Study B: MCP-enabled development platform
- Case Study C: Multi-agent refactor
- Case Study D: Evaluation failure

## Domain weighting

Implement a domain blueprint system.

Use this default 100-question blueprint:

```json
{
  "total_questions": 100,
  "domains": [
    { "id": "A", "name": "Agent architecture and SDLC integration", "count": 18 },
    { "id": "B", "name": "MCP/tool use and environment permissions", "count": 23 },
    { "id": "C", "name": "Memory, state, and execution", "count": 12 },
    { "id": "D", "name": "Evaluation, telemetry, error analysis, and tuning", "count": 17 },
    { "id": "E", "name": "Multi-agent orchestration and incident response", "count": 18 },
    { "id": "F", "name": "Guardrails, safety, accountability, and governance", "count": 12 }
  ]
}
```

The app should scale these proportions when the user chooses a different question count.

## Item type blueprint

Use this default for 100 questions:

```json
{
  "single_choice": 42,
  "multi_select": 18,
  "sequence_order": 10,
  "matching_magnet": 8,
  "case_study": 16,
  "code_or_config_artifact": 6
}
```

For smaller exams, scale down intelligently.

Rules:

- Always include at least one case study if total questions >= 25.
- Always include at least one code/config artifact question if total questions >= 20.
- Always include multi-select if total questions >= 10.
- For very small drills, prioritize single-choice and multi-select.

## Question data model

(Use the TypeScript model from the original Issue #2 specification.)

## Case study data model

(Use the TypeScript model from the original Issue #2 specification.)

## Generation pipeline

1. Build blueprint
2. Generate source-grounded skill matrix
3. Generate question batches
4. Validate each batch
5. Assemble exam
6. Save generated exam

## Anti-bias rules

- Correct answer positions should be roughly balanced.
- For 4-option MCQs, A/B/C/D should each be close to 25%.
- Longest option should be correct no more than 30% of the time.
- Distractors must be similar in length and specificity.
- Avoid cheap trick questions and ambiguous dual-defensible answers.

## Exam mode

- Timed mode with scaled duration: `time_minutes = question_count * 1.2`
- Hide answers until submit
- Flagging and navigation
- Final score + domain breakdown

## Review mode

- Immediate feedback mode
- Collapsible explanations
- Collapsible distractor explanations
- Filtering and confidence tracking

## Analytics

Track overall score, domain/item-type/difficulty breakdown, response timing, flagged counts, confidence correlation, distractor attraction, and weak objective tags.

## Backend/API requirements

- POST /api/exams/blueprint
- POST /api/questions/generate-batch
- POST /api/questions/validate-batch
- POST /api/exams/assemble
- POST /api/attempts
- GET /api/attempts/:id
- GET /api/exams/:id

## Prompt templates

- /prompts/blueprint.prompt.md
- /prompts/generate-batch.prompt.md
- /prompts/generate-case-study.prompt.md
- /prompts/validate-question.prompt.md
- /prompts/anti-bias-review.prompt.md
- /prompts/assemble-exam.prompt.md
- /prompts/weakness-drill.prompt.md

## Phase delivery plan

- Phase 1: working vertical slice (configurable count, batched generation, persistence, exam/review/score/domain breakdown)
- Phase 2: matching/sequence completion, deeper analytics, anti-bias dashboard, weakness drills, confidence/flagging
- Phase 3: full exam operations and export workflows

## Acceptance criteria

The PR is accepted when configurable batched generation, server-side-only key handling, structured JSON questions, review toggles, core item types, and score/domain reporting are all in place, with README setup/run guidance and phase limitations documented.
