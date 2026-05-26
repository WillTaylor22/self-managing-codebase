# Regex "last match" needs `/g` + matchAll, not just `/m`

`String.prototype.match(/.../m)` returns the **first** occurrence; the `m`
flag only line-anchors `^` / `$`. If your convention says "the marker is
the last line of the body" (e.g. `pr-session-id-marker`), you must take
the last match explicitly:

```ts
const all = [...text.matchAll(/^\s*marker:\s*(\w+)\s*$/gm)];
const value = all.length ? all[all.length - 1][1] : null;
```

PR #20 shipped the buggy form first and a docs-only code-block placeholder
(`marker: xxxxxxxxxxxxxxxx`) won against the real trailer, silently. The
unit test at `tests/unit/extract-session-id.spec.ts` now guards this case.

General rule: any time the contract is "the LAST occurrence of X in a
multi-line body," reach for `matchAll(...).at(-1)`, not `match(... /m)`.
