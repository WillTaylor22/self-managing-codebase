import { test, expect } from '@playwright/test';

// ENG-15: /api/chat must return 400 (not 500) for malformed bodies.
//
// We assert response shape and status only — we do not exercise the model
// (would require AI_GATEWAY_API_KEY and produce a slow flaky test). The
// happy path is covered by the live app dogfood; here we just lock down
// the validator contract.

const URL = '/api/chat';

test.describe('/api/chat malformed body validation', () => {
  test('empty object → 400 invalid_body', async ({ request }) => {
    const res = await request.post(URL, { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_body');
  });

  test('messages: null → 400 invalid_messages', async ({ request }) => {
    const res = await request.post(URL, { data: { messages: null } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    // `messages: null` passes the loose envelope but fails UIMessage validation.
    expect(body.error).toBe('invalid_messages');
  });

  test('legacy {role, content} shape → 400 invalid_messages', async ({ request }) => {
    const res = await request.post(URL, {
      data: { messages: [{ role: 'user', content: 'hi' }] },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_messages');
  });

  test('messages: [] (empty array) → 400 invalid_messages', async ({ request }) => {
    const res = await request.post(URL, { data: { messages: [] } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    // safeValidateUIMessages rejects an empty conversation.
    expect(body.error).toBe('invalid_messages');
  });

  test('invalid JSON body → 400 invalid_json', async ({ request }) => {
    // Send raw bytes via Buffer so Playwright doesn't JSON-encode the string.
    const res = await request.post(URL, {
      headers: { 'content-type': 'application/json' },
      data: Buffer.from('not-json'),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_json');
  });
});
