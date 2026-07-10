import js from "@eslint/js";
import astroParser from "astro-eslint-parser";
import astro from "eslint-plugin-astro";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Runtime boundaries
 *
 * src:
 * - Astro components
 * - Svelte components
 * - Browser runtime
 *
 * scripts:
 * - Node.js CLI scripts
 * - Build tools
 * - Automation tasks
 *
 * config:
 * - Astro config
 * - Tooling config
 */

// Browser runtime
const browserGlobals = {
	...globals.browser,
	...globals.es2024,
};

// Node runtime
const nodeGlobals = {
	...globals.node,
	...globals.es2024,

	// Node 18+ Web APIs
	fetch: "readonly",
	AbortController: "readonly",
};

/**
 * Shared rules
 */
const commonRules = {
	"no-empty": "error",
	"no-empty-pattern": "error",
	/**
	 * Disabled because TypeScript handles this better.
	 */
	"no-undef": "off",
	"no-unused-expressions": "off",
	"no-useless-escape": "error",
	"no-var": "error",
	"prefer-const": "error",
	"prefer-rest-params": "error",
	/**
	 * Handled by @typescript-eslint/no-unused-vars
	 */
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
	/**
	 * Ignore generated files
	 */
	{
		ignores: ["dist/**", "node_modules/**", ".astro/**", ".vercel/**"],
	},
	/**
	 * Base configs
	 */
	js.configs.recommended,
	...tseslint.configs.recommended,
	...astro.configs["flat/recommended"],
	...svelte.configs["flat/recommended"],
	...svelte.configs["flat/prettier"],
	/**
	 * Browser runtime
	 *
	 * src/**
	 */
	{
		files: ["src/**/*.{js,mjs,cjs,ts}"],
		languageOptions: {
			globals: browserGlobals,
		},
		rules: {
			...commonRules,
			...typescriptRules,
		},
	},
	/**
	 * Svelte components
	 */
	{
		files: ["src/**/*.svelte"],
		languageOptions: {
			globals: browserGlobals,
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
	/**
	 * Astro components
	 */
	{
		files: ["src/**/*.astro"],
		languageOptions: {
			globals: browserGlobals,
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
	/**
	 * Node runtime scripts
	 *
	 * scripts/**
	 */
	{
		files: ["scripts/**/*.{js,mjs,cjs,ts}"],
		languageOptions: {
			globals: nodeGlobals,
		},
		rules: {
			...commonRules,
			...typescriptRules,
		},
	},
	/**
	 * Node runtime config files
	 */
	{
		files: ["astro.config.*", "*.config.{js,mjs,cjs,ts}"],
		languageOptions: {
			globals: nodeGlobals,
		},
		rules: {
			...commonRules,
			...typescriptRules,
		},
	},
];
