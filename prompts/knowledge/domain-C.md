# Domain C: Manage Memory, State, and Execution (10–15%)
Source: https://docs.github.com/en/copilot/concepts/agents/copilot-memory

## Official Study Guide Objectives

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

## Key Technical Content

### Memory taxonomy
| Type | Scope | Persistence | Example |
|------|-------|-------------|---------|
| Short-term (context window) | Single session | Gone when session ends | Current conversation, open files |
| Long-term (Copilot Memory) | Repository or user | 28 days; resets on use | Coding conventions, architectural decisions |
| External memory | Configurable | Permanent | Database, vector store, external file |

### Copilot Memory (the GitHub feature)
- Stores **repository-level facts**: coding conventions, architectural decisions, build commands, project-specific rules
- Stores **user-level preferences**: individual coding style, workflow patterns (Pro/Pro+ only)
- **Who can read**: Repository facts → any user with Copilot Memory access to that repo; User prefs → only that user
- **Who can create**: Only users with write access who have Copilot Memory enabled
- **Auto-deletion**: Any fact/preference unused for 28 days is deleted; timer resets when Copilot validates and uses it
- **Validation**: Repo facts are stored with code citations; Copilot checks citations against current branch before use
- **Enabled per user**, not per repository
  - Copilot Pro/Pro+: on by default
  - Enterprise/Org: off by default; admin enables for all members
- **Currently used by**: Copilot cloud agent, Copilot code review, Copilot CLI
- Copilot CLI: only applies stored facts/prefs for the user who initiated the operation
- Code review: repository-level facts only (not user prefs)

### Cross-feature memory sharing
- Memory created during a Copilot cloud agent session can be used by Copilot code review in a later PR
- Example: Agent discovers DB connection pattern → code review applies that knowledge to spot inconsistencies
- Memory is scoped to the repository; cannot bleed into other repos

### State persistence for long-running tasks
- **Durable artifacts**: Progress checkpoints stored as GitHub comments, PR descriptions, or committed JSON files
- **Resume without repetition**: Agent reads its own last checkpoint before acting; avoids redoing completed steps
- **Context drift**: When an agent repeatedly refines output, it may drift from original requirements; detect by comparing current plan to original issue/acceptance criteria
- **Drift correction**: Re-anchor to the original spec; optionally restart from a checkpoint

### Pruning and reset rules
- Reset context at task boundaries (new issue = new session; no carryover)
- Prune tool call history from context once a step is complete
- Memory expiration: 28-day auto-delete for Copilot Memory; use validation citations to distinguish stale from current facts

### State sharing across agents/tools
- Share state via: PR description (structured YAML/JSON frontmatter), GitHub issue comments (structured format), committed state files in branch
- Prevent conflicting context: one agent per branch at a time; lock via PR status
- Prevent stale context: always read from branch HEAD before acting; validate Copilot Memory citations against current codebase
