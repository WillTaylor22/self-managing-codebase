import { test, expect } from '@playwright/test';

test('home page renders Trip Planner', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /trip planner/i })).toBeVisible();
  await expect(page.getByPlaceholder(/where to/i)).toBeVisible();

  expect(errors, `console / page errors:\n${errors.join('\n')}`).toEqual([]);
});
