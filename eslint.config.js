import js from "@eslint/js";
import astroParser from "astro-eslint-parser";
import astro from "eslint-plugin-astro";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import tseslint from "typescript-eslint";

const projectGlobals = {
	...globals.browser,
	...globals.node,
	...globals.es2024,
};

const commonRules = {
	"no-empty": "error",
	"no-empty-pattern": "error",
	"no-undef": "off",
	"no-unused-expressions": "off",
	"no-useless-escape": "error",
	"no-var": "error",
	"prefer-const": "error",
	"prefer-rest-params": "error",
	"no-unused-vars": "off",
};

const typescriptRules = {
	"@typescript-eslint/ban-ts-comment": "error",
	"@typescript-eslint/no-empty-object-type": "error",
	"@typescript-eslint/no-unsafe-function-type": "error",
	"@typescript-eslint/no-this-alias": "error",
	"@typescript-eslint/no-unused-expressions": "error",
	"@typescript-eslint/triple-slash-reference": "off",
	"@typescript-eslint/no-unused-vars": [
		"error",
		{
			argsIgnorePattern: "^_",
			varsIgnorePattern: "^_",
			caughtErrorsIgnorePattern: "^_",
		},
	],
	"@typescript-eslint/no-explicit-any": "error",
};

const astroRules = {
	"astro/no-unused-define-vars-in-style": "error",
};

const svelteRules = {
	"svelte/no-at-html-tags": "error",
	"svelte/require-each-key": "error",
};

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
		files: ["src/**/*.{js,mjs,cjs,ts}"],
		languageOptions: {
			globals: projectGlobals,
		},
		rules: {
			...commonRules,
			...typescriptRules,
		},
	},
	{
		files: ["src/**/*.svelte"],
		languageOptions: {
			globals: projectGlobals,
			parserOptions: {
				parser: tseslint.parser,
			},
		},
		rules: {
			...commonRules,
			...typescriptRules,
			...svelteRules,
		},
	},
	{
		files: ["src/**/*.astro"],
		languageOptions: {
			globals: projectGlobals,
			parser: astroParser,
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions: [".astro"],
			},
		},
		rules: {
			...commonRules,
			...typescriptRules,
			...astroRules,
		},
	},
];
