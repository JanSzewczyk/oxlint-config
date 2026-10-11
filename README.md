# @szum-tech/oxlint-config

[![npm](https://img.shields.io/npm/v/@szum-tech/oxlint-config)](https://www.npmjs.com/package/@szum-tech/oxlint-config)
[![MIT License](https://img.shields.io/badge/license-MIT-red.svg?style=flat)](https://github.com/JanSzewczyk/oxlint-config/blob/main/LICENSE)

---

A shared [`oxlint`](https://oxc.rs/docs/guide/usage/linter) configuration, published as an npm package. It is the
`oxlint`-based sibling of [`@szum-tech/eslint-config`](https://github.com/JanSzewczyk/eslint-config): same
auto-detection philosophy, same package conventions — different (much faster, Rust-based) linting engine underneath.

## 📚 Features

- **Auto-detection** — automatically enables rule sets based on your project's dependencies, the same way
  `@szum-tech/eslint-config` does: drop the package into `oxlint.config.ts` and it inspects your `package.json` at
  lint time.
- **TypeScript** support — core rules always on; `@typescript-eslint`-equivalent rules (`no-explicit-any`,
  `no-floating-promises`, `consistent-type-imports`, ...) when `typescript` is detected.
- **React & React Hooks** support (`jsx-key`, `rules-of-hooks`, `exhaustive-deps`, ...) when `react` is detected.
- **Next.js** support (the full `@next/eslint-plugin-next` recommended rule set, same severities) when `next` is
  detected.
- **Vitest** support (`expect-expect`, `no-focused-tests`, ...) when `vitest` is detected, scoped to test files the
  same way `eslint-config` scopes with `files`/`ignores` — oxlint calls it `files`/`excludeFiles`.
- **Type-aware TypeScript rules** (`no-floating-promises`, `no-misused-promises`) automatically turn on when
  `oxlint-tsgolint` is installed — and are simply skipped (not a crash) when it isn't.
- **Zero runtime dependencies.** Everything above is native to `oxlint` (plugins, globals via `env`, settings) — this
  package only depends on `oxlint`/`oxlint-tsgolint` as peers.

`@testing-library/dom`, `@testing-library/jest-dom`, `@playwright/test` and `storybook` are **detected** (shown in
the console banner) but their rules are **not enforced** — `oxlint` has no native plugin for them yet. See
[KNOWN_GAPS.md](./KNOWN_GAPS.md) for the full list of what's not covered (`import/order`, `jest-dom`,
`testing-library`, `playwright`, `storybook`, `react/no-deprecated`) and why.

## 🎯 Getting Started

### ⚙️ Installation

**Requirements:**

- **oxlint** v1.87.0 or higher
- **Node.js** v22.18+ or v24.x+ (needed to load a TypeScript `oxlint.config.ts` file natively)

```shell
# NPM
npm install --save-dev oxlint @szum-tech/oxlint-config

# YARN
yarn add -D oxlint @szum-tech/oxlint-config

# PNPM
pnpm add --save-dev oxlint @szum-tech/oxlint-config

# BUN
bun add --dev oxlint @szum-tech/oxlint-config
```

To enable the type-aware TypeScript rules, also install `oxlint-tsgolint`:

```shell
npm install --save-dev oxlint-tsgolint
```

### Configuration

Unlike ESLint's flat config, `oxlint` config files cannot import npm packages unless they are written in
TypeScript/JavaScript. Auto-detection requires that, so consumers **must** use `oxlint.config.ts`
(`.oxlintrc.json` cannot `import` this package):

```ts
// oxlint.config.ts
export { default } from "@szum-tech/oxlint-config";
```

## 💻 Scripts

Suggested scripts for your `package.json`:

```json
{
  "scripts": {
    "lint": "oxlint .",
    "lint:ci": "oxlint . -f sarif > oxlint-results.sarif",
    "lint:fix": "oxlint . --fix"
  }
}
```

**Scripts description:**

- `lint`: Lints the code using `oxlint`
- `lint:ci`: Lints the code for CI — `oxlint` has no `-o`/output-file flag like ESLint's, so the SARIF report is
  redirected to a file with the shell instead
- `lint:fix`: Automatically fixes linting errors where a fix exists

## 🚀 Minimal GitHub Oxlint check workflow

```yaml
name: PR Checks ✅

on:
  pull_request:

jobs:
  lint:
    name: Oxlint ⚡
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code 📚
        uses: actions/checkout@v6
      - name: Set up Node 🟢
        uses: actions/setup-node@v6
        with:
          node-version: 24.x
          cache: "npm"
      - name: Install dependencies ⚙️
        run: npm ci
      - name: Oxlint Check ⚡
        run: npm run lint:ci
        continue-on-error: true
      - name: Upload Oxlint results to GitHub
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: oxlint-results.sarif
          wait-for-processing: true
```

## 📒 Known limitations

See [KNOWN_GAPS.md](./KNOWN_GAPS.md).

## 📜 License

This project is licensed under the terms of the
[MIT license](https://github.com/JanSzewczyk/oxlint-config/blob/main/LICENSE).
