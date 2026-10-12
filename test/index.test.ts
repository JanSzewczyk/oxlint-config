import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createOxlintConfig } from "../src/index";

const fixturesDir = join(import.meta.dirname, "fixtures");

function pluginNames(config: ReturnType<typeof createOxlintConfig>): string[] {
  return [...(config.plugins ?? [])].sort();
}

function overrideFileGroups(config: ReturnType<typeof createOxlintConfig>): string[][] {
  return (config.overrides ?? []).map((override) => override.files as string[]);
}

describe("createOxlintConfig", () => {
  it("enables typescript/react/nextjs/vitest for a Next.js app fixture", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const config = createOxlintConfig({ baseDir: join(fixturesDir, "next-app") });

    expect(pluginNames(config)).toEqual(["import", "nextjs", "react", "typescript", "vitest"]);
    expect(overrideFileGroups(config)).toHaveLength(4); // react, nextjs, typescript, vitest
    expect(config.settings).toMatchObject({
      react: { version: "19.3.0" },
      next: { rootDir: join(fixturesDir, "next-app") }
    });
  });

  it("only enables the import plugin for a plain TypeScript library fixture", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const config = createOxlintConfig({ baseDir: join(fixturesDir, "node-lib") });

    expect(pluginNames(config)).toEqual(["import", "typescript"]);
    expect(overrideFileGroups(config)).toHaveLength(1); // typescript only
    expect(config.settings).toBeUndefined();
  });

  it("lets detect overrides force a feature off regardless of package.json", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const config = createOxlintConfig({
      baseDir: join(fixturesDir, "next-app"),
      detect: { next: false }
    });

    expect(pluginNames(config)).toEqual(["import", "react", "typescript", "vitest"]);
    expect(config.settings).not.toHaveProperty("next");
  });

  it("lets nextRootDir: false opt out of settings.next.rootDir auto-detection", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const config = createOxlintConfig({
      baseDir: join(fixturesDir, "next-app"),
      nextRootDir: false
    });

    expect(config.settings).not.toHaveProperty("next");
  });
});
