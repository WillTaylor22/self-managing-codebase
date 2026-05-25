import { test, expect } from '@playwright/test';

// ENG-18: chat history must persist across reloads (verifying the lint fix
// did not regress the localStorage hydration behavior).

const SESSION_ID = 'e2e-hydration-fixed';
const STORAGE_KEY_SESSION = 'trip-session';
const STORAGE_KEY_MESSAGES = `trip-messages:${SESSION_ID}`;

const STORED_MESSAGES = [
  {
    id: 'm1',
    role: 'user',
    parts: [{ type: 'text', text: 'Hydration smoke message from user' }],
  },
  {
    id: 'm2',
    role: 'assistant',
    parts: [{ type: 'text', text: 'Hydration smoke reply from assistant' }],
  },
];

function attachErrorCapture(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test('restores prior messages from localStorage on load', async ({ page }) => {
  const errors = attachErrorCapture(page);

  await page.addInitScript(
    ({ sessionKey, sessionId, messagesKey, messages }) => {
      window.localStorage.setItem(sessionKey, sessionId);
      window.localStorage.setItem(messagesKey, JSON.stringify(messages));
    },
    {
      sessionKey: STORAGE_KEY_SESSION,
      sessionId: SESSION_ID,
      messagesKey: STORAGE_KEY_MESSAGES,
      messages: STORED_MESSAGES,
    },
  );

  await page.goto('/');

  await expect(page.getByText('Hydration smoke message from user')).toBeVisible();
  await expect(page.getByText('Hydration smoke reply from assistant')).toBeVisible();

  // Stored messages should still be in localStorage after hydration (the
  // write-back effect must not clobber them with an empty array).
  const after = await page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY_MESSAGES);
  expect(after).not.toBeNull();
  const parsed = JSON.parse(after!);
  expect(Array.isArray(parsed)).toBe(true);
  expect(parsed).toHaveLength(2);

  expect(errors, `console / page errors:\n${errors.join('\n')}`).toEqual([]);
});

test('empty localStorage shows the empty state with no errors', async ({ page }) => {
  const errors = attachErrorCapture(page);

  // Make sure nothing is seeded for this test.
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto('/');

  await expect(page.getByText(/5 days in Lisbon/i)).toBeVisible();
  await expect(page.getByText('Your itinerary will appear here as we plan.')).toBeVisible();

  expect(errors, `console / page errors:\n${errors.join('\n')}`).toEqual([]);
});
