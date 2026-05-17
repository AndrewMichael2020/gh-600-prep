export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL ?? "gpt-5.5",
  reasoningEffort: process.env.OPENAI_REASONING_EFFORT ?? "medium",
  reviewReasoningEffort: process.env.OPENAI_REVIEW_REASONING_EFFORT ?? "high",
};

export const sourceRegistry = [
  { priority: 1, repo: "github-samples/agents-in-sdlc", useFor: ["agent architecture", "SDLC", "multi-agent workflows", "Copilot agent mode"] },
  { priority: 2, repo: "skills/integrate-mcp-with-copilot", useFor: ["MCP", "Copilot Agent Mode", "issues to PR workflow"] },
  { priority: 3, repo: "github/github-mcp-server", useFor: ["GitHub MCP server", "tools", "permissions", "repos", "issues", "PRs", "Actions", "code security"] },
  { priority: 4, repo: "github/awesome-copilot", useFor: ["custom agents", "instructions", "skills", "hooks", "workflows", "MCP references"] },
  { priority: 5, repo: "github-samples/copilot-in-a-box", useFor: ["sample hub", "walkthroughs", "Copilot learning resources"] },
  { priority: 6, repo: "github/copilot-sdk", useFor: ["programmable agent workflows", "tool invocation", "custom agents", "skills", "MCP", "hooks", "permissions"] },
  { priority: 7, repo: "skills/getting-started-with-github-copilot", useFor: ["Copilot basics", "planning", "PR summarization", "review", "Codespaces"] },
  { priority: 8, repo: "github-samples/pets-workshop", useFor: ["Actions", "Codespaces", "GHAS", "secure DevOps workflows"] },
  { priority: 9, repo: "microsoft/mcp-for-beginners", useFor: ["MCP fundamentals", "server/client patterns"] },
  { priority: 10, repo: "microsoft/ai-agents-for-beginners", useFor: ["agent design patterns", "planning", "tool use", "multi-agent concepts"] },
];
