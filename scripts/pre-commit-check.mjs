import { existsSync } from "node:fs";
import { extname } from "node:path";
import { spawnSync } from "node:child_process";

const PRETTIER_EXTENSIONS = new Set([
	".cjs",
	".css",
	".html",
	".js",
	".json",
	".jsonc",
	".jsx",
	".mjs",
	".mts",
	".svelte",
	".ts",
	".tsx",
	".yaml",
	".yml",
]);

const ESLINT_EXTENSIONS = new Set([
	".astro",
	".cjs",
	".js",
	".mjs",
	".mts",
	".svelte",
	".ts",
	".tsx",
]);

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		stdio: "inherit",
		env: {
			...process.env,
			ASTRO_TELEMETRY_DISABLED: "1",
			...options.env,
		},
	});

	if (result.status !== 0) {
		if (options.failureAdvice) {
			console.error(`\n[pre-commit] ${options.failureAdvice}`);
		}
		process.exit(result.status ?? 1);
	}
}

function readGit(args) {
	const result = spawnSync("git", args, {
		encoding: "utf8",
	});

	if (result.status !== 0) {
		process.stderr.write(result.stderr);
		process.exit(result.status ?? 1);
	}

	return result.stdout;
}

function splitNullList(value) {
	return value.split("\0").filter(Boolean);
}

function getStagedFiles() {
	return splitNullList(
		readGit([
			"diff",
			"--cached",
			"--name-only",
			"--diff-filter=ACMR",
			"-z",
		]),
	);
}

function getUnstagedFiles() {
	return new Set(
		splitNullList(
			readGit(["diff", "--name-only", "--diff-filter=ACMR", "-z"]),
		),
	);
}

function isPrettierTarget(file) {
	return PRETTIER_EXTENSIONS.has(extname(file));
}

function isExistingFile(file) {
	return existsSync(file);
}

function isUnder(file, directory) {
	return file === directory || file.startsWith(`${directory}/`);
}

function isVendorStaticAsset(file) {
	return [
		"public/assets/js/twikoo.nocss.js",
		"public/assets/js/mermaid-11.17.2.min.js",
		"public/assets/css/twikoo.css",
		"public/live2d-companion/l2d-widget.min.js",
	].includes(file);
}

function localBin(name) {
	const path = `node_modules/.bin/${name}`;
	if (!existsSync(path)) {
		console.error(`[pre-commit] Missing ${path}. Run pnpm install first.`);
		process.exit(1);
	}
	return path;
}

const stagedFiles = getStagedFiles();

console.log("[pre-commit] Checking Agent Workspace Spec conformance...");
run(process.execPath, [
	".agent-workspace/tools/agent-workspace.mjs",
	"validate",
	"--staged",
]);

const prettierTargets = stagedFiles.filter(
	(file) => isPrettierTarget(file) && !isVendorStaticAsset(file),
);
const unstagedFiles = getUnstagedFiles();
const partiallyStaged = prettierTargets.filter((file) =>
	unstagedFiles.has(file),
);

if (partiallyStaged.length > 0) {
	console.error(
		[
			"[pre-commit] Some staged files also have unstaged changes.",
			"Auto-formatting would risk staging work you did not intend to commit.",
			"Stage or stash the unstaged changes, then commit again:",
			...partiallyStaged.map((file) => `  - ${file}`),
		].join("\n"),
	);
	process.exit(1);
}

if (prettierTargets.length > 0) {
	console.log("[pre-commit] Formatting staged code files...");
	run(localBin("prettier"), [
		"--write",
		"--ignore-unknown",
		...prettierTargets,
	]);
	run("git", ["add", "--", ...prettierTargets]);
}

const whitespaceTargets = stagedFiles.filter(
	(file) => isExistingFile(file) && !isVendorStaticAsset(file),
);
if (whitespaceTargets.length > 0) {
	console.log("[pre-commit] Checking staged whitespace...");
	run("git", ["diff", "--cached", "--check", "--", ...whitespaceTargets]);
}

