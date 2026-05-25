import { test, expect } from '@playwright/test';

// ENG-14: character counter under chat input.
// Acceptance:
//   - empty → "0 / 4000"
//   - updates live on keystroke
//   - > 80% → amber
//   - >= max → red AND Send disabled

const MAX = 4000;

function attachErrorCapture(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test('empty input shows "0 / 4000" and Send is disabled', async ({ page }) => {
  const errors = attachErrorCapture(page);
  await page.goto('/');

  const counter = page.getByTestId('char-count');
  await expect(counter).toHaveText(`0 / ${MAX}`);
  await expect(counter).toHaveClass(/text-zinc-500/);

  await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();

  expect(errors, `console / page errors:\n${errors.join('\n')}`).toEqual([]);
});

test('counter updates live as the user types', async ({ page }) => {
  const errors = attachErrorCapture(page);
  await page.goto('/');

  const input = page.getByPlaceholder('Where to?');
  const counter = page.getByTestId('char-count');

  await input.fill('hello');
  await expect(counter).toHaveText(`5 / ${MAX}`);
  await expect(counter).toHaveClass(/text-zinc-500/);
  await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled();

  await input.fill('hello world');
  await expect(counter).toHaveText(`11 / ${MAX}`);

  expect(errors, `console / page errors:\n${errors.join('\n')}`).toEqual([]);
});

test('crossing 80% turns the counter amber', async ({ page }) => {
  const errors = attachErrorCapture(page);
  await page.goto('/');

  const input = page.getByPlaceholder('Where to?');
  const counter = page.getByTestId('char-count');

  // 81% of 4000 = 3240 — must be > 0.8 * MAX
  const amberText = 'x'.repeat(3240);
  await input.fill(amberText);
  await expect(counter).toHaveText(`3240 / ${MAX}`);
  await expect(counter).toHaveClass(/text-amber-600/);
  // Send still enabled while only amber.
  await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled();

  expect(errors, `console / page errors:\n${errors.join('\n')}`).toEqual([]);
});

test('hitting the max turns the counter red and disables Send', async ({ page }) => {
  const errors = attachErrorCapture(page);
  await page.goto('/');

  const input = page.getByPlaceholder('Where to?');
  const counter = page.getByTestId('char-count');

  const maxText = 'y'.repeat(MAX);
  await input.fill(maxText);
  await expect(counter).toHaveText(`${MAX} / ${MAX}`);
  await expect(counter).toHaveClass(/text-red-600/);
  await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();

  expect(errors, `console / page errors:\n${errors.join('\n')}`).toEqual([]);
});
