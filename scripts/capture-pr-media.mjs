#!/usr/bin/env node
/**
 * Capture screenshot + screen recording of the running app for PR previews.
 *
 * Outputs (under `.pr-media/`, which is gitignored — see `.gitignore`):
 *   .pr-media/screenshot.png
 *   .pr-media/demo.webm     (Playwright writes webm natively)
 *
 * Run while a dev/preview server is already responding at CAPTURE_URL.
 *
 * Env vars (all optional):
 *   CAPTURE_URL              target URL (default http://localhost:3000)
 *   CAPTURE_VIEWPORT         WxH viewport, e.g. 390x844 for mobile
 *                            (default 1280x800)
 *   CAPTURE_POST_LOAD_MS     ms to wait after page load before screenshot
 *                            (default 500)
 *   CAPTURE_TIMEOUT_MS       page.goto networkidle timeout (default 30000)
 *   PLAYWRIGHT_BROWSERS_PATH if set, ENG-19 browser-cache shim runs
 *                            against it (matches tests/global-setup.ts).
 *                            Leave unset on humans / real CI to use
 *                            Playwright's default cache.
 */
import { mkdirSync, renameSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyBrowserCacheShim } from './lib/pw-browser-shim.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// ENG-19: reconcile sandbox Chromium revision drift. No-op when
// PLAYWRIGHT_BROWSERS_PATH is unset (humans / real CI).
applyBrowserCacheShim();

// `@playwright/test` is the declared dep; it re-exports `chromium`. Avoid
// reaching for the transitive `playwright` package directly.
const { chromium } = await import('@playwright/test');

function parseViewport(raw) {
  const fallback = { width: 1280, height: 800 };
  if (!raw) return fallback;
  const match = raw.match(/^(\d+)x(\d+)$/i);
  if (!match) {
    console.warn(
      `[capture] ignoring invalid CAPTURE_VIEWPORT=${raw}; expected WxH (e.g. 1280x800)`,
    );
    return fallback;
  }
  return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
}

function parsePositiveInt(raw, fallback, name) {
  if (raw === undefined) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    console.warn(`[capture] ignoring invalid ${name}=${raw}; using ${fallback}`);
    return fallback;
  }
  return n;
}

const url = process.env.CAPTURE_URL || 'http://localhost:3000';
const viewport = parseViewport(process.env.CAPTURE_VIEWPORT);
const postLoadMs = parsePositiveInt(
  process.env.CAPTURE_POST_LOAD_MS,
  500,
  'CAPTURE_POST_LOAD_MS',
);
const gotoTimeoutMs = parsePositiveInt(
  process.env.CAPTURE_TIMEOUT_MS,
  30_000,
  'CAPTURE_TIMEOUT_MS',
);

const outDir = join(root, '.pr-media');
const videosTmp = join(outDir, '_videos');
mkdirSync(videosTmp, { recursive: true });

console.log(
  `[capture] target=${url} viewport=${viewport.width}x${viewport.height} postLoad=${postLoadMs}ms timeout=${gotoTimeoutMs}ms`,
);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport,
  recordVideo: { dir: videosTmp, size: viewport },
});
const page = await context.newPage();

await page.goto(url, { waitUntil: 'networkidle', timeout: gotoTimeoutMs });
await page.waitForTimeout(postLoadMs);

const shotPath = join(outDir, 'screenshot.png');
await page.screenshot({ path: shotPath, fullPage: false });
console.log(`[capture] screenshot → ${shotPath}`);

// Some interaction so the video has motion. Matches the locator convention
// used in tests/e2e/* (getByPlaceholder(/where to/i)).
await page.mouse.move(200, 200);
await page.waitForTimeout(300);
await page.mouse.move(900, 500, { steps: 20 });
await page.waitForTimeout(300);
const input = page.getByPlaceholder(/where to/i).first();
if (await input.count()) {
  await input.click();
  await input.type('5 days in Lisbon', { delay: 50 });
  await page.waitForTimeout(400);
} else {
  console.warn(
    '[capture] no input matching /where to/i — demo recording will have no typing segment. If the homepage chat input was renamed, update this script.',
  );
}

const video = page.video();
await context.close();
await browser.close();

if (video) {
  const src = await video.path();
  const dst = join(outDir, 'demo.webm');
  renameSync(src, dst);
  console.log(`[capture] video → ${dst}`);
}

if (existsSync(videosTmp) && readdirSync(videosTmp).length === 0) {
  rmSync(videosTmp, { recursive: true, force: true });
}
