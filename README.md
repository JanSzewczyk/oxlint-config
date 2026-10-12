<div align="center">

# 📦 @szum-tech/oxlint-config

[![npm version](https://img.shields.io/npm/v/@szum-tech/oxlint-config.svg)](https://www.npmjs.com/package/@szum-tech/oxlint-config)
[![npm downloads](https://img.shields.io/npm/dm/@szum-tech/oxlint-config.svg)](https://www.npmjs.com/package/@szum-tech/oxlint-config)
[![Types](https://img.shields.io/npm/types/@szum-tech/oxlint-config)](https://www.npmjs.com/package/@szum-tech/oxlint-config)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/JanSzewczyk/oxlint-config/actions/workflows/pr-check.yml/badge.svg)](https://github.com/JanSzewczyk/oxlint-config/actions/workflows/pr-check.yml)

**A shared, auto-detecting oxlint configuration for TypeScript, React and Next.js projects**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Scripts](#-scripts) • [Known Limitations](#-known-limitations)

</div>

---

## 👋 Hello there!

`@szum-tech/oxlint-config` is a shared [`oxlint`](https://oxc.rs/docs/guide/usage/linter) configuration, published
as an npm package. It is the `oxlint`-based sibling of
[`@szum-tech/eslint-config`](https://github.com/JanSzewczyk/eslint-config): same auto-detection philosophy, same
package conventions — a different (much faster, Rust-based) linting engine underneath. Drop it into an
`oxlint.config.ts` file and it inspects your `package.json` at lint time, turning on exactly the rule sets your
project needs.

## ✨ Features

- **Auto-detection** — automatically enables rule sets based on your project's dependencies, the same way
  `@szum-tech/eslint-config` does: drop the package into `oxlint.config.ts` and it inspects your `package.json` at
  lint time.
- **[TypeScript](https://www.typescriptlang.org/) support** — core rules always on; `@typescript-eslint`-equivalent
  rules (`no-explicit-any`, `no-floating-promises`, `consistent-type-imports`, ...) when `typescript` is detected.
- **[React](https://react.dev/) & React Hooks support** (`jsx-key`, `rules-of-hooks`, `exhaustive-deps`, ...) when
  `react` is detected.
- **[Next.js](https://nextjs.org/) support** (the full `@next/eslint-plugin-next` recommended rule set, same
  severities) when `next` is detected.
- **[Vitest](https://vitest.dev/) support** (`expect-expect`, `no-focused-tests`, ...) when `vitest` is detected,
  scoped to test files the same way `eslint-config` scopes with `files`/`ignores` — oxlint calls it
  `files`/`excludeFiles`.
- **Type-aware TypeScript rules** (`no-floating-promises`, `no-misused-promises`) automatically turn on when
  [`oxlint-tsgolint`](https://www.npmjs.com/package/oxlint-tsgolint) is installed — and are simply skipped (not a
  crash) when it isn't.
- **Real `settings.react.version`** — read from the installed `react/package.json`, not the semver range in your
  `package.json` (oxlint rejects `"detect"`).
- **`settings.next.rootDir`** auto-detected from the nearest `next.config.*`, for monorepos where the Next.js app
  root differs from the config file's location.
- **Overridable detection** via `createOxlintConfig({ detect, baseDir, nextRootDir })` — see
  [Usage](#-usage) — for monorepos or to intentionally disable a detected rule set.
- **Zero runtime dependencies** — everything above is native to `oxlint` (plugins, globals via `env`, settings) —
  this package only depends on `oxlint`/`oxlint-tsgolint` as peers.

`@testing-library/dom`, `@testing-library/jest-dom`, `@playwright/test` and `storybook` are **detected** (shown in
the console banner) but their rules are **not enforced** — `oxlint` has no native plugin for them yet. See
[KNOWN_GAPS.md](./KNOWN_GAPS.md) for the full list of what's not covered and why.

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Usage](#-usage)
- [📃 Scripts](#-scripts)
- [🤖 Minimal GitHub Oxlint Check Workflow](#-minimal-github-oxlint-check-workflow)
- [📒 Known Limitations](#-known-limitations)
- [📁 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [📧 Contact & Support](#-contact--support)

---

## 📦 Installation

**Requirements:**

- **oxlint** v1.87.0 or higher
- **Node.js** v22.18+ or v24.x+ (needed to load a TypeScript `oxlint.config.ts` file natively)

```bash
npm install --save-dev oxlint @szum-tech/oxlint-config
```

```bash
pnpm add --save-dev oxlint @szum-tech/oxlint-config
```

```bash
yarn add -D oxlint @szum-tech/oxlint-config
```

```bash
bun add --dev oxlint @szum-tech/oxlint-config
```

### 🔗 Peer Dependencies

- [![oxlint](https://img.shields.io/github/package-json/dependency-version/JanSzewczyk/oxlint-config/peer/oxlint?label=oxlint)](https://oxc.rs/docs/guide/usage/linter) — required, the linting engine this package configures
- [![oxlint-tsgolint](https://img.shields.io/github/package-json/dependency-version/JanSzewczyk/oxlint-config/peer/oxlint-tsgolint?label=oxlint-tsgolint)](https://www.npmjs.com/package/oxlint-tsgolint) — optional, enables type-aware TypeScript rules

To enable the type-aware TypeScript rules, also install `oxlint-tsgolint`:

```bash
npm install --save-dev oxlint-tsgolint
```

---

## 🚀 Usage

Unlike ESLint's flat config, `oxlint` config files cannot import npm packages unless they are written in
TypeScript/JavaScript. Auto-detection requires that, so consumers **must** use `oxlint.config.ts`
(`.oxlintrc.json` cannot `import` this package):

```typescript
// oxlint.config.ts
export { default } from "@szum-tech/oxlint-config";
```

Run `oxlint` and the config banner reports which feature sets it detected in your project (on stderr, so it never
interferes with `oxlint`'s own stdout output or its `--lsp` mode).

### 🏭 Factory function (overriding a single detection)

The default export runs auto-detection with no way to tweak a single flag. For that, call
`createOxlintConfig()` directly instead:

```typescript
// oxlint.config.ts
import { createOxlintConfig } from "@szum-tech/oxlint-config";

export default createOxlintConfig({
  // Resolve the consumer's package.json/installed versions from here instead
  // of `process.cwd()` — recommended for editors/LSP and monorepos.
  baseDir: import.meta.dirname,
  // Force a detection on/off, bypassing the package.json inspection for it.
  detect: { next: false },
  // Monorepos: explicit Next.js app root for `settings.next.rootDir`.
  // Auto-detected by default (nearest `next.config.*`); pass `false` to opt out.
  nextRootDir: "./apps/web"
});
```

Don't import both the default export and call `createOxlintConfig()` yourself in the same file — each one runs
its own detection pass and prints its own banner.

### ⚠️ `extends` only carries some fields

If your own `oxlint.config.ts` wraps this package with `extends` instead of re-exporting it directly, know that
`extends` (both in `.oxlintrc.json` and `oxlint.config.ts`) only propagates `rules`, `plugins`, `categories` and
`overrides` — confirmed empirically against `oxlint@1.87.0`. It does **not** propagate `env`, `globals`,
`ignorePatterns`, `settings` (so `settings.react.version`/`settings.next.rootDir`/`settings.vitest.typecheck`
are dropped) or `options` (so `options.typeAware` is dropped). If you need those, re-declare them yourself
alongside `extends`, or just use the direct re-export / factory function above instead.

---

## 📃 Scripts

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

| Script     | Description                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `lint`     | Lints the code using `oxlint`                                                                           |
| `lint:ci`  | Lints the code for CI — `oxlint` has no `-o`/output-file flag like ESLint's, so the SARIF report is redirected to a file with the shell instead |
| `lint:fix` | Automatically fixes linting errors where a fix exists                                                   |

---

## 🤖 Minimal GitHub Oxlint Check Workflow

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

---

## 📒 Known Limitations

`oxlint` doesn't yet have native equivalents for every rule `@szum-tech/eslint-config` covers — notably
`import/order`, `jest-dom`, `testing-library`, `playwright`, `storybook`, and `react/no-deprecated`. See
[KNOWN_GAPS.md](./KNOWN_GAPS.md) for the full, versioned breakdown of what's missing and why.

---

## 📁 Project Structure

```
oxlint-config/
├── .github/              # CI workflows (PR checks, CodeQL, npm publish)
├── dist/                 # Build output (ESM + CJS + type declarations)
├── src/
│   └── index.ts          # Auto-detection logic and the oxlint config itself
├── KNOWN_GAPS.md          # Tracked parity gaps vs. @szum-tech/eslint-config
├── tsup.config.js         # Build configuration (tsup)
└── tsconfig.json          # TypeScript configuration
```

### 🔑 Key Directories

- **`src/`** — single entry point (`index.ts`) that detects installed dependencies and builds the `oxlint`
  config object accordingly
- **`dist/`** — generated by `tsup`; published to npm, never edited by hand

### ⚙️ Important Configuration Files

- **`tsup.config.js`** — builds `src/index.ts` into dual ESM/CJS output with type declarations
- **`release.config.js`** — `semantic-release` configuration for automated versioning and npm publishing
- **`prettier.config.ts`** — re-exports `@szum-tech/prettier-config`

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Run checks: `npm run lint`, `npm run typecheck`, `npm run prettier:check`
5. Open a Pull Request

---

## 📜 License

This package is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 📧 Contact & Support

- 🐛 [Open an issue](https://github.com/JanSzewczyk/oxlint-config/issues)
- ⭐ [Star this repository](https://github.com/JanSzewczyk/oxlint-config)
- 📦 [View on npm](https://www.npmjs.com/package/@szum-tech/oxlint-config)
- 👨‍💻 Check out the maintainer's [GitHub profile](https://github.com/JanSzewczyk)

---

<div align="center">

**Made with ❤️ by [Jan Szewczyk](https://github.com/JanSzewczyk)**

If this package helped you, please consider giving it a ⭐ on GitHub!

[⬆ Back to Top](#-szum-techoxlint-config)

</div>
