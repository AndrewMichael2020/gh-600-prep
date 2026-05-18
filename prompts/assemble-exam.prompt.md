# Exam Assembly Prompt (reference -- not yet loaded from disk)

Used by: `assembleExam()` in `src/generation.ts`
Status: Assembly logic is inline. Move here when adding LLM-assisted assembly.

## Purpose
Take validated question batches and assemble into a final exam:
- Interleave domain groups to avoid domain fatigue
- Group case study questions together
- Ensure difficulty curve (medium early, very_hard late)
- Apply final anti-bias check on assembled order

## Returns (JSON)
```json
{
  "examSet": { "id": "...", "questions": [...], "caseStudies": [...], "antiBias": {...} }
}
```
