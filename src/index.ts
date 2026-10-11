import { defineConfig } from "oxlint";

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
  plugins: ["typescript", "import"],
  rules: {}
});

export default config;
