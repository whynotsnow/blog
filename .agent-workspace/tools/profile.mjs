import { createHmac, randomBytes } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { arch, platform } from "node:process";
import { spawnSync } from "node:child_process";

const SPEC_VERSION = "0.1.0";
const ROOT = ".agent-workspace/local";
const IDENTITY_MAP = join(ROOT, "identity-map.json");
const ACTIVE_PROFILE = join(ROOT, "active-profile.json");

function fail(message) {
	console.error(`[agent-workspace-profile] ${message}`);
	process.exit(1);
}

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
	mkdirSync(dirname(path), { recursive: true });
	const temporary = `${path}.tmp`;
	writeFileSync(temporary, `${JSON.stringify(value, null, "\t")}\n`, {
		mode: 0o600,
	});
	renameSync(temporary, path);
}

function opaqueId(prefix) {
	return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function gitIdentity() {
	const result = spawnSync("git", ["var", "GIT_AUTHOR_IDENT"], {
		encoding: "utf8",
	});
	if (result.status !== 0) {
		fail(
			"Git author identity is unavailable. Configure it before initializing a profile.",
		);
	}
	const match = result.stdout.trim().match(/^(.*) <([^<>]+)> \d+ [+-]\d+$/);
	if (!match) fail("Could not parse the active Git author identity.");
	return {
		name: match[1].trim().normalize("NFKC").toLowerCase(),
		email: match[2].trim().toLowerCase(),
	};
}

function fingerprint(identity, salt) {
	return createHmac("sha256", salt)
		.update(`${identity.name}\0${identity.email}`)
		.digest("hex");
}

function inferActorType(identity) {
	return /(?:bot|automation|actions|dependabot)/i.test(
		`${identity.name} ${identity.email}`,
	)
		? "automation"
		: "human";
}

function loadIdentityMap() {
	if (existsSync(IDENTITY_MAP)) return readJson(IDENTITY_MAP);
	return {
		spec_version: SPEC_VERSION,
		schema_version: 1,
		salt: randomBytes(32).toString("hex"),
		identities: [],
	};
}

function developerPath(developerId) {
	return join(ROOT, "developers", developerId, "profile.json");
}

function machinePath(machineId) {
	return join(ROOT, "machines", machineId, "runtime-profile.json");
}

function sessionPath(sessionId) {
	return join(ROOT, "sessions", `${sessionId}.json`);
}

function activeProfile() {
	if (!existsSync(ACTIVE_PROFILE)) {
		fail(
			"No active profile. Run `node .agent-workspace/tools/agent-workspace.mjs profile init` first.",
		);
	}
	return readJson(ACTIVE_PROFILE);
}

function environment() {
	return {
		os_family: platform,
		architecture: arch,
		shell: basename(process.env.SHELL || "unknown"),
	};
}

function writeMachineProfile(active, capabilities = {}) {
	writeJson(machinePath(active.machine_id), {
		spec_version: SPEC_VERSION,
		schema_version: 1,
		machine_id: active.machine_id,
		developer_id: active.developer_id,
		environment: environment(),
		capabilities,
		detected_at: new Date().toISOString(),
	});
}

function initialize() {
	mkdirSync(ROOT, { recursive: true, mode: 0o700 });
	const identity = gitIdentity();
	const identityMap = loadIdentityMap();
	identityMap.spec_version = SPEC_VERSION;
	const currentFingerprint = fingerprint(identity, identityMap.salt);
	let mapping = identityMap.identities.find(
		(entry) => entry.fingerprint === currentFingerprint,
	);

	if (!mapping) {
		mapping = {
			fingerprint: currentFingerprint,
			developer_id: opaqueId("dev"),
			actor_type: inferActorType(identity),
		};
		identityMap.identities.push(mapping);
	}
	writeJson(IDENTITY_MAP, identityMap);

	const existingDeveloper = existsSync(developerPath(mapping.developer_id))
		? readJson(developerPath(mapping.developer_id))
		: null;
	const machineIds = existingDeveloper?.machine_ids || [];
	let active = existsSync(ACTIVE_PROFILE) ? readJson(ACTIVE_PROFILE) : null;
	if (!active || active.developer_id !== mapping.developer_id) {
		active = {
			spec_version: SPEC_VERSION,
			schema_version: 1,
			developer_id: mapping.developer_id,
			machine_id: machineIds[0] || opaqueId("machine"),
			session_id: null,
		};
	}
	if (!machineIds.includes(active.machine_id))
		machineIds.push(active.machine_id);
	active.spec_version = SPEC_VERSION;

	writeJson(developerPath(mapping.developer_id), {
		spec_version: SPEC_VERSION,
		schema_version: 1,
		developer_id: mapping.developer_id,
		actor_type: mapping.actor_type,
		machine_ids: machineIds,
		preferences: existingDeveloper?.preferences || {},
	});
	writeJson(ACTIVE_PROFILE, active);
	const existingMachine = existsSync(machinePath(active.machine_id))
		? readJson(machinePath(active.machine_id))
		: { capabilities: {} };
	writeMachineProfile(active, existingMachine.capabilities || {});
	if (active.session_id && existsSync(sessionPath(active.session_id))) {
		const session = readJson(sessionPath(active.session_id));
		writeJson(sessionPath(active.session_id), {
			...session,
			spec_version: SPEC_VERSION,
		});
	}

	console.log(
		`[agent-workspace-profile] Active ${mapping.developer_id} on ${active.machine_id}.`,
	);
}

function linkIdentity(developerId) {
	if (!/^dev_[a-f0-9]{12}$/.test(developerId || "")) {
		fail("Provide a valid opaque developer ID.");
	}
	if (!existsSync(developerPath(developerId))) {
		fail(`Developer profile ${developerId} does not exist locally.`);
	}

	const identity = gitIdentity();
	const identityMap = loadIdentityMap();
	const currentFingerprint = fingerprint(identity, identityMap.salt);
	const existing = identityMap.identities.find(
		(entry) => entry.fingerprint === currentFingerprint,
	);
	if (existing && existing.developer_id !== developerId) {
		fail(
			`The active Git identity is already linked to ${existing.developer_id}.`,
		);
	}
	if (!existing) {
		identityMap.identities.push({
			fingerprint: currentFingerprint,
			developer_id: developerId,
			actor_type: readJson(developerPath(developerId)).actor_type,
		});
		writeJson(IDENTITY_MAP, identityMap);
	}
	console.log(
		`[agent-workspace-profile] Linked active Git identity to ${developerId}.`,
	);
}

function status() {
	const active = activeProfile();
	console.log(JSON.stringify(active, null, 2));
}

function doctor() {
	const active = activeProfile();
	const identityMap = readJson(IDENTITY_MAP);
	const developer = readJson(developerPath(active.developer_id));
	const machine = readJson(machinePath(active.machine_id));
	const failures = [];
	for (const [label, profile] of [
		["identity map", identityMap],
		["active profile", active],
		["developer profile", developer],
		["machine profile", machine],
	]) {
		if (profile.spec_version !== SPEC_VERSION) {
			failures.push(`${label} does not use spec ${SPEC_VERSION}`);
		}
	}

	if (!/^dev_[a-f0-9]{12}$/.test(active.developer_id)) {
		failures.push("active developer ID is invalid");
	}
	if (!/^machine_[a-f0-9]{12}$/.test(active.machine_id)) {
		failures.push("active machine ID is invalid");
	}
	if (developer.developer_id !== active.developer_id) {
		failures.push("developer profile does not match the active profile");
	}
	if (!developer.machine_ids?.includes(active.machine_id)) {
		failures.push("active machine is not linked to the developer profile");
	}
	if (
		machine.machine_id !== active.machine_id ||
		machine.developer_id !== active.developer_id
	) {
		failures.push("machine profile does not match the active profile");
	}
	if (
		identityMap.identities.some(
			(entry) =>
				!/^[a-f0-9]{64}$/.test(entry.fingerprint) ||
				"name" in entry ||
				"email" in entry,
		)
	) {
		failures.push(
			"identity map contains an invalid or clear-text identity entry",
		);
	}
	if (active.session_id) {
		const session = readJson(sessionPath(active.session_id));
		if (session.spec_version !== SPEC_VERSION) {
			failures.push(`session profile does not use spec ${SPEC_VERSION}`);
		}
		if (
			session.developer_id !== active.developer_id ||
			session.machine_id !== active.machine_id
		) {
			failures.push("session profile does not match the active profile");
		}
	}

	if (failures.length > 0) {
		for (const failure of failures) console.error(`  - ${failure}`);
		fail("Local profile validation failed.");
	}

	console.log(
		"[agent-workspace-profile] Local profile relationships are valid.",
	);
}

function detectRuntime() {
	const active = activeProfile();
	const existing = existsSync(machinePath(active.machine_id))
		? readJson(machinePath(active.machine_id))
		: { capabilities: {} };
	writeMachineProfile(active, existing.capabilities || {});
	console.log(`[agent-workspace-profile] Refreshed ${active.machine_id}.`);
}

function startSession() {
	const active = activeProfile();
	const sessionId = opaqueId("session");
	writeJson(sessionPath(sessionId), {
		spec_version: SPEC_VERSION,
		schema_version: 1,
		session_id: sessionId,
		developer_id: active.developer_id,
		machine_id: active.machine_id,
		started_at: new Date().toISOString(),
		capabilities: {},
	});
	writeJson(ACTIVE_PROFILE, { ...active, session_id: sessionId });
	console.log(`[agent-workspace-profile] Started ${sessionId}.`);
}

const [scope, action, argument] = process.argv.slice(2);

if (scope === "profile" && action === "init") initialize();
else if (scope === "profile" && action === "status") status();
else if (scope === "profile" && action === "doctor") doctor();
else if (scope === "profile" && action === "link-identity") {
	linkIdentity(argument);
} else if (scope === "runtime" && action === "detect") detectRuntime();
else if (scope === "session" && action === "start") startSession();
else {
	fail(
		"Usage: profile init|status|doctor|link-identity <developer-id>, runtime detect, or session start.",
	);
}
