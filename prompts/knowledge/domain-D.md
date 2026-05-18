# Domain D: Perform Evaluation, Error Analysis, and Tuning (15–20%)
Source: https://docs.github.com/en/copilot/tutorials/customization-library/custom-agents/implementation-planner
Source: https://learn.microsoft.com/en-us/training/modules/foundations-agentic-ai/

## Official Study Guide Objectives

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

## Key Technical Content

### Evaluation signals
**Quantitative signals:**
- Test pass rate (before/after agent change)
- Code coverage delta
- Number of open scan findings (CodeQL, secret scanning, dependency review)
- Build time, lint error count, PR review iterations before merge
- Tool call count per session (efficiency)

**Qualitative signals:**
- Code review feedback patterns ("always needs style fixes", "architecture concerns")
- Alignment between planned steps and actual commits
- Correctness of structured plan output vs. final result
- Human reviewer effort (how much rework was required)

### Automated scanning as evaluation (built into Copilot cloud agent)
- **CodeQL**: Static analysis for security issues; agent checks its own code before completing PR
- **GitHub Advisory Database**: New dependencies checked for CVSS High/Critical vulnerabilities
- **Secret scanning**: Detects API keys, tokens, secrets introduced in commits
- **Copilot code review**: Second-opinion review; agent attempts to resolve issues before PR is ready
- All scan results visible in session log; agent iterates to fix findings before marking PR ready

### Failure taxonomy / root cause classification
| Root cause | Description | How to identify |
|-----------|-------------|-----------------|
| **Reasoning error** | Agent misunderstood task; wrong plan | Compare plan to original spec; look for divergence in commit messages |
| **Tool misuse** | Wrong tool called; wrong parameters; tool called in wrong order | Session log tool call history |
| **Context/environment issue** | Missing context (stale branch, wrong file read), environment constraint (no network, missing secret) | Session log; diff between agent's assumptions and actual state |
| **Prompt/instruction issue** | System prompt too vague, missing constraints | Agent produces output that is technically correct but wrong for the project |

### Reading failure signals
- **Session logs**: Full tool call history with inputs/outputs; accessible to admins
- **Plans**: Agent outputs structured plan as first artifact; compare to final output
- **Traces**: Sequence of tool calls and model reasoning steps
- **Workflow artifacts**: Actions job logs, uploaded artifacts from agent runs
- **PR comments**: Agent self-reports blockers, low-confidence decisions, escalations

### Tuning strategies
**Revise instructions:**
- Add specific constraints that prevent observed failure (e.g., "never modify `*.lock` files without explicit approval")
- Add positive examples (few-shot) of good output to the agent's system prompt
- Add negative examples ("previously this failed because...")

**Refine memory usage:**
- Curate Copilot Memory: delete stale/incorrect repository facts manually
- Add explicit project facts to kick-start memory for new repos
- Use memory scoping: agent should read facts tagged for its domain, not all facts

**Refine tool usage:**
- Restrict tool list: if agent uses bash when it should use view, remove bash
- Add guard tools: add a "verify" step before committing
- Adjust tool order in instructions: "always run tests before creating PR"

### Implementation planner pattern (custom agent)
A specialized agent that breaks features into actionable tasks:
- Input: feature description or GitHub issue
- Output: structured markdown plan (phases, tasks, dependencies, risk assessment)
- Tools: read (explore codebase), search (find patterns), edit (write plan file)
- Plan structure: Overview → Technical Approach → Implementation Phases → Risks/Assumptions/Constraints
- Used for evaluation: compare agent's plan against final PR diff to measure adherence
