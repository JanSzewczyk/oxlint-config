# Known gaps vs. `@szum-tech/eslint-config`

This document tracks everything `@szum-tech/eslint-config` covers that `@szum-tech/oxlint-config` currently **cannot**
replicate, because `oxlint` has no native equivalent (and we deliberately do not reach for `jsPlugins`/ESLint plugin
reuse to patch it — see the project's migration plan). Re-evaluate this list whenever `oxlint` is upgraded.

Verified against `oxlint@1.87.0` / `oxlint-tsgolint@7.0.2004` (2026-10-11).

## Missing rules

| Rule                  | Why it's missing                                                                                                                                                                                   | Upstream issue |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `import/order`        | No such rule in oxlint's `import` plugin (confirmed: `Rule 'order' not found in plugin 'import'`). Not covered by `@szum-tech/prettier-config` either (no import-sorting plugin configured there). | _to fill in_   |
| `react/no-deprecated` | Rule source exists in the `oxc-project/oxc` repo, but is not yet exposed in the published `oxlint` CLI (confirmed: `Rule 'no-deprecated' not found in plugin 'react'`).                            | _to fill in_   |

## Missing plugins (entire rule sets)

| Plugin                          | What it covered in `eslint-config`                                                                                                                    | Status                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `eslint-plugin-jest-dom`        | `prefer-checked`, `prefer-enabled-disabled`, `prefer-focus`, `prefer-empty`, `prefer-to-have-value`, `prefer-to-have-text-content`, `prefer-required` | Unknown plugin `jest-dom` — no native support        |
| `eslint-plugin-testing-library` | `no-unnecessary-act`, `no-wait-for-side-effects`, `prefer-find-by`                                                                                    | Unknown plugin `testing-library` — no native support |
| `eslint-plugin-playwright`      | 14 rules for `**/e2e/**` / `**/*.e2e.*` files                                                                                                         | Unknown plugin `playwright` — no native support      |
| `eslint-plugin-storybook`       | Rules for `*.stories.*` and `.storybook/main.*`                                                                                                       | Unknown plugin `storybook` — no native support       |

## Other things that don't exist (found while implementing the rule blocks)

| Rule                   | Why it's missing                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `import/no-unresolved` | Does not exist in oxlint's `import` plugin at all — unlike `import/order`, this isn't just absent from our config, **setting it to any value including `"off"` is a hard parse error** (`Rule 'no-unresolved' not found in plugin 'import'`). It was `OFF` in `eslint-config` anyway, so nothing is lost by leaving it out entirely. |

## Behavioral / config differences (not gaps, just different from eslint-config)

- `settings.react.version: "detect"` is rejected (`invalid major version in settings.react.version`). We omit
  `settings.react.version` entirely — rules worked correctly without it in testing.
- `settings` is not supported inside `overrides` blocks — only at the top level of the config.
- `vitest/no-focused-tests` does not accept rule options (only a severity) — the old `{ fixable: false }` option from
  `eslint-plugin-vitest` has no equivalent and is simply dropped.
- `react/jsx-uses-react` / `react/jsx-uses-vars` have no oxlint equivalent, but are not needed: oxlint's native parser
  understands JSX and does not produce the "unused var" false positive these rules used to guard against.
- oxlint's glob matcher does **not** support extglob syntax (`?(x)`, `@(a|b)`) the way `eslint-config`'s patterns do.
  `"**/*.ts?(x)"` silently matches nothing — it must be spelled out as `["**/*.ts", "**/*.tsx"]`. Found via a false
  negative (an override using the extglob pattern simply never applied, with no error raised).
- Don't reach for `@vitest/eslint-plugin` to read its `environments.env.globals` data, the way the migration plan
  originally considered mirroring what `eslint-config` does with the `globals` npm package. Importing it drags in
  `@typescript-eslint/utils`, which `require()`s `eslint` at load time — and `eslint` isn't a dependency of this
  package. Use oxlint's native `env: { vitest: true }` (and `env: { browser: true, node: true }` for the base globals)
  instead; it needs no extra dependency at all.
- `typescript/no-array-constructor` and `typescript/no-unused-vars` are not separate implementations from
  `no-array-constructor` / `no-unused-vars` — they resolve to the identical underlying rule (diagnostics report as
  `eslint(no-array-constructor)` / `eslint(no-unused-vars)` even when configured under the `typescript/` key). The "turn
  the bare rule off, turn the `@typescript-eslint/` one on" dance from `eslint-config` isn't needed for a shared rule
  identity — only the `files` globs on the override matter for scoping.

## Revisit triggers

- A new `oxlint` release — re-run the plugin/rule probes in `scratchpad/spike/` (see the migration plan) against the new
  version before assuming a gap is still open.
- `eslint-plugin-jest-dom` / `-testing-library` / `-playwright` / `-storybook` gaining official `jsPlugins` conformance
  testing upstream (tracked in the Oxc discussion about tested ESLint plugins).
