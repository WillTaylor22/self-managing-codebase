#!/usr/bin/env node
/**
 * Capture screenshot + screen recording of the running app for PR previews.
 *
 * Honours CAPTURE_URL (defaults to http://localhost:3000). Outputs:
 *   .pr-media/screenshot.png
 *   .pr-media/demo.webm     (Playwright writes webm natively)
 *
 * Run while a dev/preview server is already responding at CAPTURE_URL.
 */
import { mkdirSync, renameSync, readdirSync, existsSync, rmSync, lstatSync, readFileSync, symlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// --- Inline copy of tests/global-setup.ts logic (ENG-19 shim) ---
// The sandbox ships chromium-1194 but @playwright/test@1.60 wants 1223.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/opt/pw-browsers';
const browsersRoot = process.env.PLAYWRIGHT_BROWSERS_PATH;
function highestRealRevision(prefix) {
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  const revs = [];
  for (const entry of readdirSync(browsersRoot)) {
    const m = entry.match(re);
    if (!m) continue;
    if (lstatSync(join(browsersRoot, entry)).isSymbolicLink()) continue;
    revs.push(parseInt(m[1], 10));
  }
  revs.sort((a, b) => b - a);
  return revs[0]?.toString();
}
const pwCoreBrowsers = JSON.parse(
  readFileSync(join(root, 'node_modules/playwright-core/browsers.json'), 'utf8'),
);
for (const name of ['chromium', 'chromium-headless-shell']) {
  const wanted = pwCoreBrowsers.browsers.find((b) => b.name === name)?.revision;
  if (!wanted) continue;
  const dirName = name === 'chromium-headless-shell' ? 'chromium_headless_shell' : name;
  const wantedPath = join(browsersRoot, `${dirName}-${wanted}`);
  if (existsSync(wantedPath)) continue;
  const best = highestRealRevision(dirName);
  if (!best) continue;
  const bestDir = join(browsersRoot, `${dirName}-${best}`);
  symlinkSync(bestDir, wantedPath);
  console.log(`[pw-browser-shim] symlinked ${dirName}-${best} → ${dirName}-${wanted}`);
  // headless-shell needs inner dir shim too
  if (name === 'chromium-headless-shell') {
    const innerWantedDir = join(bestDir, 'chrome-headless-shell-linux64');
    const innerLegacyDir = join(bestDir, 'chrome-linux');
    if (!existsSync(innerWantedDir) && existsSync(innerLegacyDir)) {
      symlinkSync(innerLegacyDir, innerWantedDir);
      const innerWantedBin = join(innerWantedDir, 'chrome-headless-shell');
      const innerLegacyBin = join(innerWantedDir, 'headless_shell');
      if (!existsSync(innerWantedBin) && existsSync(innerLegacyBin)) {
        symlinkSync('headless_shell', innerWantedBin);
      }
    }
  }
}
// --- end shim ---

const { chromium } = await import('playwright');

const url = process.env.CAPTURE_URL || 'http://localhost:3000';
const outDir = join(root, '.pr-media');
const videosTmp = join(outDir, '_videos');
mkdirSync(videosTmp, { recursive: true });

console.log(`[capture] target = ${url}`);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: videosTmp, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();

await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
await page.waitForTimeout(500);

const shotPath = join(outDir, 'screenshot.png');
await page.screenshot({ path: shotPath, fullPage: false });
console.log(`[capture] screenshot → ${shotPath}`);

// Some interaction so the video has motion
await page.mouse.move(200, 200);
await page.waitForTimeout(300);
await page.mouse.move(900, 500, { steps: 20 });
await page.waitForTimeout(300);
const input = page.locator('input[placeholder="Where to?"]').first();
if (await input.count()) {
  await input.click();
  await input.type('5 days in Lisbon', { delay: 50 });
  await page.waitForTimeout(400);
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
