# Domain B: Implement Tool Use and Environment Interaction (20–25%)
Source: https://docs.github.com/en/copilot/how-tos/copilot-sdk/use-copilot-sdk/custom-agents
Source: https://learn.microsoft.com/en-us/training/modules/agent-tooling-mcp-execution-environments/

## Official Study Guide Objectives

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

## Key Technical Content

### Tool types available to agents
- **Built-in tools**: `grep`, `glob`, `view`, `edit`, `bash`, `search`
- **MCP tools**: External capabilities via Model Context Protocol servers
- **GitHub API tools**: Issue/PR creation, branch operations, file reads
- Tools are explicitly listed in agent config; `null` = all tools; empty array = no tools

### Tool scoping (principle of least privilege)
```yaml
# Read-only researcher agent
tools: ["grep", "glob", "view"]

# Writer agent
tools: ["view", "edit", "bash"]

# Full access
tools: null  # or omit tools property
```

### MCP (Model Context Protocol)
- MCP servers expose **tools** that agents can call during execution
- **GitHub remote MCP server** (`github.com`): provides GitHub-native tools (search, file read, issue create, etc.)
- **MCP registries**: GitHub marketplace for discovering MCP servers
- **MCP allow lists**: Organization-level control; admins configure which MCP servers agents can use
- Each custom agent can have its own `mcpServers` config section
- MCP servers run as separate processes; agent communicates via JSON-RPC

### Configuring a GitHub remote MCP server
```yaml
# In agent front matter or SDK config
mcpServers:
  github:
    type: http
    url: https://api.githubcopilot.com/mcp/
    headers:
      Authorization: Bearer ${GITHUB_TOKEN}
```

### Agent execution scope
- **Repository scope**: `Configure an agent's scope to a specific repository` — agent config targets a specific repo
- **Branch scope**: Agent works on a specific branch (usually `copilot/<task>` branch it creates)
- **CI scope**: Agent invoked as a GitHub Actions job; uses `workflow_dispatch`, `issue_comment`, or `pull_request` events
- Agents CANNOT push to default branch; CANNOT merge PRs themselves

### Invoking agent in CI workflow
```yaml
# .github/workflows/copilot-agent.yml
on:
  issue_comment:
    types: [created]
jobs:
  run-agent:
    if: contains(github.event.comment.body, '@copilot')
    runs-on: ubuntu-latest
    steps:
      - uses: github/copilot-agent-action@v1
```

### Error handling patterns
- **Error handling**: Catch tool errors, surface in PR comment or session log, do not silently continue
- **Retries**: Retry transient failures (network, API rate limits) with exponential backoff; max 3 attempts
- **Rollback**: If a sequence of tool calls fails midway, undo partial changes (revert commits, delete temp branch)
- **Escalation**: If retry limit exceeded or confidence is low, surface to human via PR comment / draft PR
- **Traceability**: Log every tool call with input/output to session log; link to the triggering event (issue/PR)

### Execution boundaries
- Agent cannot read GitHub Actions secrets; secrets isolated from agent environment
- Agent secrets and variables (separate from Actions secrets) CAN be provisioned specifically for agents
- Network: configurable firewall restricts outbound access; allowlist specific domains
- File access: scoped to checked-out repository; no access to other repos
