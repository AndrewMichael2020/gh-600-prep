# OpenAI API Usage Reference

Last updated: 2026-05-18

How this app uses the OpenAI API — where, why, and with what parameters.

---

## When the API is called

The API is called **only** during `npm run generate` (developer-only).  
The server never calls OpenAI at runtime. Users are served pre-generated exams from `data/`.

```
Developer:  npm run generate → generateBatch() → OpenAI API → data/exams/
User:       browser → GET /api/exams/:id → data/exams/ (no API call)
```

---

## Entry point

`src/generation.ts` → `generateWithOpenAI()` → called once per batch by `generateBatch()`

A 30-question exam produces ~4 batches (one per domain group).  
A 100-question exam produces ~9 batches (domains + case studies + special types).

---

## API method

```typescript
client.responses.create(params)   // OpenAI Responses API
```

Used for `gpt-5.5` and `o`-series models (detected by `/^o\d|^gpt-5/`).  
Falls back to `client.chat.completions.create` for `gpt-4o` / `gpt-4o-mini`.

---

## Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| `model` | `gpt-5.5` | Default; override with `OPENAI_MODEL` env var |
| `text.format.type` | `json_object` | Enforces JSON-only output; the word "json" must appear in the prompt |
| `reasoning.effort` | `"medium"` | Default; override with `OPENAI_REASONING_EFFORT` |
| `tools` | `[{ type: "web_search_preview" }]` | Lets the model look up current GitHub/Microsoft docs during generation |
| `input` | message array `[system, user]` | System prompt sets exam-architect persona; user message carries batch spec + domain knowledge |

---

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENAI_API_KEY` | *(required)* | Server-side only — never sent to the browser |
| `OPENAI_MODEL` | `gpt-5.5` | Model used for question generation |
| `OPENAI_REASONING_EFFORT` | `medium` | Reasoning effort for generation batches |
| `OPENAI_REVIEW_REASONING_EFFORT` | `high` | Reserved for future review/adjudication pass |

Set these in `.env` for local development. In Cloud Run, inject `OPENAI_API_KEY` from Secret Manager.

---

## What goes into each API call

Each call generates one batch (a domain slice or special item-type group):

1. **System prompt** — loaded from `prompts/generate-batch.prompt.md` (above `<!-- END_SYSTEM -->`):  
   exam-architect persona, output-only-JSON rule, instruction to use web search, links to study guide.

2. **User message** — the rest of the template, with these variables substituted:

   | Variable | Source |
   |----------|--------|
   | `{{DOMAIN_ID}}` / `{{DOMAIN_NAME}}` | `domainMap` in `generation.ts` — official GH-600 names |
   | `{{DOMAIN_KNOWLEDGE}}` | `prompts/knowledge/domain-{A-F}.md` loaded by `loadDomainKnowledge()` |
   | `{{QUESTION_COUNT}}` | Batch plan |
   | `{{ITEM_TYPES}}` | Batch plan (e.g. `single_choice, multi_select`) |
   | `{{DIFFICULTIES}}` | Batch plan |
   | `{{AVOID_STEMS}}` | First 15 stems already generated — prevents duplicates |
   | `{{CORRECT_ANSWER_TARGETS}}` | Cycled A/B/C/D distribution hint |
   | `{{TIMESTAMP}}` / `{{MODEL}}` / `{{REASONING_EFFORT}}` | Runtime values |

---

## Knowledge grounding

Before the API is called, `loadDomainKnowledge(domainId)` reads
`prompts/knowledge/domain-{X}.md` — a file containing the exact GH-600 study-guide
sub-skills for that domain plus key technical details from official GitHub Docs and
Microsoft Learn. This is injected directly into the prompt as authoritative context.

The model also has `web_search_preview` enabled, so it can autonomously search for
specific documentation snippets (configuration syntax, feature behavior, etc.) during
generation without requiring pre-fetching.

Run `npm run fetch-knowledge` to refresh all knowledge files from the live sources:
- `https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600`
- `https://docs.github.com/en/copilot` (6 domain-specific pages)
- 3 Microsoft Learn training modules

---

## Output shape expected

```jsonc
{
  "questions": [
    {
      "examCode": "GH-600",
      "domainId": "B",
      "domainName": "Implement tool use and environment interaction",
      "objectiveTags": ["mcp-allow-list", "least-privilege"],
      "type": "single_choice",
      "difficulty": "hard",
      "stem": "...",
      "scenario": "...",
      "options": [{ "id": "A", "text": "..." }, ...],
      "correctAnswer": "C",
      "explanation": {
        "whyCorrect": "...",
        "whyDistractorsWrong": { "A": "...", "B": "...", "D": "..." },
        "examStrategyNote": "..."
      },
      "sourceRefs": [{ "title": "...", "url": "...", "docType": "official_docs" }]
    }
  ]
}
```

Parsed in `generateWithOpenAI()` → validated by `validateBatch()` → assembled by `assembleExam()` → saved by `saveExam()`.

---

## Cost and call volume

| Exam size | Approx. batches | Approx. API calls |
|-----------|----------------|-------------------|
| 30 questions | 4 | 4 |
| 70 questions | 7 | 7 |
| 100 questions | 9 | 9 |

Each batch produces 3–8 questions. With `web_search_preview` enabled, the model may
make additional search tool calls internally (billed as output tokens by OpenAI).

---

## Security

- `OPENAI_API_KEY` is read from `process.env` in `src/config.ts` and passed only to the OpenAI SDK client — it never touches any HTTP response or frontend asset.
- `GET /api/config` returns `{ hasApiKey: true/false }` — the key value is never returned.
- Tests run without any API key (`tests/fixtures/questions.ts` provides static fixture questions).
- CI does not require or use `OPENAI_API_KEY`.
