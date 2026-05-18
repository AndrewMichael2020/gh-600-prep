# Domain F: Implement Guardrails and Accountability (10–15%)
Source: https://docs.github.com/en/copilot/tutorials/cloud-agent/build-guardrails
Source: https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations

## Official Study Guide Objectives

### Define autonomy levels
- Classify agent actions by operational, security, and compliance risk to right-size human interventions
- Assign autonomy levels to maximize delivery speed while remaining compliant with organizational security and Responsible AI standards

### Implement guardrails and human-in-the-loop workflows
- Identify the subset of actions that require human judgment
- Block actions that violate defined security, compliance, or Responsible AI policies
- Scope permissions and execution contexts to enforce least-privilege access
- Require explicit authorization or controlled paths for irreversible or compliance-sensitive changes
- Preserve execution velocity by minimizing approvals that do not materially reduce risk

## Key Technical Content

### Built-in security protections (Copilot cloud agent)
- **CodeQL**: Checks agent-generated code for security issues before PR is completed
- **GitHub Advisory Database**: New dependencies checked for malware advisories and CVSS High/Critical vulns
- **Secret scanning**: Detects secrets, API keys, tokens introduced in commits
- **Copilot code review**: Second-opinion review; agent resolves issues found before marking PR ready
- **Signed commits**: All agent commits are signed ("Verified"); cannot be altered post-creation
- **No default branch push**: Agent can ONLY push to its working branch; cannot push to main/master

### Access controls (what Copilot cloud agent CANNOT do by default)
- Cannot push to the default branch
- Cannot merge pull requests (human must merge)
- Cannot mark its own PR as "Ready for review" (must be done by human)
- Cannot approve pull requests
- The user who triggered the agent CANNOT also approve its PR (prevents self-approval bypass)
- Cannot read GitHub Actions secrets
- Network access restricted by configurable firewall

### Autonomy classification framework
| Risk level | Example actions | Autonomy | Guardrail |
|-----------|----------------|---------|-----------|
| **Low** | Read files, search code, view PRs | Fully autonomous | None needed |
| **Medium** | Write code, create commits, open draft PRs | Autonomous with artifact review | Required CI checks, code review |
| **High** | Deploy to staging, modify config files, run migrations | Human checkpoint | Required approval in environment protection rule |
| **Critical** | Deploy to production, modify secrets, billing changes | Human-in-the-loop | Required review + manual approval step |

### Rulesets and branch protection for guardrails
- Rulesets apply to agents exactly like human contributors
- Target `copilot/**` branches with specific rules (e.g., require CodeQL to pass)
- **CODEOWNERS protection**: Add `.github/copilot-instructions.md` and `copilot-setup-steps.yml` to CODEOWNERS so modifications require human review
- **Required checks**: Force all CI checks to pass before agent PR can be merged
- **Environment protection rules**: Require manual approval before any deployment to protected environments

### Policy settings for guardrails (enterprise/org admin)
- Which orgs/repos Copilot cloud agent is enabled in (access management)
- Which MCP servers are allow-listed (tool governance)
- Runner configuration (GitHub-hosted recommended; ephemeral for isolation)
- Workflow trigger policies: by default, Actions workflows in agent PRs are blocked until a human approves ("Approve and run workflows")
- GitHub Actions default permissions: review `GITHUB_TOKEN` default perms; encourage minimum required in `copilot-setup-steps.yml`

### Least-privilege execution
- Scope agent permissions to only what the task requires
- Use read-only tools (`grep`, `glob`, `view`) for exploration agents
- Restrict MCP server access to only the servers the agent needs
- Use `copilot-setup-steps.yml` to set minimum GITHUB_TOKEN permissions for agent's environment setup
- Agent secrets are separate from Actions secrets; only provision what the agent needs

### Responsible AI standards compliance
- Classify actions by Responsible AI risk (not just security): bias in AI-generated content, fairness in code reviews
- Document all agent decisions as inspectable artifacts (not black boxes)
- Ensure human reviewers can understand and override every agent decision
- Audit log: all agent API actions logged; available to enterprise admins

### Secrets and sensitive data boundaries
- GitHub Actions secrets: intentionally NOT accessible to agents
- Copilot agent secrets/variables: separate mechanism for providing necessary secrets to agents
- Agents should never read, log, or transmit GitHub Actions secrets
- Any attempt to access secrets outside the agent secrets mechanism is a policy violation

### Firewall and network controls
- Copilot cloud agent has a configurable outbound firewall
- Default: restricted to GitHub endpoints
- Custom allowlist: add specific domains (e.g., internal package registry)
- Prevents data exfiltration to unknown endpoints
