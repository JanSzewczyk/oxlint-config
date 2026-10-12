import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { defineConfig, type OxlintConfig } from "oxlint";

const logger = console;

const PACKAGE_JSON = "package.json";

function findPackageJson(startDir: string): string | null {
  let currentDir = startDir;

  while (true) {
    const packageJsonPath = join(currentDir, PACKAGE_JSON);

    if (existsSync(packageJsonPath)) {
      return packageJsonPath;
    }

    const parentDir = resolve(currentDir, "..");
    if (parentDir === currentDir) {
      // Reached the root of the filesystem
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

function readConsumerPackageJson(baseDir: string): Record<string, unknown> {
  const packageJsonPath = findPackageJson(baseDir);

  if (!packageJsonPath) {
    logger.error("Could not find package.json in", baseDir, "or any parent directory.");
    process.exit(1);
  }

  try {
    return JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  } catch (error) {
    logger.error("Error reading package.json file:", error);
    process.exit(1);
  }
}

function isPackageListed(packageJson: Record<string, unknown>, packageName: string): boolean {
  const dependencies = (packageJson.dependencies as Record<string, string> | undefined) ?? {};
  const devDependencies = (packageJson.devDependencies as Record<string, string> | undefined) ?? {};

  return packageName in dependencies || packageName in devDependencies;
}

/**
 * Reads the installed version of a package from its own `package.json`
 * (not the semver range in the consumer's `package.json`), by walking up
 * from `baseDir` looking for `node_modules/<packageName>/package.json`.
 * Returns `null` if it can't be resolved — callers must degrade gracefully.
 */
function readInstalledVersion(baseDir: string, packageName: string): string | null {
  let currentDir = baseDir;

  while (true) {
    const candidate = join(currentDir, "node_modules", packageName, PACKAGE_JSON);

    if (existsSync(candidate)) {
      try {
        const pkg = JSON.parse(readFileSync(candidate, "utf-8"));
        return typeof pkg.version === "string" ? pkg.version : null;
      } catch {
        return null;
      }
    }

    const parentDir = resolve(currentDir, "..");
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

/** Finds the nearest `next.config.{js,mjs,ts,mts}` at or above `baseDir`. */
function findNextRootDir(baseDir: string): string | null {
  const candidateNames = ["next.config.js", "next.config.mjs", "next.config.ts", "next.config.mts"];
  let currentDir = baseDir;

  while (true) {
    if (candidateNames.some((name) => existsSync(join(currentDir, name)))) {
      return currentDir;
    }

    const parentDir = resolve(currentDir, "..");
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

interface DetectionFlags {
  typescript: boolean;
  react: boolean;
  next: boolean;
  vitest: boolean;
  testingLibrary: boolean;
  jestDom: boolean;
  playwright: boolean;
  storybook: boolean;
  tsgolint: boolean;
}

export interface CreateOxlintConfigOptions {
  /**
   * Directory to resolve the consumer's `package.json` (and installed
   * package versions) from. Defaults to `process.cwd()`. Pass
   * `import.meta.dirname` from your `oxlint.config.ts` if the lint process
   * might run from a different working directory than the config file
   * (editors/LSP, monorepos).
   */
  baseDir?: string;
  /**
   * Force individual auto-detections on or off, bypassing the
   * `package.json` inspection for that key. Useful in monorepos where a
   * dependency isn't directly visible from the config's `package.json`, or
   * to intentionally disable a detected rule set.
   */
  detect?: Partial<DetectionFlags>;
  /**
   * Explicit Next.js project root for `settings.next.rootDir`, for
   * monorepos where the `oxlint.config.ts` location and the Next.js app
   * root differ. When omitted, it's auto-detected by searching for the
   * nearest `next.config.*` file; pass `false` to opt out entirely.
   */
  nextRootDir?: string | false;
}

function resolveDetectionFlags(
  packageJson: Record<string, unknown>,
  overrides?: Partial<DetectionFlags>
): DetectionFlags {
  const detected: DetectionFlags = {
    typescript: isPackageListed(packageJson, "typescript"),
    react: isPackageListed(packageJson, "react"),
    next: isPackageListed(packageJson, "next"),
    vitest: isPackageListed(packageJson, "vitest"),
    testingLibrary: isPackageListed(packageJson, "@testing-library/dom"),
    jestDom: isPackageListed(packageJson, "@testing-library/jest-dom"),
    playwright: isPackageListed(packageJson, "@playwright/test"),
    storybook: isPackageListed(packageJson, "storybook"),
    // `no-floating-promises`/`no-misused-promises` need the `oxlint-tsgolint`
    // binary. It's an optional peer dependency, so degrade gracefully instead
    // of crashing `oxlint` for TypeScript consumers who haven't installed it.
    tsgolint: isPackageListed(packageJson, "oxlint-tsgolint")
  };

  return { ...detected, ...overrides };
}

interface Feature {
  name: string;
  detected: boolean;
  enforced: boolean;
}

function statusLabel(feature: Feature): string {
  if (!feature.detected) {
    return "❌";
  }
  return feature.enforced ? "✔️" : "⚠️ not enforced — see KNOWN_GAPS.md";
}

function showFeaturesTable(flags: DetectionFlags): void {
  const features: Feature[] = [
    { name: "TypeScript", detected: flags.typescript, enforced: true },
    { name: "React", detected: flags.react, enforced: true },
    { name: "Next", detected: flags.next, enforced: true },
    { name: "Vitest", detected: flags.vitest, enforced: true },
    { name: "Testing Library", detected: flags.testingLibrary, enforced: false },
    { name: "Jest Dom", detected: flags.jestDom, enforced: false },
    { name: "Playwright", detected: flags.playwright, enforced: false },
    { name: "Storybook", detected: flags.storybook, enforced: false }
  ];

  // Oxlint's own `--lsp` mode talks JSON-RPC over stdio, so this banner must
  // never touch stdout — everything here goes through `logger.error` (stderr).
  const sorted = [...features].sort((a, b) => Number(b.detected) - Number(a.detected));

  logger.error("Hello There!");
  logger.error("Here are the features detected in your project:");
  for (const feature of sorted) {
    logger.error(`  ${statusLabel(feature)}  ${feature.name}`);
  }
  logger.error("");
  logger.error("Dear Developer");
  logger.error("");
  logger.error("Thanks a lot for using '@szum-tech/oxlint-config'");
  logger.error("If you like it, leave a star ⭐ 👉 https://github.com/JanSzewczyk/oxlint-config");
  logger.error("And recommend to others");
  logger.error("");
  logger.error(`May the SZUMRAK be with You 🚀🚀🚀`);
}

const ERROR = "error";
const WARN = "warn";
const OFF = "off";

// oxlint's glob matcher doesn't support extglob syntax (`?(x)`, `@(a|b)`),
// unlike ESLint's — so TS/JS file groups are spelled out explicitly.
const tsFiles = ["**/*.ts", "**/*.tsx"];
const jsxFiles = ["**/*.tsx", "**/*.jsx"];
const nextFiles = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"];

const vitestFiles = ["**/__tests__/**/*", "**/*.test.*"];
const testFiles = ["**/tests/**", ...vitestFiles];
const playwrightFiles = ["**/e2e/**", "**/*.e2e.*"];

/**
 * Builds the `@szum-tech/oxlint-config` config object by inspecting the
 * consumer's `package.json`. Call it directly from your `oxlint.config.ts`
 * if you need to pass options; otherwise use the default export, which
 * calls this with no arguments.
 */
export function createOxlintConfig(options: CreateOxlintConfigOptions = {}): OxlintConfig {
  const baseDir = options.baseDir ?? process.cwd();
  const packageJson = readConsumerPackageJson(baseDir);
  const flags = resolveDetectionFlags(packageJson, options.detect);

  showFeaturesTable(flags);

  const plugins: NonNullable<OxlintConfig["plugins"]> = ["import"];
  if (flags.typescript) {
    plugins.push("typescript");
  }
  if (flags.react) {
    plugins.push("react");
  }
  if (flags.next) {
    plugins.push("nextjs");
  }
  if (flags.vitest) {
    plugins.push("vitest");
  }

  const rules: NonNullable<OxlintConfig["rules"]> = {
    "no-unexpected-multiline": ERROR,
    "no-warning-comments": [ERROR, { terms: ["FIXME"], location: "anywhere" }],
    "no-console": WARN,
    "no-unused-vars": [
      WARN,
      {
        args: "all",
        argsIgnorePattern: "^_",
        ignoreRestSiblings: true,
        varsIgnorePattern: "^ignored"
      }
    ],

    // analysis/correctness
    "import/default": ERROR,
    "import/namespace": ERROR,
    "import/export": ERROR,
    "import/named": OFF

    // `import/no-unresolved` doesn't exist in oxlint at all (not just OFF by
    // default) — setting it to any value, including "off", is a hard config
    // error. It was OFF in eslint-config anyway, so there's nothing to port.
  };
  // `prefer-top-level` (`import type { Foo } from "foo"`), not `prefer-inline`
  // — the latter actively fights Biome/Prettier, which normalize a
  // pure-type-only import back to the top-level `import type` form. Confirmed
  // by piloting this package against a Biome-formatted project: `oxlint --fix`
  // followed by `biome check --write` exactly cancelled each other's edit.
  rules["import/consistent-type-specifier-style"] = [WARN, "prefer-top-level"];
  rules["import/no-named-as-default"] = WARN;
  rules["import/no-named-as-default-member"] = WARN;
  rules["import/no-duplicates"] = [WARN, { preferInline: true }];
  // `import/order` has no oxlint equivalent — see KNOWN_GAPS.md.

  const overrides: NonNullable<OxlintConfig["overrides"]> = [];

  if (flags.react) {
    overrides.push({
      files: jsxFiles,
      rules: {
        "react/display-name": ERROR,
        "react/jsx-no-comment-textnodes": ERROR,
        "react/jsx-no-duplicate-props": ERROR,
        "react/jsx-no-target-blank": ERROR,
        "react/jsx-no-undef": ERROR,
        "react/no-children-prop": ERROR,
        "react/no-danger-with-children": ERROR,
        "react/no-direct-mutation-state": ERROR,
        "react/no-find-dom-node": ERROR,
        "react/no-is-mounted": ERROR,
        "react/no-render-return-value": ERROR,
        "react/no-unescaped-entities": ERROR,
        "react/no-unknown-property": ERROR,
        "react/require-render-return": ERROR,
        "react/jsx-key": WARN,
        "react/react-in-jsx-scope": OFF,
        "react/no-unsafe": OFF,

        "react/rules-of-hooks": ERROR,
        "react/exhaustive-deps": WARN

        // `react/no-deprecated` isn't published yet in oxlint — see KNOWN_GAPS.md.
      }
    });
  }

  if (flags.next) {
    overrides.push({
      files: nextFiles,
      rules: {
        "nextjs/google-font-display": WARN,
        "nextjs/google-font-preconnect": WARN,
        "nextjs/next-script-for-ga": WARN,
        "nextjs/no-async-client-component": WARN,
        "nextjs/no-before-interactive-script-outside-document": WARN,
        "nextjs/no-css-tags": WARN,
        "nextjs/no-head-element": WARN,
        "nextjs/no-html-link-for-pages": WARN,
        "nextjs/no-img-element": WARN,
        "nextjs/no-page-custom-font": WARN,
        "nextjs/no-styled-jsx-in-document": WARN,
        "nextjs/no-sync-scripts": WARN,
        "nextjs/no-title-in-document-head": WARN,
        "nextjs/no-typos": WARN,
        "nextjs/no-unwanted-polyfillio": WARN,
        "nextjs/inline-script-id": ERROR,
        "nextjs/no-assign-module-variable": ERROR,
        "nextjs/no-document-import-in-page": ERROR,
        "nextjs/no-duplicate-head": ERROR,
        "nextjs/no-head-import-in-document": ERROR,
        "nextjs/no-script-component-in-head": ERROR
      }
    });
  }

  if (flags.typescript) {
    overrides.push({
      files: tsFiles,
      rules: {
        "no-unused-vars": OFF,
        "no-unused-expressions": OFF,

        "typescript/ban-ts-comment": ERROR,
        "typescript/no-array-constructor": ERROR,
        "typescript/no-duplicate-enum-values": ERROR,
        "typescript/no-explicit-any": ERROR,
        "typescript/no-extra-non-null-assertion": ERROR,
        "typescript/no-misused-new": ERROR,
        "typescript/no-namespace": ERROR,
        "typescript/no-non-null-asserted-optional-chain": ERROR,
        "typescript/no-require-imports": ERROR,
        "typescript/no-this-alias": ERROR,
        "typescript/no-unnecessary-type-constraint": ERROR,
        "typescript/no-unsafe-declaration-merging": ERROR,
        "typescript/no-unsafe-function-type": ERROR,
        "typescript/no-wrapper-object-types": ERROR,
        "typescript/prefer-as-const": ERROR,
        "typescript/prefer-namespace-keyword": ERROR,
        "typescript/triple-slash-reference": ERROR,
        "typescript/no-empty-object-type": WARN,
        "typescript/no-unused-vars": [
          WARN,
          {
            args: "all",
            argsIgnorePattern: "^_",
            caughtErrors: "all",
            caughtErrorsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            ignoreRestSiblings: true
          }
        ],
        // `fixStyle: "separate-type-imports"` to match the top-level style
        // used for `import/consistent-type-specifier-style` above — same
        // reasoning: "inline-type-imports" fights Biome/Prettier's own
        // normalization of mixed type+value imports.
        "typescript/consistent-type-imports": [
          WARN,
          {
            prefer: "type-imports",
            disallowTypeAnnotations: true,
            fixStyle: "separate-type-imports"
          }
        ],

        ...(flags.tsgolint
          ? {
              "typescript/no-misused-promises": [ERROR, { checksVoidReturn: false }],
              "typescript/no-floating-promises": ERROR
            }
          : {})
      }
    });
  }

  if (flags.vitest) {
    overrides.push({
      files: testFiles,
      excludeFiles: playwrightFiles,
      rules: {
        "vitest/expect-expect": ERROR,
        "vitest/no-identical-title": ERROR,
        "vitest/no-commented-out-tests": ERROR,
        "vitest/valid-title": ERROR,
        "vitest/valid-expect": ERROR,
        "vitest/valid-describe-callback": ERROR,
        "vitest/require-local-test-context-for-concurrent-snapshots": ERROR,
        "vitest/no-import-node-test": ERROR,
        "vitest/no-focused-tests": WARN
      }
    });
  }

  if (flags.playwright) {
    overrides.push({
      files: playwrightFiles,
      rules: {
        "no-empty-pattern": OFF

        // `playwright/*` rules have no oxlint equivalent — see KNOWN_GAPS.md.
      }
    });
  }

  // `settings.react.version: "detect"` is rejected by oxlint ("invalid major
  // version"). Read the real installed semver from react's own package.json
  // instead — `node_modules/<pkg>/package.json`, not the semver range in the
  // consumer's package.json — and fall back to omitting the setting entirely
  // if it can't be resolved (oxlint's react rules work fine without it).
  const reactVersion = flags.react ? readInstalledVersion(baseDir, "react") : null;

  const nextRootDir =
    options.nextRootDir === false ? null : (options.nextRootDir ?? (flags.next ? findNextRootDir(baseDir) : null));

  const settings: OxlintConfig["settings"] = {
    ...(flags.vitest ? { vitest: { typecheck: flags.typescript } } : {}),
    ...(reactVersion ? { react: { version: reactVersion } } : {}),
    ...(nextRootDir ? { next: { rootDir: nextRootDir } } : {})
  };

  return defineConfig({
    ignorePatterns: [
      "**/.cache/**",
      "**/node_modules/**",
      "**/build/**",
      "**/public/build/**",
      "**/playwright-report/**",
      "**/server-build/**",
      "**/dist/**",
      "**/.next/**",
      "**/storybook-static/**",
      "**/coverage/**",
      "**/coverage-unit/**",
      "**/coverage-storybook/**"
    ],
    categories: {
      correctness: "off"
    },
    plugins,
    rules,
    overrides,
    settings: Object.keys(settings).length > 0 ? settings : undefined,
    options: flags.typescript && flags.tsgolint ? { typeAware: true } : undefined,
    // oxlint ships the Vitest globals (describe/it/expect/vi/...) natively
    // under this preset — no need to pull in `@vitest/eslint-plugin` just to
    // read its globals map (that package also drags in `eslint` transitively).
    env: {
      browser: true,
      node: true,
      ...(flags.vitest ? { vitest: true } : {})
    }
  });
}

const config = createOxlintConfig();

export default config;
