# Domain A: Prepare Agent Architecture and SDLC Processes (15–20%)
Source: https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/prepare-for-custom-agents
Source: https://learn.microsoft.com/en-us/training/modules/foundations-agentic-ai/
Source: https://learn.microsoft.com/en-us/training/modules/design-agent-architecture-integration/

## Scope Boundaries — what this domain DOES and DOES NOT cover

**Domain A covers**: agent lifecycle design, SDLC integration patterns, planning vs action separation,
structured task definition (inputs/outputs/success criteria), observability for autonomous agents,
contributor model, PR-based governance *as part of agent workflow setup*.

**Do NOT classify as Domain A** (see other domains):
- Firewall rules, network allowlists, runner network config → **Domain B**
- MCP server permissions, tool scoping, OAuth → **Domain B**
- CI failures, telemetry gaps, evaluation metrics → **Domain D**
- Human-approval guardrails, content filters, compliance audits → **Domain F**
- PR review / CODEOWNERS *in a governance/compliance context* → **Domain F**

## Official Study Guide Objectives

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

## Key Technical Content

### Plan → Act → Evaluate lifecycle
Agentic AI follows a repeating loop:
1. **Plan**: Agent analyzes the task, identifies steps, outputs a structured plan (often as a GitHub comment or draft PR description)
2. **Act**: Agent executes — writes code, runs tools, creates commits and PRs
3. **Evaluate**: Agent checks its own output; CI checks run; humans review

### GitHub as system of record and control plane
- All agent activity flows through GitHub: issues, PRs, comments, status checks, Actions logs
- **Traceability**: Every agent commit is authored by Copilot, co-authored by the triggering user; commits are signed ("Verified")
- **Auditability**: Session logs and audit log events available to admins; commit message links to session log
- Agents cannot directly run git push; they use GitHub App tokens

### Contributor model: agents as team members
- Agents treated as contributors with appropriate permissions
- Only users/agents with write access can trigger Copilot cloud agent
- Agent PRs must be reviewed and merged by a human — agent cannot self-approve
- Draft PRs created by agent must be explicitly marked "Ready for review" by a human

### Common anti-patterns in agents
- **Silent failures**: Agent catches errors without surfacing them
- **Unbounded autonomy**: Agent takes irreversible actions without human checkpoints
- **Context leakage**: Agent uses knowledge from one task in unrelated tasks
- **Overlong context**: Agent accumulates so much history it loses focus
- **No structured output**: Agent produces prose instead of structured artifacts (plans, JSON, PR descriptions)

### Structured agent task definition
A well-defined agent task has:
- **Inputs**: GitHub issue, PR comment, branch, file paths, acceptance criteria
- **Outputs**: Commit diff, test results, PR description, planning artifact
- **Success criteria**: All tests pass, review requested, no secrets introduced

### PR-based governance for agent work
- **Branch protection rules**: Require PRs, status checks, CODEOWNERS review before merge
- **Rulesets**: Can target agent-created `copilot/` branches specifically
- **CODEOWNERS**: Protect critical files (`.github/copilot-instructions.md`, `copilot-setup-steps.yml`)
- **Required status checks**: Force CI to pass before agent work can be merged
- **Environment protection rules**: Require manual approval before deployment

### Custom agent repository setup
- Organization creates `.github-private` repo using GitHub's custom agents template
- Agents defined in `.github/agents/*.agent.md`
- Format: YAML front matter (name, description, tools) + markdown system prompt
- Internal or private visibility controls who can use agents

### Agent front-matter: `disable-model-invocation` (replaces deprecated `infer`)
- **Current field**: `disable-model-invocation: true` prevents the agent from calling the LLM
  and is used to create tool-only or orchestrator agents.
- **Deprecated**: `infer: false` was an earlier SDK-era field with equivalent effect.
  Do NOT write questions that present `infer: false` as the recommended current syntax;
  use `disable-model-invocation` in any answer key or explanation.
- Source: GitHub Copilot custom agent docs and Extensions SDK changelog

### Copilot cloud agent execution environment
- Runs on GitHub Actions runners (fresh VM per session; ephemeral)
- GitHub-hosted runners recommended for isolation
- Network access restricted by configurable firewall
- Does NOT have access to GitHub Actions secrets (by design)
- Has access to only one branch at a time (`copilot/` branch or PR head branch)
