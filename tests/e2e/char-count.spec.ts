import { test, expect, type Page } from '@playwright/test';

const MAX = 4000;
const WARN = 3200; // 80% of MAX

function attachErrorCollectors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

test.describe('chat input character counter', () => {
  test('empty state shows 0 / MAX in normal color, Send disabled', async ({ page }) => {
    const errors = attachErrorCollectors(page);
    await page.goto('/');

    const counter = page.getByTestId('char-count');
    await expect(counter).toBeVisible();
    await expect(counter).toHaveText(`0 / ${MAX}`);
    await expect(counter).toHaveAttribute('data-state', 'normal');

    // Send is disabled when input is empty (preexisting behavior; sanity-check it).
    await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();

    expect(errors, `console / page errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('updates on every keystroke and stays in normal range', async ({ page }) => {
    const errors = attachErrorCollectors(page);
    await page.goto('/');

    const input = page.getByPlaceholder(/where to/i);
    const counter = page.getByTestId('char-count');

    await input.fill('hello');
    await expect(counter).toHaveText(`5 / ${MAX}`);
    await expect(counter).toHaveAttribute('data-state', 'normal');

    await input.fill('hello world');
    await expect(counter).toHaveText(`11 / ${MAX}`);
    await expect(counter).toHaveAttribute('data-state', 'normal');

    // Send is enabled when input is non-empty and under limit.
    await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled();

    expect(errors, `console / page errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('amber state when length > 80% of MAX (and < MAX)', async ({ page }) => {
    const errors = attachErrorCollectors(page);
    await page.goto('/');

    const input = page.getByPlaceholder(/where to/i);
    const counter = page.getByTestId('char-count');

    // At WARN exactly (= 80%): still normal — spec says "> 80%" for amber.
    await input.fill('x'.repeat(WARN));
    await expect(counter).toHaveAttribute('data-state', 'normal');

    // One past WARN: amber.
    await input.fill('x'.repeat(WARN + 1));
    await expect(counter).toHaveText(`${WARN + 1} / ${MAX}`);
    await expect(counter).toHaveAttribute('data-state', 'warn');
    // Send still enabled — only ≥ MAX disables it.
    await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled();

    // Just under MAX: still amber.
    await input.fill('x'.repeat(MAX - 1));
    await expect(counter).toHaveAttribute('data-state', 'warn');

    expect(errors, `console / page errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('red state and Send disabled when length ≥ MAX', async ({ page }) => {
    const errors = attachErrorCollectors(page);
    await page.goto('/');

    const input = page.getByPlaceholder(/where to/i);
    const counter = page.getByTestId('char-count');
    const send = page.getByRole('button', { name: 'Send' });

    // At MAX exactly: red, Send disabled (spec is ≥ MAX).
    await input.fill('x'.repeat(MAX));
    await expect(counter).toHaveText(`${MAX} / ${MAX}`);
    await expect(counter).toHaveAttribute('data-state', 'over');
    await expect(send).toBeDisabled();

    // Over MAX (no truncation, per "Out of scope"): still red and disabled.
    await input.fill('x'.repeat(MAX + 1));
    await expect(counter).toHaveText(`${MAX + 1} / ${MAX}`);
    await expect(counter).toHaveAttribute('data-state', 'over');
    await expect(send).toBeDisabled();

    expect(errors, `console / page errors:\n${errors.join('\n')}`).toEqual([]);
  });
});
