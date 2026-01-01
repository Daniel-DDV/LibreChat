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

async function ensureFileSearchEnabled(page) {
  const fileSearchBadge = page.getByRole('button', { name: /file search/i });
  if ((await fileSearchBadge.count()) > 0) {
    const badge = fileSearchBadge.first();
    const pressed = await badge.getAttribute('aria-pressed');
    if (pressed === 'false') {
      await badge.click();
    }
    return;
  }

  const toolsButton = page.locator('#tools-dropdown-button');
  await toolsButton.waitFor({ state: 'visible', timeout: 15000 });
  await page.keyboard.press('Escape');
  await toolsButton.click({ force: true });

  const menuItem = page.getByRole('menuitem', { name: /file search/i });
  if ((await menuItem.count()) > 0) {
    await menuItem.first().click({ force: true });
    await page.keyboard.press('Escape');
    return;
  }

  const textItem = page.getByText(/file search/i, { exact: false });
  if ((await textItem.count()) > 0) {
    await textItem.first().click({ force: true });
    await page.keyboard.press('Escape');
    return;
  }

  throw new Error('File Search toggle not found.');
}

async function selectFileSearchUpload(page) {
  const attachButton = page.locator('#attach-file-menu-button');
  await attachButton.waitFor({ state: 'visible', timeout: 15000 });
  await attachButton.click();

  const fileSearchUpload = page.getByRole('menuitem', { name: /upload for file search/i });
  if ((await fileSearchUpload.count()) > 0) {
    await fileSearchUpload.first().click();
    return;
  }

  const textItem = page.getByText(/upload for file search/i, { exact: false });
  if ((await textItem.count()) > 0) {
    await textItem.first().click();
    return;
  }

  throw new Error('Upload for File Search option not found.');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let step = 'init';

  try {
    step = 'bootstrap';
    await page.addInitScript(() => {
      localStorage.setItem('i18nextLng', 'en');
      localStorage.setItem('navVisible', 'true');
    });

    step = 'login';
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="password"]').press('Enter');

    step = 'open-new-chat';
    await page.waitForURL(`${baseUrl}/c/new*`, { timeout: 20000 });
    await page.goto(`${baseUrl}/c/new`, { waitUntil: 'domcontentloaded', timeout: 60000 });

    step = 'enable-tool';
    await ensureFileSearchEnabled(page);
    await page.waitForTimeout(300);

    step = 'prepare-prompt';
    const tempFilePath = path.join(os.tmpdir(), 'librechat-file-search-smoke.txt');
    fs.writeFileSync(tempFilePath, 'File Search smoke test. Codeword: NIGHTRIDER-OK\n', 'utf8');

    await selectFileSearchUpload(page);
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(tempFilePath);

    const prompt = [
      'I opened the attached file but I cannot find the codeword.',
      '- I checked the first line',
      '- I checked the last line',
      'Please use file_search to find the codeword in the attached file. Reply with the codeword only.',
    ].join('\n');
    const statusPattern = /file|bestand|zoek|search/i;

    const sendButton = page.locator('#send-button');
    await sendButton.waitFor({ state: 'visible', timeout: 15000 });

    const textInput = page.locator('[data-testid="text-input"]');
    await textInput.waitFor({ state: 'visible', timeout: 15000 });
    await textInput.fill(prompt);

    step = 'wait-send-enabled';
    await page.waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        return el && !el.hasAttribute('disabled');
      },
      '#send-button',
      { timeout: 30000 },
    );

    await textInput.press('Enter');

    const statusBeam = page.locator('.status-beam');
    await statusBeam.waitFor({ state: 'visible', timeout: 20000 });

    try {
      step = 'wait-status-tool';
      await page.waitForFunction(
        (pattern) => {
          const el = document.querySelector('.status-beam');
          const text = (el?.textContent || '').toLowerCase();
          return new RegExp(pattern, 'i').test(text);
        },
        statusPattern.source,
        { timeout: 30000 },
      );
    } catch (error) {
      const statusText = ((await statusBeam.textContent()) || '').trim();
      fs.mkdirSync(artifactDir, { recursive: true });
      const failurePath = path.join(artifactDir, `status-line-failure-${Date.now()}.png`);
      await page.screenshot({ path: failurePath, fullPage: true });
      throw new Error(
        `Status line text did not match tool pattern. Saw: "${statusText}". Screenshot saved: ${failurePath}`,
      );
    }

    fs.mkdirSync(artifactDir, { recursive: true });
    const screenshotPath = path.join(artifactDir, `status-line-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath });

    console.log(`Status line tool update detected. Screenshot saved: ${screenshotPath}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Screenshot saved')) {
      throw error;
    }
    fs.mkdirSync(artifactDir, { recursive: true });
    const failurePath = path.join(artifactDir, `status-line-failure-${Date.now()}.png`);
    await page.screenshot({ path: failurePath, fullPage: true });
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Smoke test failed at step "${step}": ${message}. Screenshot saved: ${failurePath}`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`Status line smoke test failed: ${error.message}`);
  process.exit(1);
});
