# Weakness Drill Prompt (reference -- not yet loaded from disk)

Used by: `buildWeakDomainDrill()` in `src/studyLoops.ts`
Status: Selection logic is inline. Move here when adding LLM-curated drill explanation.

## Purpose
Given prior incorrect objective tags and domain scores, curate a targeted practice
drill focused on the candidate's weakest areas.

## Inputs
- Incorrect question IDs and their objective tags
- Domain score breakdown from the attempt
- Requested drill size

## Returns (JSON)
```json
{
  "drill": {
    "focusDomains": ["B", "D"],
    "focusTags": ["mcp-permissions", "evaluation-metrics"],
    "questions": [...]
  }
}
```
