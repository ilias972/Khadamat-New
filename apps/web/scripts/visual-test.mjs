/**
 * Visual Test Script — Khadamat Homepage
 *
 * Usage: node apps/web/scripts/visual-test.mjs [--url http://localhost:3000]
 *
 * Prend des screenshots responsive et vérifie les basiques UX.
 * Requiert: npx puppeteer (installé automatiquement)
 */

import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, '..', 'screenshots');

const BASE_URL = process.argv.find(a => a.startsWith('http')) || 'http://localhost:3000';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'login', path: '/auth/login' },
  { name: 'register', path: '/auth/register' },
];

async function run() {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  for (const viewport of VIEWPORTS) {
    for (const page of PAGES) {
      const tab = await browser.newPage();
      await tab.setViewport({ width: viewport.width, height: viewport.height });

      const url = `${BASE_URL}${page.path}`;
      console.log(`[${viewport.name}] ${url}`);

      try {
        await tab.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      } catch {
        console.log(`  WARN: timeout on ${url}, taking screenshot anyway`);
      }

      // Screenshot
      const filename = `${page.name}-${viewport.name}.png`;
      await tab.screenshot({
        path: join(SCREENSHOTS_DIR, filename),
        fullPage: true,
      });
      console.log(`  -> ${filename}`);

      // Basic checks on homepage
      if (page.path === '/') {
        const checks = await tab.evaluate(() => {
          const issues = [];

          // Check: no nested <a><button> or <button><a>
          document.querySelectorAll('a button, button a').forEach((el) => {
            issues.push(`Nested interactive: <${el.parentElement?.tagName}><${el.tagName}> — "${el.textContent?.trim().slice(0, 40)}"`);
          });

          // Check: labels have htmlFor
          document.querySelectorAll('label').forEach((label) => {
            if (!label.htmlFor && !label.querySelector('input, select, textarea')) {
              issues.push(`Label without htmlFor: "${label.textContent?.trim().slice(0, 40)}"`);
            }
          });

          // Check: disabled button has title
          document.querySelectorAll('button[disabled]').forEach((btn) => {
            if (!btn.title) {
              issues.push(`Disabled button without title tooltip: "${btn.textContent?.trim().slice(0, 40)}"`);
            }
          });

          // Check: inputs have id
          document.querySelectorAll('select, input[type="text"], input[type="email"]').forEach((input) => {
            if (!input.id) {
              issues.push(`Input/Select without id: placeholder="${input.placeholder || 'none'}"`);
            }
          });

          return issues;
        });

        if (checks.length > 0) {
          console.log(`  ISSUES (${viewport.name}):`);
          checks.forEach((c) => console.log(`    - ${c}`));
        } else {
          console.log(`  OK: no a11y issues detected`);
        }

        results.push({ viewport: viewport.name, page: page.name, issues: checks });
      }

      await tab.close();
    }
  }

  await browser.close();

  // Summary
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  console.log(`\n========== SUMMARY ==========`);
  console.log(`Screenshots: ${SCREENSHOTS_DIR}/`);
  console.log(`Pages tested: ${PAGES.length} x ${VIEWPORTS.length} viewports`);
  console.log(`A11y issues found: ${totalIssues}`);

  if (totalIssues > 0) {
    console.log(`\nFailed checks:`);
    results.filter(r => r.issues.length > 0).forEach(r => {
      r.issues.forEach(i => console.log(`  [${r.viewport}] ${i}`));
    });
  }

  process.exit(totalIssues > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(2);
});
