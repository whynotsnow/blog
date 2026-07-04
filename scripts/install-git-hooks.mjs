import { spawnSync } from "node:child_process";

const result = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
	stdio: "ignore",
});

if (result.status !== 0) {
	process.exit(0);
}

const configResult = spawnSync(
	"git",
	["config", "core.hooksPath", ".githooks"],
	{
		stdio: "inherit",
	},
);

if (configResult.status !== 0) {
	console.warn("[hooks] Failed to configure core.hooksPath.");
	process.exit(configResult.status ?? 1);
}

console.log("[hooks] Git hooks path set to .githooks");
