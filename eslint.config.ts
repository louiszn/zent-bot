import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.eslint.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		ignores: ["dist/**/*", "node_modules/**/*"],
	},
	{
		files: ["**/*.ts"],
		rules: {
			semi: "error",
			quotes: ["error", "double"],
			indent: ["error", "tab", { SwitchCase: 1 }],
			"@typescript-eslint/consistent-type-imports": "error",
			"@typescript-eslint/no-floating-promises": "error",
		},
	},
);
