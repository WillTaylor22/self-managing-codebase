/**
 * Playwright globalSetup — self-heal the browser cache in agent sandboxes.
 * See `scripts/lib/pw-browser-shim.mjs` (ENG-19) for the full explanation.
 *
 * Loaded via dynamic import so Playwright's TypeScript transpiler doesn't
 * rewrite the `.mjs` module as CJS (which trips `exports is not defined`
 * inside the ESM file). Dynamic `import()` keeps Node's native ESM loader
 * in charge of the .mjs file.
 */

export default async function globalSetup(): Promise<void> {
  const { applyBrowserCacheShim } = await import(
    '../scripts/lib/pw-browser-shim.mjs'
  );
  applyBrowserCacheShim();
}
