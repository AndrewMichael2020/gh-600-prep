# Anti-Bias Review Prompt (reference -- not yet loaded from disk)

Used by: `computeAntiBias()` in `src/antiBias.ts`
Status: Metrics are computed inline. Move here when upgrading to LLM-based bias review.

## Purpose
Assess answer-position and length-bias leakage across the assembled exam set.

## Checks
- Answer position distribution: each of A/B/C/D should be correct ~25% of the time
- Longest-option-is-correct ratio: must stay <= 30%
- Absolute wording ("always"/"never") prevalence across stems and options

## Returns (JSON)
```json
{
  "answerPositionDistribution": {"A": 0.24, "B": 0.27, "C": 0.25, "D": 0.24},
  "longestOptionCorrectRatio": 0.18,
  "flags": ["Domain B batch: correct answer at C in 4/5 questions"]
}
```
