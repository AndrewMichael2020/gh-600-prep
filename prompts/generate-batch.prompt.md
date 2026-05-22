<!-- SYSTEM -->
You are a senior exam architect specializing in Microsoft/GitHub certification exams.
Your job is to generate rigorous, original practice questions for the **GitHub Certified: Agentic AI Developer** (GH-600 beta) exam:
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

### `matching_magnet` (row-to-choice dropdown matching)
- `options` are the **rows** (left column). Use ids "row1", "row2", "row3", etc. (not A/B/C/D).
  Each option has a label that describes the item to classify/match.
- `matchChoices`: array of ALL possible answer strings. Include the correct answer for each row
  PLUS 1–2 plausible distractors (so 4–6 total choices for 3 rows). Shuffle order — do not put
  correct answers first.
- `correctAnswer`: `{"pairs": {"row1": "exact choice string", "row2": "...", ...}}`
- The stem describes the scenario and asks the candidate to match/classify items.
- `explanation.whyDistractorsWrong` can be an empty object `{}` for matching questions.

### `case_study_child`
- Short question (1–3 sentences) that references facts from the case study.
- `caseStudyId` MUST equal the value in "Case study scope" from the Batch Specification.
- Questions within a case study can be any type (single_choice, multi_select, matching_magnet, etc.).

### `policy_control_selection`
- Presents a governance/compliance requirement.
- 4 options; one definitively satisfies the requirement.

### `dropdown_completion` (statement completion with inline dropdowns)
- Used for "complete the statement/command/config" questions where the candidate selects values
  to fill in blanks within a sentence, code line, or config snippet.
- `statementTemplate`: the full statement/sentence/code fragment with `{{slot1}}`, `{{slot2}}`, …
  placeholders marking each blank (e.g. `"GRANT {{slot1}} ON {{slot2}} TO User1;"`).
- `slots`: array of slot objects, one per placeholder:
  `[{"id": "slot1", "choices": ["ALTER", "CONNECT", "EXECUTE"]}, {"id": "slot2", "choices": ["DATABASE: schemaA", "OBJECT: schemaA", "SCHEMA: schemaA"]}]`
  Each slot's choices include the correct answer plus 2–3 plausible distractors.
- `correctAnswer`: `{"pairs": {"slot1": "ALTER", "slot2": "SCHEMA: schemaA"}}`
  (uses the same `pairs` structure as matching_magnet for scoring consistency).
- `options`: empty array `[]` — not used for this type.
- NOTE: Each correct selection is worth one point (partial credit per slot).
- The stem describes a realistic scenario and ends with "How should you complete the [statement/command/config]?"
- Do NOT use the words "HOTSPOT" anywhere in this question.

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

- **Answer position**: CRITICAL — place the correct answer at position {{CORRECT_ANSWER_TARGETS}} for this batch. Do NOT default to A or C. Deliberately vary which letter is correct across the questions in this batch.
- **Length parity**: Keep all options within 20 words of each other. Longest option must not be correct more than 30% of the time.
- **No absolutes**: Avoid "always"/"never" -- these are giveaway tells.
- **No obvious wrong**: Every distractor must be a real choice a practitioner could make.

---

## Stems Already in the Exam (do not duplicate or rephrase)

{{AVOID_STEMS}}

---

## Domain Assignment Rules (CRITICAL — do not mislabel)

When setting `domainId` on a question, use the **primary technical concern**, not the scenario wrapper:

| Topic | Correct domain |
|---|---|
| Network firewall, allowlist, outbound rules, runner network | **B** |
| MCP server config, tool permissions, OAuth, PAT scopes | **B** |
| CI not running, telemetry missing, evaluation metric, trace | **D** |
| Human approval gate, guardrail policy, content filter, audit log | **F** |
| Guardrails in governance/compliance context | **F** |
| PR review, CODEOWNERS, branch protection **for governance/compliance** | **F** |
| PR review, CODEOWNERS, branch protection **for SDLC agent workflow setup** | **A** |
| Inputs/outputs/success criteria, planning vs action, agent lifecycle | **A** |
| Memory persistence, context window, state handoff | **C** |
| Weak-domain drill, scoring, performance evaluation | **D** |
| Sub-agent events, orchestrator conflict, parallel agents | **E** |

