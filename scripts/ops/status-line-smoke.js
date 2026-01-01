#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3080';
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
const artifactDir =
  process.env.SMOKE_ARTIFACT_DIR || path.join(process.cwd(), 'scripts', 'ops', 'artifacts');

if (!email || !password) {
  console.error('Missing SMOKE_EMAIL or SMOKE_PASSWORD.');
  process.exit(1);
}

const tempFilePath = path.join(os.tmpdir(), 'librechat-file-search-smoke.txt');
fs.writeFileSync(tempFilePath, 'File Search smoke test. Codeword: NIGHTRIDER-OK\n', 'utf8');

async function selectFileSearchUpload(page) {
  const attachButton = page.locator('#attach-file-menu-button');
  await attachButton.waitFor({ state: 'visible', timeout: 15000 });
  await attachButton.click();

  const menuItem = page.getByRole('menuitem', { name: /file search/i });
  if ((await menuItem.count()) > 0) {
    await menuItem.first().click();
    return;
  }

  const fallbackItem = page.getByText(/file search/i, { exact: false });
  if ((await fallbackItem.count()) > 0) {
    await fallbackItem.first().click();
    return;
  }

  throw new Error('File search upload option not found in attachment menu.');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('navVisible', 'true');
  });

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password"]').press('Enter');

  await page.waitForURL(`${baseUrl}/c/new*`, { timeout: 20000 });
  await page.goto(`${baseUrl}/c/new?endpoint=agents`, { waitUntil: 'networkidle' });

  await selectFileSearchUpload(page);

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(tempFilePath);

  const textInput = page.locator('[data-testid="text-input"]');
  await textInput.waitFor({ state: 'visible', timeout: 15000 });
  await textInput.fill(
    'Use file_search to find the codeword in the attached file. Reply with the codeword only.',
  );
  await textInput.press('Enter');

  const statusBeam = page.locator('.status-beam');
  await statusBeam.waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.status-beam');
      return el && /file search/i.test(el.textContent || '');
    },
    null,
    { timeout: 30000 },
  );

  fs.mkdirSync(artifactDir, { recursive: true });
  const screenshotPath = path.join(artifactDir, `status-line-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath });

  console.log(`Status line tool update detected. Screenshot saved: ${screenshotPath}`);
  await browser.close();
}

main().catch((error) => {
  console.error(`Status line smoke test failed: ${error.message}`);
  process.exit(1);
});
