#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3080';
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
const toolChoice = (process.env.SMOKE_TOOL || 'file').toLowerCase();
const artifactDir =
  process.env.SMOKE_ARTIFACT_DIR || path.join(process.cwd(), 'scripts', 'ops', 'artifacts');

if (!email || !password) {
  console.error('Missing SMOKE_EMAIL or SMOKE_PASSWORD.');
  process.exit(1);
}

const TOOL_MATCHERS = {
  web: [/web search/i, /webzoekopdracht/i],
  file: [/file search/i, /zoeken naar bestanden/i],
  code: [/code interpreter/i],
  uploadFileSearch: [/upload for file search/i, /upload.*bestand/i],
};

async function openToolsMenu(page) {
  const toolsButton = page.locator('#tools-dropdown-button');
  await toolsButton.waitFor({ state: 'visible', timeout: 15000 });
  await page.keyboard.press('Escape');
  await toolsButton.click({ force: true });
  const menu = page.locator('#tools-dropdown-menu');
  const opened = await menu.waitFor({ state: 'visible', timeout: 3000 }).then(
    () => true,
    () => false,
  );
  if (opened) {
    return menu;
  }

  await toolsButton.click({ force: true });
  await menu.waitFor({ state: 'visible', timeout: 3000 });
  return menu;
}

async function findMenuItem(page, matcherList) {
  const menu = await openToolsMenu(page);
  for (const matcher of matcherList) {
    const menuItem = menu.getByRole('menuitem', { name: matcher });
    if ((await menuItem.count()) > 0) {
      return menuItem.first();
    }
    const textItem = menu.getByText(matcher, { exact: false });
    if ((await textItem.count()) > 0) {
      return textItem.first();
    }
  }
  return null;
}

async function toggleToolFromMenu(page, matcherList) {
  const menuItem = await findMenuItem(page, matcherList);
  if (menuItem) {
    await menuItem.click({ force: true });
    await page.keyboard.press('Escape');
    return true;
  }

  await page.keyboard.press('Escape');
  return false;
}

async function toolExistsInMenu(page, matcherList) {
  const menuItem = await findMenuItem(page, matcherList);
  await page.keyboard.press('Escape');
  return !!menuItem;
}

async function toolExistsInBadge(page, matcherList) {
  for (const matcher of matcherList) {
    const badge = page.getByRole('button', { name: matcher });
    if ((await badge.count()) > 0) {
      return true;
    }
  }
  return false;
}

async function attachMenuHasFileSearch(page, matcherList) {
  const attachButton = page.locator('#attach-file-menu-button');
  await attachButton.waitFor({ state: 'visible', timeout: 15000 });
  await attachButton.click({ force: true });
  const menu = page.locator('#attach-file-menu');
  await menu.waitFor({ state: 'visible', timeout: 5000 });
  for (const matcher of matcherList) {
    const item = menu.getByText(matcher, { exact: false });
    if ((await item.count()) > 0) {
      await page.keyboard.press('Escape');
      return true;
    }
  }
  await page.keyboard.press('Escape');
  return false;
}

async function ensureWebSearchEnabled(page) {
  const webSearchBadge = page.getByRole('button', { name: TOOL_MATCHERS.web[0] });
  if ((await webSearchBadge.count()) > 0) {
    const badge = webSearchBadge.first();
    const pressed = await badge.getAttribute('aria-pressed');
    if (pressed === 'false') {
      await badge.click();
    }
    return;
  }

  const toggled = await toggleToolFromMenu(page, TOOL_MATCHERS.web);
  if (!toggled) {
    throw new Error('Web Search toggle not found.');
  }
}

async function ensureFileSearchEnabled(page) {
  const fileSearchBadge = page.getByRole('button', { name: TOOL_MATCHERS.file[0] });
  if ((await fileSearchBadge.count()) > 0) {
    const badge = fileSearchBadge.first();
    const pressed = await badge.getAttribute('aria-pressed');
    if (pressed === 'false') {
      await badge.click();
    }
    return;
  }

  const toggled = await toggleToolFromMenu(page, TOOL_MATCHERS.file);
  if (!toggled) {
    throw new Error('File Search toggle not found.');
  }
}

async function selectFileSearchUpload(page) {
  const attachButton = page.locator('#attach-file-menu-button');
  await attachButton.waitFor({ state: 'visible', timeout: 15000 });
  await attachButton.click();

  const menu = page.locator('#attach-file-menu');
  await menu.waitFor({ state: 'visible', timeout: 5000 });
  const fileSearchUpload = menu.getByRole('menuitem', { name: TOOL_MATCHERS.uploadFileSearch[0] });
  if ((await fileSearchUpload.count()) > 0) {
    await fileSearchUpload.first().click();
    return;
  }

  for (const matcher of TOOL_MATCHERS.uploadFileSearch) {
    const textItem = menu.getByText(matcher, { exact: false });
    if ((await textItem.count()) > 0) {
      await textItem.first().click();
      return;
    }
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
    let toolUsed = toolChoice;
    if (toolChoice === 'auto') {
      const webAvailable =
        (await toolExistsInBadge(page, TOOL_MATCHERS.web)) ||
        (await toolExistsInMenu(page, TOOL_MATCHERS.web));
      const fileAvailable =
        (await toolExistsInBadge(page, TOOL_MATCHERS.file)) ||
        (await toolExistsInMenu(page, TOOL_MATCHERS.file)) ||
        (await attachMenuHasFileSearch(page, TOOL_MATCHERS.uploadFileSearch));

      if (webAvailable) {
        toolUsed = 'web';
      } else if (fileAvailable) {
        toolUsed = 'file';
      } else {
        toolUsed = 'code';
      }
    }

    if (toolUsed === 'web') {
      await ensureWebSearchEnabled(page);
    } else if (toolUsed === 'file') {
      await ensureFileSearchEnabled(page);
    } else if (toolUsed === 'code') {
      const toggled = await toggleToolFromMenu(page, TOOL_MATCHERS.code);
      if (!toggled) {
        throw new Error('No supported tool toggles available for auto smoke test.');
      }
    }

    await page.waitForTimeout(300);

    step = 'prepare-prompt';
    let prompt = '';
    let statusPattern = /search|zoek/i;

    if (toolUsed === 'web') {
      prompt = [
        'I tried to find the LibreChat GitHub repo but I am stuck.',
        '- I checked my bookmarks',
        '- I looked at librechat.ai',
        'Please use web_search to find the official LibreChat GitHub URL. Reply with the URL only.',
      ].join('\n');
      statusPattern = /web|zoek|search/i;
    } else if (toolUsed === 'file') {
      const tempFilePath = path.join(os.tmpdir(), 'librechat-file-search-smoke.txt');
      fs.writeFileSync(tempFilePath, 'File Search smoke test. Codeword: NIGHTRIDER-OK\n', 'utf8');

      try {
        await selectFileSearchUpload(page);
      } catch (error) {
        await ensureFileSearchEnabled(page);
        await selectFileSearchUpload(page);
      }
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(tempFilePath);

      prompt = [
        'I opened the attached file but I cannot find the codeword.',
        '- I checked the first line',
        '- I checked the last line',
        'Please use file_search to find the codeword in the attached file. Reply with the codeword only.',
      ].join('\n');
      statusPattern = /file|bestand|zoek|search/i;
    } else {
      prompt = [
        'I tried to compute this but got stuck.',
        '- I wrote a tiny script to add 2 + 2',
        '- I am not sure if I ran it correctly',
        'Please use code_interpreter to calculate 2 + 2 and reply with the number only.',
      ].join('\n');
      statusPattern = /code|interpreter/i;
    }

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
