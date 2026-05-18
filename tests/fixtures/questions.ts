/**
 * Test fixture questions — one per domain (A–F).
 *
 * These are used ONLY by unit tests that need PracticeQuestion objects to
 * exercise exam mechanics (assembly, scoring, validation). They are never
 * served to users; real questions come exclusively from `npm run generate`.
 */

import { PracticeQuestion } from "../../src/types.js";

export const FIXTURE_QUESTIONS: PracticeQuestion[] = [
  {
    id: "fixture-A-1",
    examCode: "GH-600",
    domainId: "A",
    domainName: "Prepare agent architecture and SDLC processes",
    objectiveTags: ["copilot-agent", "branch-protection", "human-in-the-loop"],
    type: "single_choice",
    difficulty: "medium",
    stem: "A development team wants to integrate GitHub Copilot coding agent into their PR review workflow. Which configuration approach best preserves human oversight while enabling automation?",
    scenario:
      "The team has branch protection rules requiring at least two human approvals before merge. They want Copilot agent to handle routine refactors but flag architectural changes for human review.",
    options: [
      { id: "A", text: "Disable branch protection rules to allow the agent to merge automatically when tests pass." },
      { id: "B", text: "Configure copilot-setup-steps.yml to scope agent permissions to read-only and surface a summary PR for human review before any merge." },
      { id: "C", text: "Grant the agent maintainer role so it can bypass required reviews in urgent scenarios." },
      { id: "D", text: "Route all agent suggestions through a separate auto-merge bot that overrides protection rules." },
    ],
    correctAnswer: "B",
    explanation: {
      whyCorrect: "Scoping agent permissions via copilot-setup-steps.yml and surfacing a summary PR preserves human oversight while enabling automation.",
      whyDistractorsWrong: {
        A: "Disabling branch protection removes a critical safety gate.",
        C: "Granting maintainer role violates least-privilege and bypasses required reviews.",
        D: "An auto-merge bot that overrides protections undermines governance.",
      },
      examStrategyNote: "On GH-600, prioritize answers that enforce least-privilege and preserve human oversight.",
    },
    sourceRefs: [{ title: "Prepare custom agents", url: "https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/prepare-for-custom-agents", docType: "official_docs" }],
    metadata: { generatedAt: "2025-01-01T00:00:00Z", model: "fixture", reasoningEffort: "none", batchId: "fixture", validationStatus: "validated", ambiguityScore: 0.05 },
  },
  {
    id: "fixture-B-1",
    examCode: "GH-600",
    domainId: "B",
    domainName: "Implement tool use and environment interaction",
    objectiveTags: ["mcp-permissions", "least-privilege", "tool-scopes"],
    type: "single_choice",
    difficulty: "medium",
    stem: "An engineering team configures the GitHub MCP Server to give Copilot access to internal tools. A security audit finds the agent has write access to production secrets. What is the immediate correct action?",
    scenario: "The MCP configuration grants the agent access to a secrets management tool with read/write permissions. The agent has not yet accessed production secrets, but the scope exists.",
    options: [
      { id: "A", text: "Monitor the agent's usage logs and only revoke access if a violation occurs." },
      { id: "B", text: "Add the secrets tool to the MCP denylist and restrict to read-only scopes aligned with the agent's actual task requirements." },
      { id: "C", text: "Keep the broad scope to avoid disrupting existing agent workflows." },
      { id: "D", text: "Replace the GitHub MCP Server with a custom proxy that logs all tool calls." },
    ],
    correctAnswer: "B",
    explanation: {
      whyCorrect: "Applying least-privilege by denylisting unnecessary tools and restricting to read-only scopes is the correct immediate action.",
      whyDistractorsWrong: {
        A: "Waiting for a violation is reactive and violates security-first principles.",
        C: "Keeping broad scope for workflow convenience directly contradicts least-privilege.",
        D: "A custom proxy adds complexity without addressing the root permission problem.",
      },
      examStrategyNote: "On GH-600, prioritize answers that enforce least-privilege.",
    },
    sourceRefs: [{ title: "Custom agents – tool scoping", url: "https://docs.github.com/en/copilot/how-tos/copilot-sdk/use-copilot-sdk/custom-agents", docType: "official_docs" }],
    metadata: { generatedAt: "2025-01-01T00:00:00Z", model: "fixture", reasoningEffort: "none", batchId: "fixture", validationStatus: "validated", ambiguityScore: 0.05 },
  },
  {
    id: "fixture-C-1",
    examCode: "GH-600",
    domainId: "C",
    domainName: "Manage memory, state, and execution",
    objectiveTags: ["copilot-memory", "state-persistence", "context-drift"],
    type: "single_choice",
    difficulty: "medium",
    stem: "A Copilot agent working on a long-running refactor begins repeating suggestions already applied in a prior session. What is the most likely root cause?",
    scenario: "Each session starts fresh. The refactor touches 47 files across 3 microservices.",
    options: [
      { id: "A", text: "The agent's tool invocation quota was exhausted." },
      { id: "B", text: "The agent lacks write permissions to the repository." },
      { id: "C", text: "Without persistent state between sessions, the agent has no memory of changes made in prior sessions." },
      { id: "D", text: "The model's temperature setting is too high, causing random repeated outputs." },
    ],
    correctAnswer: "C",
    explanation: {
      whyCorrect: "Stateless agents do not retain memory between sessions. Without a persistence mechanism the agent starts from scratch each session.",
      whyDistractorsWrong: {
        A: "Tool quota exhaustion would cause failures, not repetition.",
        B: "Lack of write permissions would block the agent entirely.",
        D: "Temperature affects creativity/randomness, not cross-session memory.",
      },
      examStrategyNote: "Copilot Memory stores repo-level facts; without it each session is stateless.",
    },
    sourceRefs: [{ title: "Copilot Memory", url: "https://docs.github.com/en/copilot/concepts/agents/copilot-memory", docType: "official_docs" }],
    metadata: { generatedAt: "2025-01-01T00:00:00Z", model: "fixture", reasoningEffort: "none", batchId: "fixture", validationStatus: "validated", ambiguityScore: 0.05 },
  },
  {
    id: "fixture-D-1",
    examCode: "GH-600",
    domainId: "D",
    domainName: "Perform evaluation, error analysis, and tuning",
    objectiveTags: ["evaluation-signals", "false-negative-rate", "quality-gates"],
    type: "single_choice",
    difficulty: "medium",
    stem: "A team deploys a Copilot coding agent for automated code review. Developers report it is approving PRs with subtle security vulnerabilities. Which evaluation approach best addresses this?",
    scenario: "The team currently only measures whether the agent leaves a review comment, not the quality of the decision.",
    options: [
      { id: "A", text: "Increase the agent's context window to capture more code per review." },
      { id: "B", text: "Switch to a different base model to improve review accuracy." },
      { id: "C", text: "Add security-focused evaluation cases to the test suite and measure false-negative rate on known-vulnerable code patterns." },
      { id: "D", text: "Reduce the agent's review scope to only formatting and style issues." },
    ],
    correctAnswer: "C",
    explanation: {
      whyCorrect: "Adding targeted evaluation cases and measuring false-negative rate addresses the gap between what is measured and what matters.",
      whyDistractorsWrong: {
        A: "Context window size is unrelated to the evaluation gap.",
        B: "Switching models without evaluation baselines cannot confirm improvement.",
        D: "Reducing scope avoids the problem rather than solving it.",
      },
      examStrategyNote: "Align evaluation criteria with development intent (the actual security goal, not proxy metrics).",
    },
    sourceRefs: [{ title: "Implementation planner agent", url: "https://docs.github.com/en/copilot/tutorials/customization-library/custom-agents/implementation-planner", docType: "official_docs" }],
    metadata: { generatedAt: "2025-01-01T00:00:00Z", model: "fixture", reasoningEffort: "none", batchId: "fixture", validationStatus: "validated", ambiguityScore: 0.05 },
  },
  {
    id: "fixture-E-1",
    examCode: "GH-600",
    domainId: "E",
    domainName: "Orchestrate multi-agent coordination",
    objectiveTags: ["multi-agent", "conflict-resolution", "orchestration-patterns"],
    type: "single_choice",
    difficulty: "medium",
    stem: "Two Copilot agents working in parallel produce conflicting changes in the same files. How should the orchestration layer handle this?",
    scenario: "Agent 1 has renamed a method; Agent 2 has added tests using the old method name. Both have opened draft PRs.",
    options: [
      { id: "A", text: "Merge both PRs in order of creation and resolve conflicts manually afterward." },
      { id: "B", text: "Allow the agents to continue independently; the CI pipeline will catch the conflict." },
      { id: "C", text: "Pause the dependent agent, signal the conflict to the orchestrator, and resume after the first agent's changes are integrated." },
      { id: "D", text: "Cancel both agents and restart the task as a single sequential agent." },
    ],
    correctAnswer: "C",
    explanation: {
      whyCorrect: "Pausing the dependent agent and routing through the orchestrator preserves progress and enforces dependency ordering.",
      whyDistractorsWrong: {
        A: "Merging conflicting PRs will break the build.",
        B: "Relying on CI to catch orchestration conflicts is reactive and wasteful.",
        D: "Cancelling both agents discards recoverable work.",
      },
      examStrategyNote: "Use orchestrator-worker patterns to coordinate parallel agents safely.",
    },
    sourceRefs: [{ title: "Custom agents – sub-agent delegation", url: "https://docs.github.com/en/copilot/how-tos/copilot-sdk/use-copilot-sdk/custom-agents", docType: "official_docs" }],
    metadata: { generatedAt: "2025-01-01T00:00:00Z", model: "fixture", reasoningEffort: "none", batchId: "fixture", validationStatus: "validated", ambiguityScore: 0.05 },
  },
  {
    id: "fixture-F-1",
    examCode: "GH-600",
    domainId: "F",
    domainName: "Implement guardrails and accountability",
    objectiveTags: ["audit-logging", "compliance", "least-privilege", "guardrails"],
    type: "single_choice",
    difficulty: "medium",
    stem: "A company subject to SOC 2 Type II needs a full audit trail of every agent action that modifies code or creates PRs. Which approach satisfies this requirement?",
    scenario: "The security team must reconstruct exactly what the agent did, when, and why, for any PR in the past 12 months.",
    options: [
      { id: "A", text: "Require developers to add a manual comment to each agent-created PR describing what the agent did." },
      { id: "B", text: "Enable GitHub audit log streaming to a SIEM, configure agent identity labels on PRs, and retain tool invocation logs with timestamps tied to PR IDs." },
      { id: "C", text: "Store the agent's full conversation history in a shared Google Doc accessible to the security team." },
      { id: "D", text: "Disable agent access to production repositories and only allow it in sandboxed environments." },
    ],
    correctAnswer: "B",
    explanation: {
      whyCorrect: "Streaming audit logs to a SIEM with agent identity labels and timestamped tool invocations provides a structured, tamper-evident, queryable audit trail.",
      whyDistractorsWrong: {
        A: "Manual comments are inconsistent, incomplete, and not tamper-evident.",
        C: "Google Docs is not a compliant audit mechanism.",
        D: "Disabling agents in production defeats the purpose of deployment.",
      },
      examStrategyNote: "GitHub agent commits are signed ('Verified') and include session log links — built-in auditability.",
    },
    sourceRefs: [{ title: "Build guardrails", url: "https://docs.github.com/en/copilot/tutorials/cloud-agent/build-guardrails", docType: "official_docs" }],
    metadata: { generatedAt: "2025-01-01T00:00:00Z", model: "fixture", reasoningEffort: "none", batchId: "fixture", validationStatus: "validated", ambiguityScore: 0.05 },
  },
];
