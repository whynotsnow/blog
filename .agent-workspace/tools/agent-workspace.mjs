import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const [command, ...args] = process.argv.slice(2);

function fail(message) {
	console.error(`[agent-workspace] ${message}`);
	process.exit(1);
}

function findWorkspaceRoot(start) {
	let current = start;
	while (true) {
		if (existsSync(join(current, ".agent-workspace", "manifest.json"))) {
			return current;
		}
		const parent = dirname(current);
		if (parent === current || current === parse(current).root) return null;
		current = parent;
	}
}

function run(script, scriptArgs) {
	const result = spawnSync(
		process.execPath,
		[join(TOOL_DIR, script), ...scriptArgs],
		{
			cwd: process.cwd(),
			stdio: "inherit",
		},
	);
	process.exit(result.status ?? 1);
}

const root = findWorkspaceRoot(process.cwd());
if (!root)
	fail("No .agent-workspace/manifest.json found in this directory tree.");
process.chdir(root);

if (command === "validate") run("validate.mjs", args);
else if (command === "public-check") run("public-check.mjs", args);
else if (["profile", "runtime", "session"].includes(command)) {
	run("profile.mjs", [command, ...args]);
} else {
	fail(
		"Usage: validate [--staged], public-check [--staged|--self-test], profile <action>, runtime detect, or session start.",
	);
}
