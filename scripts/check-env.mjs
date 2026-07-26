import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function fail(message, details = []) {
	console.error(`[check-env] ${message}`);
	for (const detail of details) {
		console.error(`  ${detail}`);
	}
	process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageManager = packageJson.packageManager;
const match = /^pnpm@(.+)$/.exec(packageManager ?? "");

if (!match) {
	fail("package.json must declare packageManager as pnpm@<version>.");
}

const expectedPnpmVersion = match[1];

function getPnpmVersionFromUserAgent() {
	const userAgent = process.env.npm_config_user_agent ?? "";
	const packageManagerName = /^([^\s/]+)/.exec(userAgent)?.[1];

	if (packageManagerName && packageManagerName !== "pnpm") {
		fail(`Unsupported package manager: ${packageManagerName}.`, [
			"Use the project-declared package manager through Corepack:",
			"  corepack pnpm <command>",
		]);
	}

	const userAgentMatch = /\bpnpm\/([^\s]+)/.exec(userAgent);
	return userAgentMatch?.[1];
}

function getPnpmVersionFromPath() {
	const result = spawnSync("pnpm", ["--version"], {
		encoding: "utf8",
	});

	if (result.error) {
		fail("Unable to run pnpm.", [
			result.error.message,
			"Run: corepack enable && corepack install",
		]);
	}

	if (result.status !== 0) {
		fail("Unable to read pnpm version.", [
			result.stderr.trim() || result.stdout.trim(),
			"Run: corepack enable && corepack install",
		]);
	}

	return result.stdout.trim();
}

const actualPnpmVersion =
	getPnpmVersionFromUserAgent() ?? getPnpmVersionFromPath();

if (actualPnpmVersion !== expectedPnpmVersion) {
	fail(
		`pnpm version mismatch: expected ${expectedPnpmVersion}, got ${actualPnpmVersion}.`,
		[
			"Run: corepack enable && corepack install",
			"Use project commands through Corepack when another pnpm appears first in PATH:",
			"  corepack pnpm <command>",
		],
	);
}

console.log(`[check-env] Node ${process.version} | pnpm ${actualPnpmVersion}`);
