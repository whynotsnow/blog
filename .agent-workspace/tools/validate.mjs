import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute } from "node:path";

const SPEC_VERSION = "0.1.0";
const staged = process.argv.includes("--staged");
const requiredLevels = ["core", "disclosure", "runtime", "team"];
const requiredFiles = [
	".agent-workspace/manifest.json",
	"AGENTS.md",
	"docs/agents/disclosure-policy.md",
	"docs/agents/runtime-requirements.md",
	"spec/agent-workspace/SPEC.md",
	"spec/agent-workspace/schemas/manifest.schema.json",
	"spec/agent-workspace/schemas/active-profile.schema.json",
	"spec/agent-workspace/schemas/identity-map.schema.json",
	"spec/agent-workspace/schemas/developer-profile.schema.json",
	"spec/agent-workspace/schemas/machine-profile.schema.json",
	"spec/agent-workspace/schemas/session-profile.schema.json",
	"spec/agent-workspace/examples/active-profile.json",
	"spec/agent-workspace/examples/identity-map.json",
	"spec/agent-workspace/examples/developer-profile.json",
	"spec/agent-workspace/examples/machine-profile.json",
	"spec/agent-workspace/examples/session-profile.json",
	".agent-workspace/tools/agent-workspace.mjs",
	".agent-workspace/tools/profile.mjs",
	".agent-workspace/tools/public-check.mjs",
	".agent-workspace/tools/validate.mjs",
];

function fail(message) {
	console.error(`[agent-workspace] ${message}`);
	process.exit(1);
}

for (const file of requiredFiles) {
	if (!existsSync(file)) fail(`Missing required file: ${file}`);
}

const manifest = JSON.parse(
	readFileSync(".agent-workspace/manifest.json", "utf8"),
);
if (manifest.spec !== "agent-workspace")
	fail("Manifest spec identifier is invalid.");
if (manifest.spec_version !== SPEC_VERSION) {
	fail(`Unsupported spec version: ${manifest.spec_version}`);
}
for (const field of [
	"public_instructions",
	"public_knowledge",
	"local_state",
]) {
	if (typeof manifest[field] !== "string" || !manifest[field]) {
		fail(`Manifest path is unavailable: ${field}`);
	}
	if (isAbsolute(manifest[field])) {
		fail(`Manifest path must be repository-relative: ${field}`);
	}
	if (field !== "local_state" && !existsSync(manifest[field])) {
		fail(`Manifest path is unavailable: ${field}`);
	}
}
if (!manifest.tooling?.entry || !existsSync(manifest.tooling.entry)) {
	fail("Manifest tooling entry is unavailable.");
}
if (isAbsolute(manifest.tooling.entry)) {
	fail("Manifest tooling entry must be repository-relative.");
}
if (typeof manifest.tooling.runtime !== "string" || !manifest.tooling.runtime) {
	fail("Manifest tooling runtime is unavailable.");
}
for (const level of requiredLevels) {
	if (!manifest.conformance?.includes(level)) {
		fail(`Manifest does not declare ${level} conformance.`);
	}
}

const gitignore = readFileSync(".gitignore", "utf8");
for (const path of [
	".agent-workspace/local/",
	".agent-workspace/raw/",
	".agent-workspace/quarantine/",
]) {
	if (!gitignore.split("\n").includes(path)) {
		fail(`Private workspace path is not ignored: ${path}`);
	}
}

for (const file of requiredFiles.filter((file) => file.endsWith(".json"))) {
	const value = JSON.parse(readFileSync(file, "utf8"));
	if (file.includes("/examples/") && value.spec_version !== SPEC_VERSION) {
		fail(`Example does not declare spec ${SPEC_VERSION}: ${file}`);
	}
}

const check = spawnSync(
	process.execPath,
	[
		".agent-workspace/tools/public-check.mjs",
		...(staged ? ["--staged"] : []),
	],
	{ stdio: "inherit" },
);
if (check.status !== 0) process.exit(check.status ?? 1);

if (!staged && existsSync(".agent-workspace/local/active-profile.json")) {
	const doctor = spawnSync(
		process.execPath,
		[".agent-workspace/tools/profile.mjs", "profile", "doctor"],
		{ stdio: "inherit" },
	);
	if (doctor.status !== 0) process.exit(doctor.status ?? 1);
}

console.log(`[agent-workspace] Spec ${SPEC_VERSION}`);
for (const level of requiredLevels) console.log(`  ${level}: PASS`);
