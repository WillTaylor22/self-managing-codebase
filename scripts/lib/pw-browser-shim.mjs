/**
 * Shared Playwright browser-cache shim (ENG-19).
 *
 * Imported by:
 *   - tests/global-setup.ts (Playwright globalSetup)
 *   - scripts/capture-pr-media.mjs (PR-media capture)
 *
 * Background: the agent sandbox image ships a pre-installed Chromium cache
 * at `/opt/pw-browsers/chromium-1194` (matching `@playwright/test@1.55.x`),
 * but this project pins `@playwright/test@^1.60.0`, which expects revision
 * 1223. Outbound downloads from `cdn.playwright.dev` and the Microsoft
 * mirror are blocked in the sandbox (ENG-20), so `npx playwright install`
 * cannot reconcile the drift either.
 *
 * `applyBrowserCacheShim()` detects the mismatch and creates symlinks from
 * the highest existing chromium revision to the revision Playwright wants.
 * The Chromium 141 binaries cached in the sandbox run the 1.60 test runner
 * fine for our DOM/localStorage assertions — see PR #3 (ENG-18) which used
 * the same shim by hand.
 *
 * No-op when `PLAYWRIGHT_BROWSERS_PATH` is unset (default
 * `~/.cache/ms-playwright` — humans, real CI, etc) or when the wanted
 * revision is already installed.
 */

import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  symlinkSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * @param {'chromium' | 'chromium-headless-shell'} name
 * @returns {string | undefined}
 */
function getWantedRevision(name) {
  const playwrightCoreDir = dirname(
    require.resolve('playwright-core/package.json'),
  );
  const json = JSON.parse(
    readFileSync(join(playwrightCoreDir, 'browsers.json'), 'utf8'),
  );
  return json.browsers.find((b) => b.name === name)?.revision;
}

/**
 * @param {string} root
 * @param {string} prefix
 * @returns {string | undefined}
 */
function highestRealRevision(root, prefix) {
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  const revs = [];
  for (const entry of readdirSync(root)) {
    const match = entry.match(re);
    if (!match) continue;
    // Skip symlinks — we want a real install to point at, not a link to a link.
    if (lstatSync(join(root, entry)).isSymbolicLink()) continue;
    revs.push(parseInt(match[1], 10));
  }
  revs.sort((a, b) => b - a);
  return revs[0]?.toString();
}

/**
 * Symlink the wanted Chromium revision onto the highest revision present
 * under `PLAYWRIGHT_BROWSERS_PATH`. No-op when the env var is unset or the
 * directory does not exist.
 */
export function applyBrowserCacheShim() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return;

  const wantedChromium = getWantedRevision('chromium');
  const wantedHeadlessShell = getWantedRevision('chromium-headless-shell');
  if (!wantedChromium || !wantedHeadlessShell) return;

  // 1. chromium-${wanted} → highest existing chromium-NNNN
  const chromiumWantedPath = join(root, `chromium-${wantedChromium}`);
  if (!existsSync(chromiumWantedPath)) {
    const best = highestRealRevision(root, 'chromium');
    if (best && best !== wantedChromium) {
      symlinkSync(join(root, `chromium-${best}`), chromiumWantedPath);
      console.log(
        `[pw-browser-shim] symlinked chromium-${best} → chromium-${wantedChromium}`,
      );
    }
  }

  // 2. chromium_headless_shell-${wanted} → highest existing
  const hsWantedPath = join(
    root,
    `chromium_headless_shell-${wantedHeadlessShell}`,
  );
  if (!existsSync(hsWantedPath)) {
    const best = highestRealRevision(root, 'chromium_headless_shell');
    if (best) {
      const bestDir = join(root, `chromium_headless_shell-${best}`);
      symlinkSync(bestDir, hsWantedPath);
      console.log(
        `[pw-browser-shim] symlinked chromium_headless_shell-${best} → chromium_headless_shell-${wantedHeadlessShell}`,
      );

      // Older revisions ship the headless shell under `chrome-linux/headless_shell`;
      // 1.60+ probes `chrome-headless-shell-linux64/chrome-headless-shell`. Shim both
      // inside the source dir so traversal through the outer symlink resolves.
      const innerWantedDir = join(bestDir, 'chrome-headless-shell-linux64');
      const innerLegacyDir = join(bestDir, 'chrome-linux');
      if (!existsSync(innerWantedDir) && existsSync(innerLegacyDir)) {
        symlinkSync(innerLegacyDir, innerWantedDir);
        const innerWantedBin = join(innerWantedDir, 'chrome-headless-shell');
        const innerLegacyBin = join(innerWantedDir, 'headless_shell');
        if (!existsSync(innerWantedBin) && existsSync(innerLegacyBin)) {
          // Relative target — same dir.
          symlinkSync('headless_shell', innerWantedBin);
        }
      }
    }
  }
}
