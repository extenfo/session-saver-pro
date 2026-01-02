module.exports = {
  root: true,
  ignorePatterns: ["dist/", "node_modules/"],
  env: {
    browser: true,
    es2022: true,
  },
  globals: {
    chrome: "readonly",
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  rules: {
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-undef": "error",
    "no-console": "off",
  },
  overrides: [
    {
      files: ["src/popup/**/*.js", "src/options/**/*.js"],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
};
