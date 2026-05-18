import { test, expect, Page } from "@playwright/test";

// ── helpers ──────────────────────────────────────────────────────────────────

async function answerCurrentQuestion(page: Page) {
  const card = page.locator("#questionCard");

  // sequence_order — just leave default order (still clickable)
  const seqList = card.locator("#seqList");
  if (await seqList.isVisible()) {
    // press down arrow on first item to exercise the buttons
    const downBtn = seqList.locator("[data-seq-down]").first();
    if (await downBtn.isVisible()) await downBtn.click();
    return;
  }

  // matching_magnet — pick first choice for every row select
  const matchSelects = card.locator(".match-select");
  if ((await matchSelects.count()) > 0) {
    for (let i = 0; i < (await matchSelects.count()); i++) {
      const sel = matchSelects.nth(i);
      const opts = sel.locator("option");
      const optCount = await opts.count();
      if (optCount > 1) await sel.selectOption({ index: 1 });
    }
    return;
  }

  // dropdown_completion — pick first real option for every dc-select
  const dcSelects = card.locator(".dc-select");
  if ((await dcSelects.count()) > 0) {
    for (let i = 0; i < (await dcSelects.count()); i++) {
      const sel = dcSelects.nth(i);
      const opts = sel.locator("option");
      const optCount = await opts.count();
      if (optCount > 1) await sel.selectOption({ index: 1 });
    }
    return;
  }

  // single_choice / multi_select / code_or_config_artifact / policy_control_selection
  // — click the second option button (avoid always choosing A)
  const optBtns = card.locator(".option-btn");
  const count = await optBtns.count();
  if (count >= 2) {
    await optBtns.nth(1).click();
    // multi_select: also click a third if available
    if (count >= 3) {
      const btnText = await page.locator("#questionCard").textContent();
      if (btnText?.includes("Select TWO") || btnText?.includes("Select THREE")) {
        await optBtns.nth(2).click();
      }
    }
  } else if (count === 1) {
    await optBtns.first().click();
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function startFirstExam(page: Page) {
  await page.goto("/");
  await expect(page.locator("#examList")).toBeVisible({ timeout: 10_000 });
  // Click the "Take Exam" button on the first exam card
  const takeBtn = page.locator("[data-exam-id]").first();
  await expect(takeBtn).toBeVisible({ timeout: 10_000 });
  await takeBtn.click();
  await expect(page.locator("#view-exam")).toBeVisible({ timeout: 10_000 });
}

// ── tests ────────────────────────────────────────────────────────────────────

test.describe("GH-600 exam flow", () => {
  test("loads exam list and shows at least one exam", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#examList")).toBeVisible({ timeout: 10_000 });
    const takeBtn = page.locator("[data-exam-id]").first();
    await expect(takeBtn).toBeVisible({ timeout: 10_000 });
    await expect(takeBtn).toHaveText(/take exam/i);
  });

  test("completes full exam: all question types, submit, results screen", async ({ page }) => {
    // ── 1. Start exam ──────────────────────────────────────────────────────
    await startFirstExam(page);

    // ── 2. Answer all 20 questions ─────────────────────────────────────────
    const nextBtn = page.locator("#nextBtn");
    const prevBtn = page.locator("#prevBtn");
    let questionNumber = 1;

    while (true) {
      // Wait for question card to stabilize
      await page.waitForTimeout(300);

      const card = page.locator("#questionCard");
      await expect(card).toBeVisible({ timeout: 5_000 });

      // Verify case study panel renders for case-study questions
      const csPanel = page.locator(".case-study-panel");
      if (await csPanel.isVisible()) {
        await expect(csPanel.locator(".cs-header")).toBeVisible();
        const sections = csPanel.locator(".cs-section");
        await expect(sections.first()).toBeVisible();
      }

      // Answer the question
      await answerCurrentQuestion(page);
      await page.waitForTimeout(200);

      questionNumber++;

      // Check if next button is visible and not submit
      const isLastQuestion = await page.locator("#submitBtn").isVisible();
      if (isLastQuestion) break;

      if (await nextBtn.isVisible()) {
        await nextBtn.click();
      } else {
        break;
      }

      if (questionNumber > 25) break; // safety
    }

    // ── 3. Submit exam ─────────────────────────────────────────────────────
    const submitBtn = page.locator("#submitBtn");
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // ── 4. Verify results screen ───────────────────────────────────────────
    await expect(page.locator("#view-results")).toBeVisible({ timeout: 10_000 });

    // Score percentage should be between 0–100%
    const scorePct = page.locator("#scorePercent");
    await expect(scorePct).toBeVisible();
    const pctText = await scorePct.textContent();
    const pct = parseInt(pctText ?? "999", 10);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);

    // Score summary should show N / 20 correct
    const summary = page.locator("#scoreSummary");
    await expect(summary).toBeVisible();
    await expect(summary).toContainText(/\d+ \/ \d+ correct/);

    // Domain breakdown should exist and all percentages should be 0–100%
    const breakdown = page.locator("#domainBreakdown, .domain-breakdown");
    await expect(breakdown.first()).toBeVisible();
    const barWidths = breakdown.locator(".domain-bar, .bar-fill, [style*='width']");
    // check no absurd overflow values
    const barCount = await barWidths.count();
    for (let i = 0; i < barCount; i++) {
      const style = await barWidths.nth(i).getAttribute("style") ?? "";
      const match = style.match(/width:\s*([\d.]+)%/);
      if (match) {
        expect(parseFloat(match[1])).toBeLessThanOrEqual(100);
      }
    }
  });

  test("review answers: case study panel and explanation render correctly", async ({ page }) => {
    await startFirstExam(page);

    // Answer all questions quickly
    const nextBtn = page.locator("#nextBtn");
    for (let i = 0; i < 25; i++) {
      await page.waitForTimeout(200);
      await answerCurrentQuestion(page);
      const isLast = await page.locator("#submitBtn").isVisible();
      if (isLast) break;
      if (await nextBtn.isVisible()) await nextBtn.click();
    }

    await page.locator("#submitBtn").click();
    await expect(page.locator("#view-results")).toBeVisible({ timeout: 10_000 });

    // Click "Review answers"
    const reviewBtn = page.locator("button, .btn").filter({ hasText: /review/i }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    await expect(page.locator("#view-review")).toBeVisible({ timeout: 5_000 });

    // Expand first review item
    const firstItem = page.locator(".review-item").first();
    await expect(firstItem).toBeVisible();
    await firstItem.locator(".review-item-header").click();
    await page.waitForTimeout(300);

    const reviewBody = firstItem.locator(".review-body");
    await expect(reviewBody).toBeVisible();

    // Explanation block should exist
    await expect(firstItem.locator(".explanation-block")).toBeVisible();

    // Find a case study question and verify the panel
    const reviewItems = page.locator(".review-item");
    const count = await reviewItems.count();
    for (let i = 0; i < count; i++) {
      const item = reviewItems.nth(i);
      await item.locator(".review-item-header").click();
      await page.waitForTimeout(200);
      const csPanel = item.locator(".case-study-panel");
      if (await csPanel.isVisible()) {
        await expect(csPanel.locator(".cs-header")).toBeVisible();
        console.log(`✅ Case study panel found in review item ${i + 1}`);
        break;
      }
    }
  });

  test("matching_magnet question renders selects not empty inputs", async ({ page }) => {
    await startFirstExam(page);

    const nextBtn = page.locator("#nextBtn");
    // Walk through questions looking for a matching_magnet
    let found = false;
    for (let i = 0; i < 25; i++) {
      await page.waitForTimeout(200);
      const matchSelects = page.locator("#questionCard .match-select");
      if ((await matchSelects.count()) > 0) {
        // Should render <select> elements, not plain text inputs
        await expect(matchSelects.first()).toBeVisible();
        const firstOpt = matchSelects.first().locator("option").nth(1);
        await expect(firstOpt).toBeDefined();
        const optText = await firstOpt.textContent();
        expect(optText?.trim().length).toBeGreaterThan(0);
        console.log(`✅ matching_magnet has ${await matchSelects.count()} selects, first option: "${optText}"`);
        found = true;
        break;
      }
      const isLast = await page.locator("#submitBtn").isVisible();
      if (isLast) break;
      if (await nextBtn.isVisible()) await nextBtn.click();
    }
    if (!found) console.log("ℹ️  No matching_magnet question reached in this run");
  });

  test("case study panel shows sections on case study questions", async ({ page }) => {
    await startFirstExam(page);

    const nextBtn = page.locator("#nextBtn");
    let found = false;
    for (let i = 0; i < 25; i++) {
      await page.waitForTimeout(200);
      const csPanel = page.locator("#questionCard .case-study-panel");
      if (await csPanel.isVisible()) {
        await expect(csPanel.locator(".cs-header")).toBeVisible();
        const sections = csPanel.locator(".cs-section");
        const sectionCount = await sections.count();
        expect(sectionCount).toBeGreaterThanOrEqual(1);
        // Toggle a section
        await sections.first().locator("summary").click();
        console.log(`✅ Case study panel with ${sectionCount} sections found at Q${i + 1}`);
        found = true;
        break;
      }
      const isLast = await page.locator("#submitBtn").isVisible();
      if (isLast) break;
      if (await nextBtn.isVisible()) await nextBtn.click();
    }
    expect(found).toBe(true);
  });
});
