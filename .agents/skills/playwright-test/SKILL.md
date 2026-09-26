---
name: playwright-test
description: >-
  Inspect, screenshot, and test web user interfaces using Playwright or headless browser automation.
  Use when validating UI changes, capturing multi-viewport screenshots (mobile/desktop),
  or running end-to-end verification tests.
---

# 🌐 Playwright UI Inspection & Testing Skill

Guidelines and script patterns to inspect the live interface, take visual regression screenshots, and run automated end-to-end tests across responsive viewports.

---

## 1. Quick Inspection Commands

To run an automated inspection or capture full-page responsive screenshots:

### A. Run Playwright Tests
```bash
# Run all E2E tests headless
npx playwright test

# Run a specific test file
npx playwright test tests/tender-flow.spec.ts --headed
```

### B. Capture Multi-Viewport Screenshots Script
Create a quick script `scripts/capture-ui.js`:
```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // 1. Desktop Viewport
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'screenshots/desktop-home.png', fullPage: true });

  // 2. Mobile Viewport (iPhone 14)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'screenshots/mobile-home.png' });

  await browser.close();
  console.log('✅ UI Screenshots captured successfully.');
})();
```

---

## 2. Core User Flows to Verify

1. **Home Page Flow:**
   - Active tenders load immediately without layout shift.
   - Category pill bar scrolls smoothly.
   - Filter tabs (`🟢 Live Bids`, `🛡️ No Bid Bond`, `🏆 Awarded`) filter the table in real time.
2. **Tender Detail Flow:**
   - Clicking a tender row navigates to `/tender/[id]`.
   - Technical specifications and goods items table loads with search and CSV export.
   - Document "👁️ Текст унших" button opens the text preview modal.
   - AI quick prompt buttons trigger the assistant response.
3. **Responsive Verification:**
   - Test at 375px (mobile), 768px (tablet), 1280px (desktop), 1600px (ultrawide).
