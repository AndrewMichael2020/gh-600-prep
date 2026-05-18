# Validation Prompt (reference — not yet loaded from disk)

Used by: `validateBatch()` in `src/generation.ts`
Status: Validation logic is inline. Move here when upgrading to LLM-based validation.

## Purpose
Review each generated question for: correct answer defensibility, distractor plausibility,
length-bias, absolute wording, source citation quality, and scenario-first structure.

## Returns (JSON)
```json
{
  "questions": [
    {
      "id": "...",
      "validationStatus": "validated | needs_review | rejected",
      "issues": ["Missing source refs", "Correct answer at position A four times in batch"]
    }
  ]
}
```
