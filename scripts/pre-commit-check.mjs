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

const prettierTargets = stagedFiles.filter(isPrettierTarget);
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

console.log("[pre-commit] Checking staged whitespace...");
run("git", ["diff", "--cached", "--check"]);

console.log("[pre-commit] Running ESLint...");
run(
	localBin("eslint"),
	["src", "scripts", "*.config.{js,mjs,cjs,ts}", "--max-warnings", "0"],
	{
		failureAdvice:
			"ESLint failed. Review the diagnostics above, then run `pnpm lint:fix` for automatically fixable issues and `pnpm lint` to verify.",
	},
);

console.log("[pre-commit] Running Astro type/content diagnostics...");
run(localBin("astro"), ["check"], {
	failureAdvice:
		"Astro diagnostics failed. Review the file and line diagnostics above, then run `pnpm check` to verify the fix.",
});

console.log("[pre-commit] Running TypeScript diagnostics...");
run(localBin("tsc"), ["--noEmit"], {
	failureAdvice:
		"TypeScript diagnostics failed. Review the errors above, then run `pnpm type-check` to verify the fix.",
});

console.log("[pre-commit] All checks passed.");
