import { fileURLToPath } from "node:url";
import path from "node:path";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  { ignores: ["build/**", ".wrangler/**", "node_modules/**"] },
  ...compat.config({
    root: true,
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      ecmaFeatures: {
        jsx: true,
      },
    },
    env: {
      browser: true,
      commonjs: true,
      es6: true,
    },

    // Base config
    extends: ["eslint:recommended"],

    overrides: [
      // React
      {
        files: ["**/*.{js,jsx,ts,tsx}"],
        plugins: ["react", "jsx-a11y"],
        extends: [
          "plugin:react/recommended",
          "plugin:react/jsx-runtime",
          "plugin:react-hooks/recommended",
          "plugin:jsx-a11y/recommended",
        ],
        settings: {
          react: {
            version: "detect",
          },
          formComponents: ["Form"],
          linkComponents: [
            { name: "Link", linkAttribute: "to" },
            { name: "NavLink", linkAttribute: "to" },
          ],
          "import/resolver": {
            typescript: {},
          },
        },
      },

      // Typescript
      {
        files: ["**/*.{ts,tsx}"],
        plugins: ["@typescript-eslint", "import"],
        parser: "@typescript-eslint/parser",
        settings: {
          "import/internal-regex": "^~/",
          "import/resolver": {
            node: {
              extensions: [".ts", ".tsx"],
            },
            typescript: {
              alwaysTryTypes: true,
            },
          },
        },
        extends: [
          "plugin:@typescript-eslint/recommended",
          "plugin:import/recommended",
          "plugin:import/typescript",
        ],
        rules: {
          "import/no-unresolved": ["error", { ignore: ["cloudflare:test"] }],
          "@typescript-eslint/no-empty-interface": "off",
          "@typescript-eslint/no-empty-object-type": "off",
        },
      },
    ],
  }),
];
