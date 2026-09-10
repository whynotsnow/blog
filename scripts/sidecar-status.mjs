import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const sidecarPath = "../blog.sidecar";
const jsonMode = process.argv.includes("--json");
const schemaVersion = 3;
const phases = {
	demand: ["discussing", "decided", "deferred"],
	execution: ["ready", "running", "blocked", "done"],
	archive: ["archived"],
};

function fail(code, message, details = []) {
	const payload = {
		ok: false,
		schemaVersion,
		projectName: "blog",
		projectKey: "BLOG",
		sidecarPath,
		error: { code, message, details },
	};
	process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
	process.exitCode = 1;
}
function readJson(file, label) {
	if (!fs.existsSync(file)) {
		fail("SIDECAR_NOT_FOUND", `${label} is unavailable.`, [
			{ path: sidecarPath, reason: "missing" },
		]);
		return null;
	}
	try {
		return JSON.parse(fs.readFileSync(file, "utf8"));
	} catch (error) {
		fail("SIDECAR_CONFIG_OR_INDEX_INVALID", `${label} is not valid JSON.`, [
			{ path: path.basename(file), reason: error.message },
		]);
		return null;
	}
}

const root = path.resolve(projectRoot, sidecarPath);
const config = readJson(
	path.join(root, "sidecar.config.json"),
	"Blog sidecar config",
);
const index = readJson(path.join(root, "index.json"), "Blog sidecar index");
if (!config || !index) process.exit(1);
if (
	config.schemaVersion !== schemaVersion ||
	index.schemaVersion !== schemaVersion
) {
	fail("SIDECAR_SCHEMA_UNSUPPORTED", "Sidecar must use schemaVersion 3.");
	process.exit(1);
}
if (!Array.isArray(index.rms) || !Array.isArray(index.tasks)) {
	fail(
		"SIDECAR_INDEX_INVALID",
		"index.json must contain rms and tasks arrays.",
	);
	process.exit(1);
}
const counts = Object.fromEntries(
	Object.entries(phases).map(([phase, statuses]) => [
		phase,
		Object.fromEntries(statuses.map((status) => [status, 0])),
	]),
);
function summarize(item, type) {
	if (
		!item ||
		typeof item.id !== "string" ||
		!phases[item.phase]?.includes(item.status)
	) {
		fail(
			"SIDECAR_STATUS_INVALID",
			"index.json contains an invalid RM/task lifecycle.",
			[{ itemId: item?.id ?? null }],
		);
		process.exit(1);
	}
	counts[item.phase][item.status] += 1;
	return {
		...item,
		type,
		itemPath:
			item.itemPath ?? `${type === "rm" ? "rms" : "tasks"}/${item.id}.md`,
	};
}
const rms = index.rms.map((item) => summarize(item, "rm"));
const tasks = index.tasks.map((item) => summarize(item, "task"));
const items = [...rms, ...tasks].sort(
	(left, right) =>
		String(right.updatedAt ?? "").localeCompare(
			String(left.updatedAt ?? ""),
		) || left.id.localeCompare(right.id),
);
const payload = {
	ok: true,
	schemaVersion,
	projectName: config.projectName,
	projectKey: config.projectKey,
	sidecarPath,
	source: {
		indexPath: `${sidecarPath}/index.json`,
		updatedAt: index.updatedAt,
	},
	counts,
	rms,
	tasks,
	boards: { rm: { items: rms }, task: { items: tasks } },
	items,
	executable: tasks
		.filter(
			(item) =>
				item.phase === "execution" &&
				["ready", "running"].includes(item.status),
		)
		.map((item) => item.id)
		.sort(),
	blocked: tasks
		.filter(
			(item) => item.phase === "execution" && item.status === "blocked",
		)
		.map((item) => item.id)
		.sort(),
};
if (jsonMode) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
else {
	console.log(`${payload.projectName} sidecar v3 status`);
	console.log(`sidecar root: ${payload.sidecarPath}`);
	console.log(`RM: ${rms.length}; task: ${tasks.length}`);
	console.log(`executable tasks: ${payload.executable.join(", ") || "none"}`);
}
