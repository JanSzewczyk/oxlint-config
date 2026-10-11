import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { defineConfig, type OxlintConfig } from "oxlint";

const logger = console;

function isPackageInstalled(packageName: string): boolean {
  const currentDir = process.cwd(); // Get the current working directory
  const packageJsonPath = findPackageJson(currentDir);

  if (!packageJsonPath) {
    logger.error("Could not find package.json in", currentDir, "or any parent directory.");
    process.exit(1);
  }

  // Read the package.json file
  try {
    const packageJson = readFileSync(packageJsonPath, "utf-8");
    const parsedPackageJson = JSON.parse(packageJson);

    // Check if the package is listed in dependencies or devDependencies
    const dependencies = parsedPackageJson.dependencies || {};
    const devDependencies = parsedPackageJson.devDependencies || {};

    return packageName in dependencies || packageName in devDependencies;
  } catch (error) {
    logger.error("Error reading package.json file:", error);
    process.exit(1);
  }
}

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

const hasTypeScript = isPackageInstalled("typescript");
const hasReact = isPackageInstalled("react");
const hasNext = isPackageInstalled("next");
const hasTestingLibrary = isPackageInstalled("@testing-library/dom");
const hasJestDom = isPackageInstalled("@testing-library/jest-dom");
const hasVitest = isPackageInstalled("vitest");
const hasPlaywright = isPackageInstalled("@playwright/test");
const hasStorybook = isPackageInstalled("storybook");
// `no-floating-promises`/`no-misused-promises` need the `oxlint-tsgolint`
// binary. It's an optional peer dependency, so degrade gracefully instead of
// crashing `oxlint` for TypeScript consumers who haven't installed it.
const hasTsgolint = isPackageInstalled("oxlint-tsgolint");

interface Feature {
  name: string;
  detected: boolean;
  enforced: boolean;
}

const features: Feature[] = [
  { name: "TypeScript", detected: hasTypeScript, enforced: true },
  { name: "React", detected: hasReact, enforced: true },
  { name: "Next", detected: hasNext, enforced: true },
  { name: "Vitest", detected: hasVitest, enforced: true },
  { name: "Testing Library", detected: hasTestingLibrary, enforced: false },
  { name: "Jest Dom", detected: hasJestDom, enforced: false },
  { name: "Playwright", detected: hasPlaywright, enforced: false },
  { name: "Storybook", detected: hasStorybook, enforced: false }
];

function statusLabel(feature: Feature): string {
  if (!feature.detected) {
    return "❌";
  }
  return feature.enforced ? "✔️" : "⚠️ not enforced — see KNOWN_GAPS.md";
}

function showFeaturesTable(): void {
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

showFeaturesTable();

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

const plugins: NonNullable<OxlintConfig["plugins"]> = ["import"];
if (hasTypeScript) {
  plugins.push("typescript");
}
if (hasReact) {
  plugins.push("react");
}
if (hasNext) {
  plugins.push("nextjs");
}
if (hasVitest) {
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
  "import/named": OFF,

  // `import/no-unresolved` doesn't exist in oxlint at all (not just OFF by
  // default) — setting it to any value, including "off", is a hard config
  // error. It was OFF in eslint-config anyway, so there's nothing to port.

  // red flags (thus, warnings)
  "import/consistent-type-specifier-style": [WARN, "prefer-inline"],
  "import/no-named-as-default": WARN,
  "import/no-named-as-default-member": WARN,
  "import/no-duplicates": [WARN, { preferInline: true }]

  // `import/order` has no oxlint equivalent — see KNOWN_GAPS.md.
};

const overrides: NonNullable<OxlintConfig["overrides"]> = [];

if (hasReact) {
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

if (hasNext) {
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

if (hasTypeScript) {
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
      "typescript/consistent-type-imports": [
        WARN,
        {
          prefer: "type-imports",
          disallowTypeAnnotations: true,
          fixStyle: "inline-type-imports"
        }
      ],

      ...(hasTsgolint
        ? {
            "typescript/no-misused-promises": [ERROR, { checksVoidReturn: false }],
            "typescript/no-floating-promises": ERROR
          }
        : {})
    }
  });
}

if (hasVitest) {
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

if (hasPlaywright) {
  overrides.push({
    files: playwrightFiles,
    rules: {
      "no-empty-pattern": OFF

      // `playwright/*` rules have no oxlint equivalent — see KNOWN_GAPS.md.
    }
  });
}

const config = defineConfig({
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
  settings: hasVitest
    ? {
        vitest: {
          typecheck: hasTypeScript
        }
      }
    : undefined,
  options: hasTypeScript && hasTsgolint ? { typeAware: true } : undefined,
  // oxlint ships the Vitest globals (describe/it/expect/vi/...) natively
  // under this preset — no need to pull in `@vitest/eslint-plugin` just to
  // read its globals map (that package also drags in `eslint` transitively).
  env: {
    browser: true,
    node: true,
    ...(hasVitest ? { vitest: true } : {})
  }
});

export default config;
