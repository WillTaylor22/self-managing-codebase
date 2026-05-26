import { test, expect } from '@playwright/test';
import { extractSessionId } from '../../lib/extract-session-id';

// Pure-function unit tests for the webhook's session-id marker extractor.
// No browser, no network — Playwright is just our test runner here.
//
// The shape contract is documented in
// .claude/memory/conventions/pr-session-id-marker.md.

test.describe('extractSessionId', () => {
  test('null body → null', () => {
    expect(extractSessionId(null)).toBeNull();
  });

  test('undefined body → null', () => {
    expect(extractSessionId(undefined)).toBeNull();
  });

  test('empty body → null', () => {
    expect(extractSessionId('')).toBeNull();
  });

  test('plain-text marker as the last line', () => {
    const body = ['# Some PR', '', 'Body text.', '', 'session-id: sesn_abc123'].join('\n');
    expect(extractSessionId(body)).toBe('sesn_abc123');
  });

  test('plain-text marker tolerates trailing whitespace / blank lines', () => {
    const body = '# Some PR\n\nsession-id: sesn_abc123   \n\n\n';
    expect(extractSessionId(body)).toBe('sesn_abc123');
  });

  test('sthr_ legacy prefix accepted on the plain shape', () => {
    const body = 'Body.\n\nsession-id: sthr_legacy999';
    expect(extractSessionId(body)).toBe('sthr_legacy999');
  });

  test('HTML-comment marker (legacy shape) still matches', () => {
    const body = 'Body.\n\n<!-- session-id: sesn_html42 -->';
    expect(extractSessionId(body)).toBe('sesn_html42');
  });

  test('HTML shape wins over plain when both are present (legacy precedence)', () => {
    // Documented behavior — legacy PRs may have both during transition.
    const body = 'session-id: sesn_plain1\n\n<!-- session-id: sesn_html2 -->';
    expect(extractSessionId(body)).toBe('sesn_html2');
  });

  test('placeholder in a fenced code block does NOT beat the real trailer (PR #20)', () => {
    // This is the exact regression: an earlier `session-id:` line that's
    // documentation (e.g. inside a ```code``` block) used to win because
    // .match without /g returns the first occurrence. The real marker is
    // the last non-empty line; that must be what we return.
    const body = [
      '## Fix',
      '',
      'The canonical shape is now a plain-text line on its own:',
      '',
      '```',
      'session-id: sesn_xxxxxxxxxxxxxxxx',
      '```',
      '',
      'More prose here.',
      '',
      'session-id: sesn_012j21sUvdmnhx3baX6ivYLW',
    ].join('\n');
    expect(extractSessionId(body)).toBe('sesn_012j21sUvdmnhx3baX6ivYLW');
  });

  test('multiple plain markers → last one wins', () => {
    const body = 'session-id: sesn_first\nstuff\nsession-id: sesn_second\nmore\nsession-id: sesn_third';
    expect(extractSessionId(body)).toBe('sesn_third');
  });

  test('inline mention of "session-id:" in prose does NOT match', () => {
    // The marker must be on its own line. A sentence like "the session-id: foo line"
    // should not produce a false match — note the `^\s* ... \s*$` anchors.
    const body = 'In the body we mention the session-id: sesn_inline in prose. End.';
    expect(extractSessionId(body)).toBeNull();
  });

  test('unknown prefix (not sthr_/sesn_) does not match', () => {
    const body = 'session-id: zzzz_notvalid';
    expect(extractSessionId(body)).toBeNull();
  });

  test('plain marker indented by leading whitespace is still matched', () => {
    // Tolerated by `^\s*` — quoted-block / list-indented bodies still work.
    const body = 'Body.\n\n   session-id: sesn_indented';
    expect(extractSessionId(body)).toBe('sesn_indented');
  });
});