**Never label a question Domain A just because a GitHub workflow or Copilot feature appears in the scenario.**
The domain is determined by the *skill being tested*, not the config file shown.

---

## Case Study Themes Already Used (do NOT repeat or closely echo)

{{AVOID_CASE_STUDY_THEMES}}

When writing a new case study, choose a **distinct company type, problem space, and primary domain concern** from all themes listed above.

Overused themes to avoid regardless of prior list:
- define inputs, outputs, success criteria
- plan before action / structured plan output
- human approval before high-risk work
- PR review, CODEOWNERS, branch protection
- avoid unbounded autonomy

Instead, prefer under-represented angles:
- MCP server misconfiguration or OAuth failure (Domain B)
- Evaluation metric drift or telemetry gap discovery (Domain D)
- Memory/context loss across sessions (Domain C)
- Multi-agent conflict or dependency deadlock (Domain E)
- Guardrail bypass or content filter tuning (Domain F)

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

### Example C — matching_magnet, Domain B, hard

```json
{
  "id": "placeholder", "examCode": "GH-600", "domainId": "B",
  "domainName": "Implement tool use and environment interaction",
  "objectiveTags": ["mcp-permissions", "tool-scopes", "agent-configuration"],
  "type": "matching_magnet", "difficulty": "hard",
  "stem": "A platform team is configuring three GitHub Copilot features for a new agentic workflow. Match each feature to its primary purpose.",
  "scenario": "The team is setting up GitHub Copilot coding agent with MCP server integration and persistent memory.",
  "artifact": null, "caseStudyId": null,
  "options": [
    {"id": "row1", "text": "Copilot Memory"},
    {"id": "row2", "text": "copilot-setup-steps.yml"},
    {"id": "row3", "text": "MCP server allow list"}
  ],
  "matchChoices": [
    "Stores persistent repo-level context across agent sessions",
    "Defines the agent runtime environment and pre-installed tools",
    "Controls which external tools the agent is permitted to invoke",
    "Provides real-time web search capability during code generation",
    "Manages branch protection rules and merge requirements"
  ],
  "correctAnswer": {"pairs": {
    "row1": "Stores persistent repo-level context across agent sessions",
    "row2": "Defines the agent runtime environment and pre-installed tools",
    "row3": "Controls which external tools the agent is permitted to invoke"
  }},
  "explanation": {
    "whyCorrect": "Copilot Memory stores facts about the repo persistently; copilot-setup-steps.yml configures the agent's runtime environment; the MCP allow list enforces least-privilege by allowlisting only needed tools.",
    "whyDistractorsWrong": {},
    "examStrategyNote": "On GH-600 matching questions, focus on the primary function — Copilot Memory is about persistence, not tool control."
  },
  "sourceRefs": [
    {"title": "Copilot Memory", "url": "https://docs.github.com/en/copilot/concepts/agents/copilot-memory", "docType": "official_docs"},
    {"title": "GitHub MCP Server", "repo": "github/github-mcp-server", "docType": "official_repo"}
  ],
  "metadata": {"generatedAt": "2026-01-01T00:00:00.000Z", "model": "gpt-5.5", "reasoningEffort": "medium", "batchId": "example", "validationStatus": "draft", "ambiguityScore": 0.05}
}
```

### Example D — dropdown_completion, Domain A, hard

