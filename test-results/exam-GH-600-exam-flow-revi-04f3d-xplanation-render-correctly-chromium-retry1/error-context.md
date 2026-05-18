# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: exam.spec.ts >> GH-600 exam flow >> review answers: case study panel and explanation render correctly
- Location: tests/e2e/exam.spec.ts:154:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#examView')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#examView')

```

```yaml
- banner: "Domain A: Prepare agent architecture and SDLC processes sequence order hard Q 1 / 20 23:55"
- paragraph: A core services team wants Copilot cloud agent to handle medium-risk logging and test-coverage improvements without allowing unreviewed changes into the default branch. The team needs an SDLC sequence that separates planning from execution and keeps GitHub as the review and audit surface. In what order should the team implement the workflow?
- text: The repository already uses pull requests, GitHub Actions checks, and CODEOWNERS. The new process should preserve delivery speed while making agent plans, diffs, validations, and approvals inspectable.
- paragraph: "Drag or use arrows to set the correct order:"
- list:
  - listitem:
    - text: 1. Configure the agent prompt to emit a structured plan before proposing code changes.
    - button "↑"
    - button "↓"
  - listitem:
    - text: 2. Evaluate the PR using required checks, session logs, and human review before merge.
    - button "↑"
    - button "↓"
  - listitem:
    - text: 3. Define task inputs, expected artifacts, success criteria, and approval checkpoints.
    - button "↑"
    - button "↓"
  - listitem:
    - text: 4. Allow approved work to proceed on an agent branch with commits and a PR.
    - button "↑"
    - button "↓"
  - listitem:
    - text: 5. Add repository controls for required PRs, status checks, and CODEOWNERS review.
    - button "↑"
    - button "↓"
- text: "Confidence:"
- combobox:
  - option "Not set" [selected]
  - option "Guessed"
  - option "Somewhat confident"
  - option "Confident"
- contentinfo:
  - button "← Prev"
  - button "1"
  - button "2"
  - button "3"
  - button "4"
  - button "5"
  - button "6"
  - button "7"
  - button "8"
  - button "9"
  - button "10"
  - button "11"
  - button "12"
  - button "13"
  - button "14"
  - button "15"
  - button "16"
  - button "17"
  - button "18"
  - button "19"
  - button "20"
  - button "Next →"
  - button "🚩"
  - button "Submit"
