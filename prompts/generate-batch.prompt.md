<!-- SYSTEM -->
You are a senior exam architect specializing in Microsoft/GitHub certification exams.
Your job is to generate rigorous, original practice questions for the GH-600 beta exam:
"Developing in Agentic AI Systems."

You have web search available. USE IT to:
- Verify claims against official docs before including them in questions or explanations
- Look up the exact current behavior of GitHub Copilot features (Copilot Memory, cloud agent, MCP, custom agents)
- Confirm specific configuration syntax (copilot-setup-steps.yml, .github/agents/*.agent.md, MCP allow lists)
- Cross-check against: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600
  and https://docs.github.com/en/copilot

Core principles you never violate:
- Output **only valid JSON** -- no markdown fences, no prose, no explanation outside the JSON.
- Every question tests **judgment and decision-making**, not pure recall of definitions.
- Every stem presents a **realistic scenario** before posing the question.
- Every correct answer is **defensible from official GitHub or Microsoft documentation** (cite the URL in sourceRefs).
- Every distractor represents a **real mistake teams actually make** -- never an obviously wrong straw man.
- You **never claim** a question is from the real exam.
<!-- END_SYSTEM -->

## Batch Specification

- Domain: {{DOMAIN_ID}} -- {{DOMAIN_NAME}}
- Item types to generate: {{ITEM_TYPES}}
- Difficulty band: {{DIFFICULTIES}}
- Questions to generate: {{QUESTION_COUNT}}
- Batch ID: {{BATCH_ID}}
- Case study scope: {{CASE_STUDY_ID}}

---

## Domain Knowledge for Domain {{DOMAIN_ID}}

{{DOMAIN_KNOWLEDGE}}

---

## Item Type Formatting Guide

### `single_choice`
- 4 options (A, B, C, D). Exactly one correct.
- `correctAnswer`: single string, e.g. `"C"`
- Options must be **similar in length** (within 15 words of each other).

### `multi_select`
- 5 or 6 options (A-E or A-F). Exactly 2 or 3 correct.
- The stem **must state** the exact count: "Select TWO" or "Select THREE".
- `correctAnswer`: array of strings, e.g. `["B", "D"]`
- All wrong options must be individually plausible.

### `code_or_config_artifact`
- Presents a realistic YAML, JSON, bash, or TypeScript snippet in the `artifact` field.
- Use real GitHub config files (copilot-setup-steps.yml, .github/workflows/, mcp.json, etc.).
- `artifact.kind`: one of `yaml | json | bash | typescript | log | policy | pr_diff | workflow_output`
- Stem asks candidate to evaluate, fix, or select based on the artifact.

### `log_or_artifact_interpretation`
- Presents a realistic log, trace, or telemetry output in the `artifact` field.
- `artifact.kind`: typically `log`, `workflow_output`, or `terminal_output`
- Stem asks candidate to diagnose, interpret, or recommend action from the artifact.

### `sequence_order`
- Options are steps (option text = the step description).
- `correctAnswer`: object with key "order": array of option IDs in correct sequence, e.g. `{"order": ["C","A","D","B"]}`

### `matching_magnet`
- Options are left-side categories to match against right-side items.
- `correctAnswer`: object with key "pairs": map of optionId to matched item string.

### `case_study_child`
- Short question (1-3 sentences) referencing the case study.
- `caseStudyId` must be set to the value in the Batch Specification.

### `policy_control_selection`
- Presents a governance/compliance requirement.
- 4 options; one definitively satisfies the requirement.

---

## Quality Rubric

Every question must satisfy all five criteria:

1. **Scenario-first** -- Stem starts with a realistic situation before asking the question.
2. **Judgment-based** -- Tests decisions and trade-offs, never "define X".
3. **Defensible** -- Correct answer traceable to official GitHub/Microsoft docs; cite in `sourceRefs`.
4. **Plausible distractors** -- Wrong options represent real mistakes: over-permissioning, reactive
   instead of proactive, adding complexity instead of using the right feature, monitoring over prevention.
5. **Exam strategy note** -- `examStrategyNote` gives a meta-hint about this class of GH-600 question.

---

## Anti-Bias Rules (enforced automatically)

- **Answer position**: Spread correct answers across A/B/C/D. Target distribution: {{CORRECT_ANSWER_TARGETS}}
- **Length parity**: Keep all options within 20 words of each other. Longest option must not be correct more than 30% of the time.
- **No absolutes**: Avoid "always"/"never" -- these are giveaway tells.
- **No obvious wrong**: Every distractor must be a real choice a practitioner could make.

---

## Stems Already in the Exam (do not duplicate or rephrase)

{{AVOID_STEMS}}

---

## Worked Examples (quality bar -- do not reproduce)

### Example A -- single_choice, Domain B, hard

```json
{
  "id": "placeholder", "examCode": "GH-600", "domainId": "B",
  "domainName": "MCP/tool use and environment permissions",
  "objectiveTags": ["mcp-permissions", "least-privilege", "tool-scope-audit"],
  "type": "single_choice", "difficulty": "hard",
  "stem": "A security audit finds that a Copilot agent configured via the GitHub MCP Server has write access to the organization's secrets management tool, although its only assigned task is generating weekly dependency update PRs. The agent has not yet accessed production secrets. What is the correct immediate action?",
  "scenario": "The MCP configuration was copied from a template with broad tool access. The security team must act before the next agent run in 4 hours.",
  "artifact": null, "caseStudyId": null,
  "options": [
    {"id": "A", "text": "Enable enhanced logging on the secrets tool and monitor the next agent run before making permission changes."},
    {"id": "B", "text": "Restrict the MCP configuration to read-only source-management scopes only, and add the secrets tool to the denylist immediately."},
    {"id": "C", "text": "Pause all agent runs for 30 days while conducting a full permission audit across the organization."},
    {"id": "D", "text": "Replace the GitHub MCP Server with a custom proxy that intercepts and logs all secrets tool invocations."}
  ],
  "correctAnswer": "B",
  "explanation": {
    "whyCorrect": "Applying least-privilege by removing write access and denylisting the unneeded secrets tool is the correct immediate action -- proactive scoping eliminates the threat window before the next run.",
    "whyDistractorsWrong": {
      "A": "Monitoring before acting is reactive -- it leaves the over-privileged scope active through the next run.",
      "C": "A 30-day pause blocks all legitimate agent work without addressing the root cause: the misconfigured scope.",
      "D": "Building a custom proxy adds significant delay without solving the underlying permission problem."
    },
    "examStrategyNote": "On GH-600 permission questions, the correct answer almost always enforces least-privilege proactively. Options that monitor first or add infrastructure instead of removing scope are distractors."
  },
  "sourceRefs": [
    {"title": "GitHub MCP Server", "repo": "github/github-mcp-server", "docType": "official_repo"},
    {"title": "Integrate MCP with Copilot", "repo": "skills/integrate-mcp-with-copilot", "docType": "official_repo"}
  ],
  "metadata": {"generatedAt": "2026-01-01T00:00:00.000Z", "model": "gpt-5.5", "reasoningEffort": "medium", "batchId": "example", "validationStatus": "draft", "ambiguityScore": 0.05}
}
```

### Example B -- multi_select, Domain E, very_hard

```json
{
  "id": "placeholder", "examCode": "GH-600", "domainId": "E",
  "domainName": "Multi-agent orchestration and incident response",
  "objectiveTags": ["multi-agent-conflict", "orchestrator-worker", "dependency-graph"],
  "type": "multi_select", "difficulty": "very_hard",
  "stem": "Two Copilot agents are working in parallel on the same repository. Agent-1 is renaming a core API method across 34 files. Agent-2 is adding integration tests that call the current method name. Both have open draft PRs and the orchestration layer detects a dependency conflict. Select TWO actions the orchestrator should take.",
  "scenario": "The policy requires zero broken-build PRs. Cancelling both agents would lose 2 hours of compute.",
  "artifact": null, "caseStudyId": null,
  "options": [
    {"id": "A", "text": "Merge both draft PRs immediately and rely on the CI pipeline to surface the conflict after the fact."},
    {"id": "B", "text": "Suspend Agent-2 and signal it to wait for Agent-1's rename changes to be committed to the shared context."},
    {"id": "C", "text": "Emit a conflict event to Agent-2's task queue so it can rebase its test changes against Agent-1's in-progress rename."},
    {"id": "D", "text": "Cancel both agents and restart the combined task as a single sequential agent to eliminate all parallelism risk."},
    {"id": "E", "text": "Lock the affected files in Agent-2's working branch to prevent further writes until Agent-1 completes its rename pass."}
  ],
  "correctAnswer": ["B", "C"],
  "explanation": {
    "whyCorrect": "Suspending Agent-2 (B) prevents additional conflicting writes. Emitting a conflict event (C) gives Agent-2 the dependency signal needed to rebase -- the standard orchestrator-worker conflict resolution pattern.",
    "whyDistractorsWrong": {
      "A": "Merging conflicting PRs guarantees a broken build, directly violating the zero-broken-build policy.",
      "D": "Cancelling both agents discards 2 hours of valid work that can be preserved through dependency signalling.",
      "E": "Locking files blocks progress without giving Agent-2 the contextual information needed to resume correctly."
    },
    "examStrategyNote": "Multi-agent orchestration questions reward answers that preserve work, signal dependencies explicitly, and avoid both merge-immediately and cancel-all extremes."
  },
  "sourceRefs": [
    {"title": "Agents in SDLC", "repo": "github-samples/agents-in-sdlc", "docType": "official_repo"},
    {"title": "AI Agents for Beginners", "repo": "microsoft/ai-agents-for-beginners", "docType": "official_repo"}
  ],
  "metadata": {"generatedAt": "2026-01-01T00:00:00.000Z", "model": "gpt-5.5", "reasoningEffort": "medium", "batchId": "example", "validationStatus": "draft", "ambiguityScore": 0.08}
}
```

---

## Output Schema

```json
{
  "questions": [
    {
      "id": "placeholder",
      "examCode": "GH-600",
      "domainId": "{{DOMAIN_ID}}",
      "domainName": "{{DOMAIN_NAME}}",
      "objectiveTags": ["tag1", "tag2"],
      "type": "<single_choice|multi_select|code_or_config_artifact|log_or_artifact_interpretation|sequence_order|matching_magnet|case_study_child|policy_control_selection>",
      "difficulty": "<medium|hard|very_hard>",
      "stem": "Scenario-first question stem.",
      "scenario": "Optional additional context paragraph.",
      "artifact": null,
      "caseStudyId": null,
      "options": [{"id": "A", "text": "..."}],
      "correctAnswer": "B",
      "explanation": {
        "whyCorrect": "Why correct, citing principle or doc.",
        "whyDistractorsWrong": {"A": "Why A is wrong.", "C": "...", "D": "..."},
        "examStrategyNote": "Meta-hint for this class of GH-600 question."
      },
      "sourceRefs": [{"title": "...", "repo": "org/repo", "docType": "official_repo"}],
      "metadata": {
        "generatedAt": "{{TIMESTAMP}}",
        "model": "{{MODEL}}",
        "reasoningEffort": "{{REASONING_EFFORT}}",
        "batchId": "{{BATCH_ID}}",
        "validationStatus": "draft",
        "ambiguityScore": 0.1
      }
    }
  ]
}
```

Generate exactly {{QUESTION_COUNT}} questions for domain {{DOMAIN_ID}}. Return JSON only.
