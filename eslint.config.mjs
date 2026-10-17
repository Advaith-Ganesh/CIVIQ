import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";
import hooks from "eslint-plugin-react-hooks";
export default tseslint.config(
  {
    ignores: [
      ".next/**",
      ".next-e2e/**",
      "node_modules/**",
      ".venv/**",
      "inference/**",
      "datasets/cache/**",
      "next-env.d.ts",
      "scripts/*.cjs",
      "test-results/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts}"],
    plugins: { "unused-imports": unusedImports, "react-hooks": hooks },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "react-hooks/rules-of-hooks": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
