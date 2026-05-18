# Blueprint Prompt (reference — not yet loaded from disk)

Used by: `createPlan()` in `src/generation.ts`
Status: Logic is inline in `blueprint.ts`. Move here when externalising.

## Purpose
Given a target question count, produce the domain/item-type/difficulty blueprint
that controls batch generation. Must preserve official GH-600 domain weightings.

## Key constraints
- Domain weights: A=18%, B=23%, C=12%, D=17%, E=18%, F=12%
- Always include at least 1 case study if total >= 25 questions
- Always include multi-select if total >= 10 questions
- Difficulty skew: 30% medium / 50% hard / 20% very_hard
