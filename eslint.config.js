import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import typescriptParser from "@typescript-eslint/parser";
import typescript from "@typescript-eslint/eslint-plugin";

export default [
  {
    files: ["**/*.tsx"],
    plugins: {
      react,
      ["react-hooks"]: reactHooks,
      ["@typescript-eslint"]: typescript,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          modules: true,
          jsx: true,
        },
        ecmaVersion: "latest",
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...typescript.configs["eslint-recommended"].rules,
      ...typescript.configs["recommended"].rules,
      ...reactHooks.configs["recommended"].rules,
      // ... any rules you want
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
    },
    // ... others are omitted for brevity
  },
];
