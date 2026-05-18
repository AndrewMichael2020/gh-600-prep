# GH-600 Official Study Guide
Source: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600
Fetched: 2026-05-18

## Audience Profile

Subject matter expertise in operating, integrating, supervising, and governing AI agents inside
production-grade SDLC workflows using GitHub as the system of record and control plane.

Responsibilities:
- Operating agent workflows inside the SDLC
- Supervising autonomous behavior with GitHub controls
- Evaluating and tuning agent outputs using scans and artifacts
- Configuring custom agents
- Coordinating multi-agent execution safely

Experience required: SDLC, GitHub workflows and controls, code quality/security/review practices,
coding agents including GitHub Copilot, MCP servers, custom agents, custom instructions, tools,
and copilot setup steps.

## Skills at a Glance (Domain Weights)

- A: Prepare agent architecture and SDLC processes (15-20%)
- B: Implement tool use and environment interaction (20-25%)
- C: Manage memory, state, and execution (10-15%)
- D: Perform evaluation, error analysis, and tuning (15-20%)
- E: Orchestrate multi-agent coordination (15-20%)
- F: Implement guardrails and accountability (10-15%)

---

## Domain A: Prepare agent architecture and SDLC processes (15-20%)

### Integrate agents into the software development lifecycle (SDLC)
- Identify steps for agents to perform
- Identify and mitigate common anti-patterns in agents
- Define inputs, outputs, and success criteria for agents

### Define boundaries between planning, reasoning, and action
- Configure agent planning to be distinct from agent execution
- Configure an agent to output a structured plan
- Validate agent plans
- Prevent agent action until the agent checked and approved

### Configure observability and control for autonomous agents
- Plan and implement the degree of agent autonomy, including guardrails
- Configure agent to produce inspectable artifacts within standard development tooling
- Configure human intervention for autonomous agents without slowing delivery

---

## Domain B: Implement tool use and environment interaction (20-25%)

### Select and configure agent tools
- Identify required tools
- Configure agent tools
- Configure agent tool permissions

### Configure MCP servers
- Add an MCP server as a tool to an agent
- Configure a GitHub remote MCP server
- Configure the MCP registries
- Configure MCP allow lists

### Integrate agents within development environments
- Evaluate the execution context for an agent
- Configure an agent's scope to a specific repository
- Configure an agent to be invoked in a CI workflow
- Configure an agent to use branch-based scope
- Enable an agent to perform autonomous actions, including creating branches and pull requests
- Configure an agent to handle environment-specific constraints

### Operate agents with safe execution paths and robust error handling
- Implement error handling
- Implement retries
- Implement rollbacks
- Implement escalation paths
- Implement traceability and accountability for agent actions

---

## Domain C: Manage memory, state, and execution (10-15%)

### Implement agent memory strategies
- Choose between short-term, long-term, and external memory
- Scope agent memory to task-relevant information
- Define memory expiration, pruning, and reset rules

### Persist agent state and manage context drift
- Capture task progress and decisions as durable artifacts
- Resume agent work without repeating steps or diverging from prior decisions
- Detect and correct drift during extended agent execution

### Ensure continuity of agent memory and state across tools and environments
- Share agent state
- Prevent conflicting context
- Prevent stale context

### Key feature: Copilot Memory
- Stores repository-level facts (coding conventions, architectural decisions, build commands)
- Stores user-level preferences (individual coding style, workflow patterns)
- Scoped: repo facts available to all users with access; user prefs only to that user
- Auto-deleted after 28 days of non-use; timer resets when entry is validated and used
- Enabled per user, not per repository
- Used by: Copilot cloud agent, Copilot code review, Copilot CLI

---

## Domain D: Perform evaluation, error analysis, and tuning (15-20%)

### Define success criteria and evaluation signals for agent tasks
- Specify expected outcomes and operational constraints for agent tasks
- Identify qualitative and quantitative evaluation signals to evaluate agents
- Align evaluation criteria with development intent
- Generate evaluation signals by using automated scanning tools

