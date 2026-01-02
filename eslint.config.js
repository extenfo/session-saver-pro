const globals = require("globals");

module.exports = [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        chrome: "readonly",
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-console": "off",
    },
  },
  {
    files: ["eslint.config.js", ".eslintrc.cjs"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["scripts/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      sourceType: "module",
    },
  },
  {
    files: ["src/popup/**/*.js", "src/options/**/*.js"],
    languageOptions: {
      sourceType: "script",
    },
  },
];
