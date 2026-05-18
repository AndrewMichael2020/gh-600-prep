# Domain E: Orchestrate Multi-Agent Coordination (15–20%)
Source: https://docs.github.com/en/copilot/how-tos/copilot-sdk/use-copilot-sdk/custom-agents

## Official Study Guide Objectives

### Operate and manage multi-agent workflows
- Apply an orchestration pattern to coordinate multiple agents
- Configure agent isolation for parallel execution
- Detect and resolve agent conflicts, including overlapping code changes, duplicated effort, and contradictory outputs

### Configure observability for multi-agent behavior by using logs, artifacts, and operational signals
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

## Key Technical Content

### Orchestration patterns
**Orchestrator-worker pattern**: One orchestrator agent decomposes the task and delegates sub-tasks to specialized worker agents. Orchestrator collects results and integrates.

**Pipeline pattern**: Agents form a sequential chain. Output of agent N becomes input of agent N+1. Each agent has a single, well-defined transformation.

**Parallel fan-out**: Orchestrator spawns multiple agents in parallel to work on independent sub-tasks (e.g., different files or modules). Results aggregated.

**Debate/consensus**: Multiple agents independently produce solutions; orchestrator or human picks the best.

### Copilot SDK custom agents (sub-agent delegation)
- Custom agents are defined with `customAgents` array in `createSession()` config
- Each agent has: `name`, `displayName`, `description`, `tools[]`, `prompt` (system prompt), optional `mcpServers`
- **`infer: true`** (default): runtime auto-selects agent based on user intent matching agent's `name`/`description`
- **`infer: false`**: agent only invoked by explicit user request
- **`agent` session property**: pre-select which agent is active at session start
- Runtime delegation flow: Intent matching → Agent selection → Isolated execution → Event streaming → Result integration

### Sub-agent lifecycle events (for building observability UIs)
| Event | When emitted | Key data |
|-------|--------------|----------|
| `subagent.selected` | Runtime chooses an agent | `agentName`, `agentDisplayName`, `tools` |
| `subagent.started` | Sub-agent begins | `toolCallId`, `agentName`, `agentDescription` |
| `subagent.completed` | Sub-agent finishes successfully | `toolCallId`, `agentName` |
| `subagent.failed` | Sub-agent errors | `toolCallId`, `agentName`, `error` |
| `subagent.deselected` | Runtime switches away | — |

`toolCallId` links events together to reconstruct the execution tree.

### Agent isolation for parallel execution
- Each agent works on its own branch; no shared mutable state
- Branches: `copilot/task-1`, `copilot/task-2`, etc.
- Conflict detection: when merging parallel branches, use PR conflict detection + required status checks
- **Conflict types**: overlapping code changes (same file/function), duplicated effort (same fix applied twice), contradictory outputs (different architectural decisions in different branches)

### Observability artifacts for multi-agent workflows
- Each agent session produces: session log (tool call trace), commits (signed, authored by Copilot), PR with structured description
- Handoff documented: final agent PR comment summarizes decisions made and open questions for next agent
- Audit trail: all commits reference session log URL; admins can reconstruct full execution history
- Post-hoc analysis: compare session logs across agents; identify which agent introduced a bug or regressed a behavior

### Multi-agent failure patterns and recovery
**Stalled execution**: Agent stopped producing output; detect via session timeout or lack of commits for N minutes
- Recovery: Restart agent from last checkpoint (commit or PR comment artifact)

**Partial execution**: Agent completed 3 of 5 steps and failed
- Recovery: Read checkpoint, resume from step 4; or rollback branch and restart

**Conflicting outputs**: Two agents wrote incompatible changes to same file
- Recovery: Human reviews both PRs; pick one; explicitly reject the other with explanation

**Cascading failure**: Sub-agent failure causes orchestrator to produce wrong plan
- Recovery: Human-in-the-loop checkpoint at orchestrator plan before sub-agents run

### Agent lifecycle management
- **Adding agents**: Add new `.agent.md` file to `.github/agents/`; no disruption to running workflows
- **Updating agents**: Edit agent file; commit; changes apply to new sessions (not in-flight sessions)
- **Replacing agents**: Deploy new agent with same name but updated prompt/tools; or rename old agent and create new one
- **Retiring agents**: Remove `.agent.md` from agents directory; add a note to commit message; audit log preserves history; old session logs remain accessible
