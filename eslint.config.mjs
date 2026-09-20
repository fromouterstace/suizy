import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["coverage/**", "dist/**", "node_modules/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          fixStyle: "inline-type-imports",
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          format: ["snake_case"],
          leadingUnderscore: "allow",
          selector: "variableLike",
        },
        {
          format: ["PascalCase"],
          selector: "typeLike",
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-console": "error",
    },
  },
  {
    files: ["**/*.mjs"],
    rules: {
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-console": "error",
    },
  },
);
