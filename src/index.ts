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
  rules: {}
});

export default config;