const markdownTargets = stagedFiles.filter(
	(file) => extname(file) === ".md" && isExistingFile(file),
);
if (markdownTargets.length > 0) {
	console.log("[pre-commit] Checking staged Markdown...");
	run(localBin("markdownlint-cli2"), markdownTargets);
}

const eslintTargets = stagedFiles.filter(
	(file) =>
		ESLINT_EXTENSIONS.has(extname(file)) &&
		isExistingFile(file) &&
		!isVendorStaticAsset(file),
);
if (eslintTargets.length > 0) {
	console.log("[pre-commit] Running ESLint for staged code...");
	run(localBin("eslint"), [...eslintTargets, "--max-warnings", "0"], {
		failureAdvice:
			"ESLint failed. Review the diagnostics above, then run `pnpm lint:fix` for automatically fixable issues and `pnpm lint` to verify.",
	});
}

const affectsDependencies = stagedFiles.some((file) =>
	["package.json", "pnpm-lock.yaml"].includes(file),
);
const affectsDesign = stagedFiles.some(
	(file) =>
		isUnder(file, "src/design") ||
		file === "scripts/check-design-system.mjs",
);
if (affectsDesign || affectsDependencies) {
	console.log("[pre-commit] Checking Design System boundaries...");
	run(process.execPath, ["scripts/check-design-system.mjs"]);
}

const affectsAstro = stagedFiles.some(
	(file) =>
		isUnder(file, "src") ||
		file === "astro.config.mjs" ||
		file === "tsconfig.json" ||
		affectsDependencies,
);
if (affectsAstro) {
	console.log("[pre-commit] Running Astro type/content diagnostics...");
	run(localBin("astro"), ["check", "--minimumFailingSeverity", "hint"], {
		failureAdvice:
			"Astro diagnostics failed. Review the file and line diagnostics above, then run `pnpm check` to verify the fix.",
	});
}

const affectsSourceTypes = stagedFiles.some(
	(file) =>
		(isUnder(file, "src") &&
			[".ts", ".svelte", ".astro"].includes(extname(file))) ||
		file === "tsconfig.json" ||
		affectsDependencies,
);
if (affectsSourceTypes) {
	console.log("[pre-commit] Running source TypeScript diagnostics...");
	run(localBin("tsc"), ["--noEmit"], {
		failureAdvice:
			"TypeScript diagnostics failed. Review the errors above, then run `pnpm type-check` to verify the fix.",
	});
}

const affectsSvelteTypes = stagedFiles.some(
	(file) =>
		(isUnder(file, "src") && extname(file) === ".svelte") ||
		file === "svelte.config.js" ||
		file === "svelte.config.mjs" ||
		file === "tsconfig.json" ||
		affectsDependencies,
);
if (affectsSvelteTypes) {
	console.log("[pre-commit] Running Svelte component diagnostics...");
	run(
		localBin("svelte-check"),
		["--tsconfig", "./tsconfig.json", "--threshold", "error"],
		{
			failureAdvice:
				"Svelte diagnostics failed. Review the errors above, then run `pnpm type-check:svelte` to verify the fix.",
		},
	);
}

const affectsTestTypes = stagedFiles.some(
	(file) =>
		isUnder(file, "tests") ||
		[
			"playwright.config.ts",
			"vitest.config.ts",
			"tsconfig.tests.json",
		].includes(file) ||
		affectsDependencies,
);
if (affectsTestTypes) {
	console.log("[pre-commit] Running test TypeScript diagnostics...");
	run(localBin("tsc"), ["-p", "tsconfig.tests.json", "--noEmit"], {
		failureAdvice:
			"Test TypeScript diagnostics failed. Run `pnpm type-check:tests` to verify the fix.",
	});
}

console.log("[pre-commit] All checks passed.");