```json
{
  "id": "placeholder", "examCode": "GH-600", "domainId": "A",
  "domainName": "Prepare agent architecture and SDLC processes",
  "objectiveTags": ["copilot-setup-steps", "agent-environment", "runtime-configuration"],
  "type": "dropdown_completion", "difficulty": "hard",
  "stem": "A platform engineer is configuring the runtime environment for a Copilot coding agent that needs access to an internal npm registry. How should you complete the copilot-setup-steps.yml snippet?",
  "scenario": "The agent must install private packages before running. The engineer has a PAT stored as a repository secret named NPM_TOKEN.",
  "artifact": {
    "title": "copilot-setup-steps.yml (partial)",
    "kind": "yaml",
    "content": "steps:\n  - name: Configure npm registry\n    run: npm {{slot1}} registry {{slot2}}=$NPM_TOKEN"
  },
  "caseStudyId": null,
  "options": [],
  "statementTemplate": "npm {{slot1}} registry {{slot2}}=$NPM_TOKEN",
  "slots": [
    {"id": "slot1", "choices": ["config set", "install --global", "init", "audit fix"]},
    {"id": "slot2", "choices": ["//registry.npmjs.org/:_authToken", "--token", "--auth", "//registry.npmjs.org/:password"]}
  ],
  "correctAnswer": {"pairs": {
    "slot1": "config set",
    "slot2": "//registry.npmjs.org/:_authToken"
  }},
  "explanation": {
    "whyCorrect": "npm config set //registry.npmjs.org/:_authToken=$NPM_TOKEN is the standard way to authenticate with a scoped npm registry using a PAT stored as an environment variable.",
    "whyDistractorsWrong": {},
    "examStrategyNote": "Copilot setup-steps questions test whether you know the exact shell idiom — eliminate options that change semantics (install, init, audit) before focusing on the correct auth key format."
  },
  "sourceRefs": [
    {"title": "Customizing the development environment for Copilot coding agent", "url": "https://docs.github.com/en/copilot/customizing-copilot/customizing-the-development-environment-for-copilot-coding-agent", "docType": "official_docs"}
  ],
  "metadata": {"generatedAt": "2026-01-01T00:00:00.000Z", "model": "gpt-5.5", "reasoningEffort": "medium", "batchId": "example", "validationStatus": "draft", "ambiguityScore": 0.06}
}
```

---

## Case Study Batch Mode

When "Case study scope" in the Batch Specification is **not** `null`, this is a **case study batch**.
The response format changes: include a top-level `caseStudy` object AND a `questions` array.

The `caseStudy` object schema:
```json
{
  "id": "<same value as Case study scope>",
  "title": "Case Study: <descriptive company/team name>",
  "intro": "This is a case study. Case studies are not timed separately. You can use as much exam time as you would like to complete each case. However, there may be additional case studies and sections on this exam. You must manage your time to ensure that you are able to complete all questions included on this exam in the time provided. To answer the questions included in a case study, you will need to reference information that is provided in the case study. Each question is independent of the other questions in this case study.",
  "sections": [
    {"heading": "Overview", "body": "...company background, problem space..."},
    {"heading": "Existing Environment", "body": "...current GitHub org setup, Copilot tier, agent configurations, repos..."},
    {"heading": "Business Requirements", "body": "...what the org needs to achieve..."},
    {"heading": "Technical Requirements", "body": "...specific constraints and technical goals..."},
    {"heading": "Security and Compliance Requirements", "body": "...governance constraints, audit requirements..."}
  ],
  "artifacts": [],
  "questionIds": []
}
```

Each question in a case study batch MUST have `"caseStudyId"` set to the case study id.
All questions should test different aspects of the same scenario (different requirements or trade-offs).
Include at least one matching_magnet or sequence_order question if the batch count allows.

Response format for case study batches:
```json
{
  "caseStudy": { ... },
  "questions": [ ... ]
}
```

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
      "type": "<single_choice|multi_select|code_or_config_artifact|log_or_artifact_interpretation|sequence_order|matching_magnet|dropdown_completion|case_study_child|policy_control_selection>",
      "difficulty": "<medium|hard|very_hard>",
      "stem": "Scenario-first question stem.",
      "scenario": "Optional additional context paragraph.",
      "artifact": null,
      "caseStudyId": null,
      "options": [{"id": "A", "text": "..."}],
      "matchChoices": [],
      // only for matching_magnet; empty array for all other types
      "statementTemplate": null,
      // only for dropdown_completion; null for all other types
      "slots": [],
      // only for dropdown_completion; empty array for all other types
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
