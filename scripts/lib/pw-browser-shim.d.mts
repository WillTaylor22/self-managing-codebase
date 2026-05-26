/**
 * Symlink the wanted Chromium revision onto the highest revision present
 * under `PLAYWRIGHT_BROWSERS_PATH`. No-op when the env var is unset or the
 * directory does not exist.
 */
export function applyBrowserCacheShim(): void;
