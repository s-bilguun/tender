#!/usr/bin/env node
/**
 * Visual check: screenshots of the main screens in light + dark, desktop + mobile.
 *
 *   node scripts/dev/shots.cjs [baseUrl] [outDir]
 *   e.g. node scripts/dev/shots.cjs http://localhost:3007 /tmp/shots
 *
 * Requires Playwright (`require('playwright')`). Locally (no Supabase keys) the
 * app falls back to lib/live-tenders.json, so tender 1789954114561 exists.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const base = process.argv[2] || 'http://localhost:3007';
const out = process.argv[3] || '/tmp/shots';
const DETAIL_ID = process.env.SHOT_DETAIL_ID || '1789954114561';
fs.mkdirSync(out, { recursive: true });

const shots = [
  { name: 'home', url: '/?lang=mn' },
  { name: 'home-zh', url: '/?lang=zh' },
  { name: 'home-en', url: '/?lang=en' },
  { name: 'list', url: '/?lang=mn', scroll: 1100 },
  { name: 'slideover', url: '/?lang=mn', scroll: 1100, clickFirstCard: true },
  { name: 'detail', url: `/tender/${DETAIL_ID}?lang=mn` },
  { name: 'detail-mid', url: `/tender/${DETAIL_ID}?lang=mn`, scroll: 1000, windowScroll: true },
  { name: 'detail-low', url: `/tender/${DETAIL_ID}?lang=mn`, scroll: 2200, windowScroll: true },
];

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const errors = [];
  for (const theme of ['light', 'dark']) {
    for (const vp of [{ tag: 'desk', width: 1440, height: 900 }, { tag: 'mob', width: 390, height: 844 }]) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      await ctx.addInitScript((t) => { try { localStorage.setItem('tenderhub_theme', t); } catch {} }, theme);
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(`${theme}/${vp.tag}: ${e.message}`));
      for (const s of shots) {
        if (vp.tag === 'mob' && /mid|low|zh|en/.test(s.name)) continue;
        await page.goto(base + s.url, { waitUntil: 'networkidle', timeout: 120000 });
        await page.waitForTimeout(1500);
        if (s.scroll) {
          await page.evaluate(({ y, win }) => { const m = document.querySelector('main'); (win || !m ? window : m).scrollBy(0, y); }, { y: s.scroll, win: !!s.windowScroll });
          await page.waitForTimeout(500);
        }
        if (s.clickFirstCard) {
          const h = page.locator('main h3').first();
          if (await h.count()) { await h.click(); await page.waitForTimeout(2000); }
        }
        const file = path.join(out, `${s.name}-${theme}-${vp.tag}.png`);
        await page.screenshot({ path: file });
        console.log(file);
      }
      await ctx.close();
    }
  }
  await browser.close();
  if (errors.length) { console.log('PAGE ERRORS:\n' + errors.join('\n')); process.exitCode = 1; }
})();