### Analyze agent failures and identify root causes
- Identify failures by using logs, plans, traces, outputs, and workflow artifacts
- Classify root causes, including reasoning errors, tool misuse, and context or environment issues

### Tune agent behavior based on evaluation results
- Revise instructions, workflows, or constraints
- Refine memory usage
- Refine tool usage and tool access

---

## Domain E: Orchestrate multi-agent coordination (15-20%)

### Operate and manage multi-agent workflows
- Apply an orchestration pattern to coordinate multiple agents
- Configure agent isolation for parallel execution
- Detect and resolve agent conflicts, including overlapping code changes, duplicated effort,
  and contradictory outputs

### Configure observability for multi-agent behavior
- Configure multi-agent workflows to produce artifacts suitable for review and audit
- Document key decisions, handoffs, and outcomes across agents
- Perform post-hoc analysis of multi-agent behavior

### Detect and respond to multi-agent failures and degraded behavior
- Identify failed, partial, or stalled agent executions
- Respond to degraded behavior or coordination across agents
- Implement multi-agent recovery patterns, including rollback and human-in-the-loop

### Manage the lifecycle of agents within multi-agent workflows
- Add agents to existing multi-agent workflows
- Update, reconfigure, or replace agents without disrupting active workflows
- Retire agents while preserving auditability and workflow continuity

---

## Domain F: Implement guardrails and accountability (10-15%)

### Define autonomy levels
- Classify agent actions by operational, security, and compliance risk to right-size
  human interventions
- Assign autonomy levels to maximize delivery speed while remaining compliant with
  organizational security and Responsible AI standards

### Implement guardrails and human-in-the-loop workflows
- Identify the subset of actions that require human judgment
- Block actions that violate defined security, compliance, or Responsible AI policies
- Scope permissions and execution contexts to enforce least-privilege access
- Require explicit authorization or controlled paths for irreversible or compliance-sensitive changes
- Preserve execution velocity by minimizing approvals that do not materially reduce risk

---

## Official Study Resources

### Microsoft Learn modules (official, required reading)
- Foundations of Agentic AI in GitHub:
  https://learn.microsoft.com/en-us/training/modules/foundations-agentic-ai/
  Topics: plan-act-evaluate lifecycle, GitHub as system of record, agent anti-patterns,
  contributor model, traceability requirements

- Designing Agent Architecture and SDLC Integration:
  https://learn.microsoft.com/en-us/training/modules/design-agent-architecture-integration/
  Topics: SDLC stage mapping, structured agent tasks, planning vs execution separation,
  PR-based governance (templates/checks/CODEOWNERS/rules/environments), observability,
  tool governance, secrets boundaries, reliability patterns

- Tooling, MCP, and Agent Execution Environments:
  https://learn.microsoft.com/en-us/training/modules/agent-tooling-mcp-execution-environments/
  Topics: tools and APIs, MCP server role, GitHub Actions execution environments,
  execution boundaries (repo/branch/workflow scope), branch restrictions, PR review,
  environment safeguards

### GitHub Documentation (official, required reading)
- Prepare agent architecture: https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/prepare-for-custom-agents
- Custom agents (Copilot SDK): https://docs.github.com/en/copilot/how-tos/copilot-sdk/use-copilot-sdk/custom-agents
- Copilot Memory: https://docs.github.com/en/copilot/concepts/agents/copilot-memory
- Cloud agent risks and mitigations: https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations
- Multi-agent coordination: https://docs.github.com/en/copilot/how-tos/copilot-sdk/use-copilot-sdk/custom-agents
- Guardrails and accountability: https://docs.github.com/en/copilot/tutorials/cloud-agent/build-guardrails

### GitHub Repositories (official, required reading)
- github/github-mcp-server: MCP server architecture, tool scopes, permission models
- github-samples/agents-in-sdlc: SDLC integration patterns, agentic loop examples
- microsoft/ai-agents-for-beginners: Orchestration patterns, memory strategies
- github/copilot-sdk: Custom agents, sub-agent delegation, tool scoping
- skills/integrate-mcp-with-copilot: MCP allow lists, permission configuration
