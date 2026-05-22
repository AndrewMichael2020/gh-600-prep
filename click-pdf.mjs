import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  
  // Click the first "Generate PDF" button (from the first exam card)
  const generatePdfButtons = await page.locator('text=Generate PDF').all();
  console.log(`Found ${generatePdfButtons.length} "Generate PDF" buttons`);
  
  if (generatePdfButtons.length > 0) {
    await generatePdfButtons[0].click();
    console.log('Clicked first Generate PDF button');
    
    // Wait a few seconds for any UI changes
    await page.waitForTimeout(3000);
    
    // Take screenshot after clicking
    await page.screenshot({ path: '/tmp/ui-after-pdf-click.png', fullPage: true });
    console.log('Screenshot saved after PDF click');
  }
  
  await browser.close();
})();
