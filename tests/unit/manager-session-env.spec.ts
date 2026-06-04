import { test, expect } from '@playwright/test';
import { managerSessionEnvBlock, withManagerSessionEnv } from '../../lib/manager-session-env';

// Pure-function unit tests for the manager session-env helper (ENG-23).
// Playwright is just the test runner; no browser/network.

test.describe('managerSessionEnvBlock', () => {
  test.beforeEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  test('returns empty string when BLOB_READ_WRITE_TOKEN is unset', () => {
    expect(managerSessionEnvBlock()).toBe('');
  });

  test('returns empty string when BLOB_READ_WRITE_TOKEN is empty', () => {
    process.env.BLOB_READ_WRITE_TOKEN = '';
    expect(managerSessionEnvBlock()).toBe('');
  });

  test('inlines token and includes VERCEL_BLOB_API_URL workaround when set', () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_TESTONLY_123';
    const block = managerSessionEnvBlock();
    expect(block).toContain("export BLOB_READ_WRITE_TOKEN='vercel_blob_rw_TESTONLY_123'");
    expect(block).toContain("export VERCEL_BLOB_API_URL='https://blob.vercel-storage.com'");
    expect(block).toContain('ENG-22');
    expect(block).toContain('pr-media-2');
  });
});

test.describe('withManagerSessionEnv', () => {
  test.beforeEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  test('returns input unchanged when token is unset', () => {
    expect(withManagerSessionEnv('Wake up.')).toBe('Wake up.');
  });

  test('appends env block separated by a blank line when token is set', () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_TESTONLY_456';
    const out = withManagerSessionEnv('Wake up.');
    expect(out.startsWith('Wake up.\n\n')).toBe(true);
    expect(out).toContain("export BLOB_READ_WRITE_TOKEN='vercel_blob_rw_TESTONLY_456'");
  });
});
