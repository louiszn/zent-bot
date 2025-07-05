import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(eslint.configs.recommended, tseslint.configs.recommended, {
	rules: {
		semi: "error",
		quotes: ["error", "double"],
		indent: ["error", "tab", { "SwitchCase": 1 }],
		"@typescript-eslint/consistent-type-imports": "error",
	},
});
