# @szum-tech/oxlint-config

[![npm](https://img.shields.io/npm/v/@szum-tech/oxlint-config)](https://www.npmjs.com/package/@szum-tech/oxlint-config)
[![MIT License](https://img.shields.io/badge/license-MIT-red.svg?style=flat)](https://github.com/JanSzewczyk/oxlint-config/blob/main/LICENSE)

---

A shared [`oxlint`](https://oxc.rs/docs/guide/usage/linter) configuration, published as an npm package. It is the
`oxlint`-based sibling of [`@szum-tech/eslint-config`](https://github.com/JanSzewczyk/eslint-config): same
auto-detection philosophy, same package conventions — different (much faster) linting engine underneath.

> **Status: work in progress.** This package is being built incrementally, following the migration plan from
> `@szum-tech/eslint-config`. See [KNOWN_GAPS.md](./KNOWN_GAPS.md) for what `oxlint` cannot yet replicate natively.

## 📚 Features

- **Auto-detection** — automatically enables rule sets based on your project's dependencies, the same way
  `@szum-tech/eslint-config` does.
- **TypeScript, React, React Hooks, Next.js, Vitest** support, mapped 1:1 onto `oxlint`'s native plugins.
- **Type-aware TypeScript rules** (`no-floating-promises`, `no-misused-promises`) via `oxlint-tsgolint`.

See [KNOWN_GAPS.md](./KNOWN_GAPS.md) for what is **not** covered yet (`import/order`, `jest-dom`,
`testing-library`, `playwright`, `storybook`).

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
    "lint:ci": "oxlint . -f sarif -o oxlint-results.sarif",
    "lint:fix": "oxlint . --fix"
  }
}
```

## 📒 Known limitations

See [KNOWN_GAPS.md](./KNOWN_GAPS.md).

## 📜 License

This project is licensed under the terms of the
[MIT license](https://github.com/JanSzewczyk/oxlint-config/blob/main/LICENSE).