```

# Test source

```ts
  57  | }
  58  | 
  59  | // ── tests ────────────────────────────────────────────────────────────────────
  60  | 
  61  | test.describe("GH-600 exam flow", () => {
  62  |   test("loads exam list and shows at least one exam", async ({ page }) => {
  63  |     await page.goto("/");
  64  |     await expect(page.locator("#examList")).toBeVisible();
  65  |     const examCards = page.locator(".exam-card, [data-exam-id]");
  66  |     await expect(examCards.first()).toBeVisible({ timeout: 10_000 });
  67  |   });
  68  | 
  69  |   test("completes full exam: all question types, submit, results screen", async ({ page }) => {
  70  |     // ── 1. Start exam ──────────────────────────────────────────────────────
  71  |     await page.goto("/");
  72  |     await expect(page.locator("#examList")).toBeVisible();
  73  | 
  74  |     const startBtn = page.locator("button, .btn").filter({ hasText: /start|take exam|begin/i }).first();
  75  |     await startBtn.click();
  76  | 
  77  |     await expect(page.locator("#examView")).toBeVisible({ timeout: 5_000 });
  78  | 
  79  |     // ── 2. Answer all 20 questions ─────────────────────────────────────────
  80  |     const nextBtn = page.locator("#nextBtn");
  81  |     const prevBtn = page.locator("#prevBtn");
  82  |     let questionNumber = 1;
  83  | 
  84  |     while (true) {
  85  |       // Wait for question card to stabilize
  86  |       await page.waitForTimeout(300);
  87  | 
  88  |       const card = page.locator("#questionCard");
  89  |       await expect(card).toBeVisible({ timeout: 5_000 });
  90  | 
  91  |       // Verify case study panel renders for case-study questions
  92  |       const csPanel = page.locator(".case-study-panel");
  93  |       if (await csPanel.isVisible()) {
  94  |         await expect(csPanel.locator(".cs-header")).toBeVisible();
  95  |         const sections = csPanel.locator(".cs-section");
  96  |         await expect(sections.first()).toBeVisible();
  97  |       }
  98  | 
  99  |       // Answer the question
  100 |       await answerCurrentQuestion(page);
  101 |       await page.waitForTimeout(200);
  102 | 
  103 |       questionNumber++;
  104 | 
  105 |       // Check if next button is visible and not submit
  106 |       const isLastQuestion = await page.locator("#submitBtn").isVisible();
  107 |       if (isLastQuestion) break;
  108 | 
  109 |       if (await nextBtn.isVisible()) {
  110 |         await nextBtn.click();
  111 |       } else {
  112 |         break;
  113 |       }
  114 | 
  115 |       if (questionNumber > 25) break; // safety
  116 |     }
  117 | 
  118 |     // ── 3. Submit exam ─────────────────────────────────────────────────────
  119 |     const submitBtn = page.locator("#submitBtn");
  120 |     await expect(submitBtn).toBeVisible();
  121 |     await submitBtn.click();
  122 | 
  123 |     // ── 4. Verify results screen ───────────────────────────────────────────
  124 |     await expect(page.locator("#resultsView")).toBeVisible({ timeout: 10_000 });
  125 | 
  126 |     // Score percentage should be between 0–100%
  127 |     const scorePct = page.locator("#scorePercent");
  128 |     await expect(scorePct).toBeVisible();
  129 |     const pctText = await scorePct.textContent();
  130 |     const pct = parseInt(pctText ?? "999", 10);
  131 |     expect(pct).toBeGreaterThanOrEqual(0);
  132 |     expect(pct).toBeLessThanOrEqual(100);
  133 | 
  134 |     // Score summary should show N / 20 correct
  135 |     const summary = page.locator("#scoreSummary");
  136 |     await expect(summary).toBeVisible();
  137 |     await expect(summary).toContainText(/\d+ \/ \d+ correct/);
  138 | 
  139 |     // Domain breakdown should exist and all percentages should be 0–100%
  140 |     const breakdown = page.locator("#domainBreakdown, .domain-breakdown");
  141 |     await expect(breakdown.first()).toBeVisible();
  142 |     const barWidths = breakdown.locator(".domain-bar, .bar-fill, [style*='width']");
  143 |     // check no absurd overflow values
  144 |     const barCount = await barWidths.count();
  145 |     for (let i = 0; i < barCount; i++) {
  146 |       const style = await barWidths.nth(i).getAttribute("style") ?? "";
  147 |       const match = style.match(/width:\s*([\d.]+)%/);
  148 |       if (match) {
  149 |         expect(parseFloat(match[1])).toBeLessThanOrEqual(100);
  150 |       }
  151 |     }
  152 |   });
  153 | 
  154 |   test("review answers: case study panel and explanation render correctly", async ({ page }) => {
  155 |     await page.goto("/");
  156 |     await page.locator("button, .btn").filter({ hasText: /start|take exam|begin/i }).first().click();
> 157 |     await expect(page.locator("#examView")).toBeVisible({ timeout: 5_000 });
      |                                             ^ Error: expect(locator).toBeVisible() failed
  158 | 
  159 |     // Answer all questions quickly
  160 |     const nextBtn = page.locator("#nextBtn");
  161 |     for (let i = 0; i < 25; i++) {
  162 |       await page.waitForTimeout(200);
  163 |       await answerCurrentQuestion(page);
  164 |       const isLast = await page.locator("#submitBtn").isVisible();
  165 |       if (isLast) break;
  166 |       if (await nextBtn.isVisible()) await nextBtn.click();
  167 |     }
  168 | 
  169 |     await page.locator("#submitBtn").click();
  170 |     await expect(page.locator("#resultsView")).toBeVisible({ timeout: 10_000 });
  171 | 
  172 |     // Click "Review answers"
  173 |     const reviewBtn = page.locator("button, .btn").filter({ hasText: /review/i }).first();
  174 |     await expect(reviewBtn).toBeVisible();
  175 |     await reviewBtn.click();
  176 | 
  177 |     await expect(page.locator("#reviewView")).toBeVisible({ timeout: 5_000 });
  178 | 
  179 |     // Expand first review item
  180 |     const firstItem = page.locator(".review-item").first();
  181 |     await expect(firstItem).toBeVisible();
  182 |     await firstItem.locator(".review-item-header").click();
  183 |     await page.waitForTimeout(300);
  184 | 
  185 |     const reviewBody = firstItem.locator(".review-body");
  186 |     await expect(reviewBody).toBeVisible();
  187 | 
  188 |     // Explanation block should exist
  189 |     await expect(firstItem.locator(".explanation-block")).toBeVisible();
  190 | 
  191 |     // Find a case study question and verify the panel
  192 |     const reviewItems = page.locator(".review-item");
  193 |     const count = await reviewItems.count();
  194 |     for (let i = 0; i < count; i++) {
  195 |       const item = reviewItems.nth(i);
  196 |       await item.locator(".review-item-header").click();
  197 |       await page.waitForTimeout(200);
  198 |       const csPanel = item.locator(".case-study-panel");
  199 |       if (await csPanel.isVisible()) {
  200 |         await expect(csPanel.locator(".cs-header")).toBeVisible();
  201 |         console.log(`✅ Case study panel found in review item ${i + 1}`);
  202 |         break;
  203 |       }
  204 |     }
  205 |   });
  206 | 
  207 |   test("matching_magnet question renders selects not empty inputs", async ({ page }) => {
  208 |     await page.goto("/");
  209 |     await page.locator("button, .btn").filter({ hasText: /start|take exam|begin/i }).first().click();
  210 |     await expect(page.locator("#examView")).toBeVisible({ timeout: 5_000 });
  211 | 
  212 |     const nextBtn = page.locator("#nextBtn");
  213 |     // Walk through questions looking for a matching_magnet
  214 |     let found = false;
  215 |     for (let i = 0; i < 25; i++) {
  216 |       await page.waitForTimeout(200);
  217 |       const matchSelects = page.locator("#questionCard .match-select");
  218 |       if ((await matchSelects.count()) > 0) {
  219 |         // Should render <select> elements, not plain text inputs
  220 |         await expect(matchSelects.first()).toBeVisible();
  221 |         const firstOpt = matchSelects.first().locator("option").nth(1);
  222 |         await expect(firstOpt).toBeDefined();
  223 |         const optText = await firstOpt.textContent();
  224 |         expect(optText?.trim().length).toBeGreaterThan(0);
  225 |         console.log(`✅ matching_magnet has ${await matchSelects.count()} selects, first option: "${optText}"`);
  226 |         found = true;
  227 |         break;
  228 |       }
  229 |       const isLast = await page.locator("#submitBtn").isVisible();
  230 |       if (isLast) break;
  231 |       if (await nextBtn.isVisible()) await nextBtn.click();
  232 |     }
  233 |     if (!found) console.log("ℹ️  No matching_magnet question reached in this run");
  234 |   });
  235 | 
  236 |   test("case study panel shows sections on case study questions", async ({ page }) => {
  237 |     await page.goto("/");
  238 |     await page.locator("button, .btn").filter({ hasText: /start|take exam|begin/i }).first().click();
  239 |     await expect(page.locator("#examView")).toBeVisible({ timeout: 5_000 });
  240 | 
  241 |     const nextBtn = page.locator("#nextBtn");
  242 |     let found = false;
  243 |     for (let i = 0; i < 25; i++) {
  244 |       await page.waitForTimeout(200);
  245 |       const csPanel = page.locator("#questionCard .case-study-panel");
  246 |       if (await csPanel.isVisible()) {
  247 |         await expect(csPanel.locator(".cs-header")).toBeVisible();
  248 |         const sections = csPanel.locator(".cs-section");
  249 |         const sectionCount = await sections.count();
  250 |         expect(sectionCount).toBeGreaterThanOrEqual(1);
  251 |         // Toggle a section
  252 |         await sections.first().locator("summary").click();
  253 |         console.log(`✅ Case study panel with ${sectionCount} sections found at Q${i + 1}`);
  254 |         found = true;
  255 |         break;
  256 |       }
  257 |       const isLast = await page.locator("#submitBtn").isVisible();
```