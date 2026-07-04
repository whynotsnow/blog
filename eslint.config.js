import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
	{
		ignores: ["dist/**", "node_modules/**", ".astro/**"],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...astro.configs["flat/recommended"],
	...svelte.configs["flat/recommended"],
	...svelte.configs["flat/prettier"],
	{
		files: ["src/**/*.{js,mjs,cjs,ts,astro,svelte}"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2024,
			},
		},
		rules: {
			"no-empty": "off",
			"no-empty-pattern": "off",
			"no-undef": "off",
			"no-unused-expressions": "off",
			"no-useless-escape": "error",
			"no-var": "error",
			"prefer-const": "error",
			"prefer-rest-params": "off",
			"astro/no-unused-define-vars-in-style": "off",
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-unsafe-function-type": "off",
			"@typescript-eslint/no-this-alias": "off",
			"@typescript-eslint/no-unused-expressions": "off",
			"@typescript-eslint/triple-slash-reference": "off",
			"svelte/no-at-html-tags": "off",
			"svelte/require-each-key": "off",
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-explicit-any": "off",
		},
	},
	{
		files: ["src/**/*.svelte"],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
			},
		},
	},
];
