# Case Study Generation Prompt (reference -- not yet loaded from disk)

Used by: `generateCaseStudy()` -- planned function in `src/generation.ts`
Status: Not yet implemented. Case study questions currently use `case_study_child` type.

## Purpose
Generate a full case study object: background, organization context, constraints,
realistic artifacts (configs, logs, diffs), and 3-4 linked questions.

## Case study themes for GH-600
- Regulated healthcare repository with strict audit requirements
- MCP-enabled development platform with multi-tool agent access
- Multi-agent refactor with orchestration conflict
- Evaluation failure root-cause analysis

## Returns (JSON)
```json
{
  "caseStudy": {
    "id": "...", "title": "...", "background": "...",
    "organizationContext": "...",
    "constraints": ["..."],
    "artifacts": [{"title": "...", "kind": "yaml", "content": "..."}],
    "questionIds": []
  }
}
```
