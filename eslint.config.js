import js from "@eslint/js";
import astroParser from "astro-eslint-parser";
import astro from "eslint-plugin-astro";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Runtime boundaries
 *
 * Browser:
 * - src/**
 *
 * Node:
 * - scripts/**
 * - .agent-workspace/tools/**
 * - config files
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
 * Files running in Node environment
 */
const nodeToolingFiles = [
	"scripts/**/*.{js,mjs,cjs,ts}",
	"tests/**/*.{js,mjs,cjs,ts}",
	".agent-workspace/tools/**/*.{js,mjs,cjs,ts}",
	"astro.config.*",
	"*.config.{js,mjs,cjs,ts}",
];

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
		ignores: [
			"dist/**",
			"node_modules/**",
			".astro/**",
			".vercel/**",
			"public/live2d-companion/l2d-widget.min.js",
		],
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

			/**
			 * Svelte 5:
			 * $props / $bindable use let declarations.
			 */
			"prefer-const": "off",
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
	 * Node runtime
	 *
	 * scripts
	 * .agent-workspace/tools
	 * config files
	 */
	{
		files: nodeToolingFiles,

		languageOptions: {
			globals: nodeGlobals,
		},

		rules: {
			...commonRules,
			...typescriptRules,
		},
	},
];
