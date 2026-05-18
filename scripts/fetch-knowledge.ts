/**
 * Dev-mode knowledge base refresh script.
 *
 * Fetches the official GH-600 study guide and all 6 domain documentation pages
 * from GitHub Docs and Microsoft Learn, then writes them to prompts/knowledge/.
 * Run this periodically to keep the knowledge base current.
 *
 * Usage:
 *   npm run fetch-knowledge
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "prompts", "knowledge");
mkdirSync(KNOWLEDGE_DIR, { recursive: true });

interface KnowledgeSource {
  filename: string;
  url: string;
  description: string;
}

const SOURCES: KnowledgeSource[] = [
  {
    filename: "gh-600-study-guide.md",
    url: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600",
    description: "GH-600 Official Study Guide (full skills outline)",
  },
  {
    filename: "domain-A-docs.md",
    url: "https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/prepare-for-custom-agents",
    description: "Domain A: Prepare agent architecture and SDLC processes",
  },
  {
    filename: "domain-B-docs.md",
    url: "https://docs.github.com/en/copilot/how-tos/copilot-sdk/use-copilot-sdk/custom-agents",
    description: "Domain B: Implement tool use and environment interaction",
  },
  {
    filename: "domain-C-docs.md",
    url: "https://docs.github.com/en/copilot/concepts/agents/copilot-memory",
    description: "Domain C: Manage memory, state, and execution",
  },
  {
    filename: "domain-D-docs.md",
    url: "https://docs.github.com/en/copilot/tutorials/customization-library/custom-agents/implementation-planner",
    description: "Domain D: Perform evaluation, error analysis, and tuning",
  },
  {
    filename: "domain-E-docs.md",
    url: "https://docs.github.com/en/copilot/how-tos/copilot-sdk/use-copilot-sdk/custom-agents",
    description: "Domain E: Orchestrate multi-agent coordination",
  },
  {
    filename: "domain-F-docs.md",
    url: "https://docs.github.com/en/copilot/tutorials/cloud-agent/build-guardrails",
    description: "Domain F: Implement guardrails and accountability",
  },
  {
    filename: "domain-F-risks.md",
    url: "https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations",
    description: "Domain F: Risks and mitigations for Copilot cloud agent",
  },
  {
    filename: "ms-learn-foundations-agentic-ai.md",
    url: "https://learn.microsoft.com/en-us/training/modules/foundations-agentic-ai/",
    description: "Microsoft Learn: Foundations of Agentic AI in GitHub",
  },
  {
    filename: "ms-learn-design-agent-architecture.md",
    url: "https://learn.microsoft.com/en-us/training/modules/design-agent-architecture-integration/",
    description: "Microsoft Learn: Designing Agent Architecture and SDLC Integration",
  },
  {
    filename: "ms-learn-agent-tooling-mcp.md",
    url: "https://learn.microsoft.com/en-us/training/modules/agent-tooling-mcp-execution-environments/",
    description: "Microsoft Learn: Tooling, MCP, and Agent Execution Environments",
  },
];

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (gh-600-prep knowledge fetcher)",
      Accept: "text/html,text/plain",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// Very basic HTML-to-text: strip tags, decode entities, collapse whitespace
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{3,}/g, "\n\n")
    .trim();
}

let ok = 0;
let fail = 0;

for (const source of SOURCES) {
  process.stdout.write(`  Fetching: ${source.description}… `);
  try {
    const html = await fetchText(source.url);
    const text = htmlToText(html);
    const header = `# ${source.description}\nSource: ${source.url}\nFetched: ${new Date().toISOString().slice(0, 10)}\n\n`;
    const outPath = path.join(KNOWLEDGE_DIR, source.filename);
    writeFileSync(outPath, header + text, "utf8");
    console.log(`✅  (${Math.round(text.length / 1024)}KB) → ${source.filename}`);
    ok++;
  } catch (err) {
    console.log(`❌  ${err instanceof Error ? err.message : err}`);
    fail++;
  }
}

console.log(`\nDone: ${ok} fetched, ${fail} failed. Files in prompts/knowledge/`);
if (fail > 0) process.exit(1);
