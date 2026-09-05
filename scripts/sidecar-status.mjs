import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const sidecarRoot = path.resolve(projectRoot, "..", "blog.plan");
const sidecarPath = "../blog.plan";
const configPath = path.join(sidecarRoot, "plan.config.json");
const indexPath = path.join(sidecarRoot, "index.json");
const statusByPhase = {
	demand: ["discussing", "needs-decision", "decided", "deferred"],
	execution: ["ready", "running", "blocked", "done"],
	archive: ["archived"],
};

function relativePath(filePath) {
	return path.relative(projectRoot, filePath) || path.basename(filePath);
}

function fail(code, message, details = []) {
	process.stdout.write(
		`${JSON.stringify(
			{
				ok: false,
				schemaVersion: 2,
				projectName: "blog",
				projectKey: "BLOG",
				sidecarPath,
				error: { code, message, details },
			},
			null,
		)}\n`,
	);
	process.exitCode = 1;
}

function readJson(filePath, code) {
	if (!fs.existsSync(filePath)) {
		fail(code, "Required sidecar data is unavailable.", [
			{ path: relativePath(filePath), reason: "missing" },
		]);
		return null;
	}

	try {
		return JSON.parse(fs.readFileSync(filePath, "utf8"));
	} catch {
		fail("invalid_json", "Sidecar JSON could not be parsed.", [
			{ path: relativePath(filePath), reason: "invalid-json" },
		]);
		return null;
	}
}

function emptyCounts() {
	return Object.fromEntries(
		Object.entries(statusByPhase).map(([phase, statuses]) => [
			phase,
			Object.fromEntries(statuses.map((status) => [status, 0])),
		]),
	);
}

function validateAndSummarize(config, index) {
	const details = [];
	if (config?.schemaVersion !== 2) {
		details.push({
			path: "plan.config.json",
			field: "schemaVersion",
			reason: "expected 2",
		});
	}
	if (config?.sidecarKind !== "agent-project-sidecar") {
		details.push({
			path: "plan.config.json",
			field: "sidecarKind",
			reason: "expected agent-project-sidecar",
		});
	}
	if (config?.projectKey !== "BLOG" || config?.itemPrefix !== "BLOG-RM") {
		details.push({
			path: "plan.config.json",
			field: "projectKey/itemPrefix",
			reason: "expected BLOG/BLOG-RM",
		});
	}
	if (index?.schemaVersion !== 2) {
		details.push({
			path: "index.json",
			field: "schemaVersion",
			reason: "expected 2",
		});
	}
	if (!Array.isArray(index?.items)) {
		details.push({
			path: "index.json",
			field: "items",
			reason: "expected array",
		});
	}
	if (details.length > 0) return { details };

	const counts = emptyCounts();
	const items = [];
	const seenIds = new Set();
	for (const [position, source] of index.items.entries()) {
		const item = {
			id: source?.id,
			title: source?.title,
			type: source?.type,
			priority: source?.priority,
			phase: source?.phase,
			status: source?.status,
			archiveReason: source?.archiveReason ?? null,
			itemPath: source?.itemPath,
			...(source?.planPath ? { planPath: source.planPath } : {}),
			updatedAt: source?.updatedAt,
			relations: Array.isArray(source?.relations) ? source.relations : [],
			...(Array.isArray(source?.implementationPhases)
				? { implementationPhases: source.implementationPhases }
				: {}),
		};
		if (typeof item.id !== "string" || seenIds.has(item.id)) {
			details.push({
				path: "index.json",
				field: `items[${position}].id`,
				reason: "missing or duplicated item ID",
			});
			continue;
		}
		seenIds.add(item.id);
		if (!statusByPhase[item.phase]?.includes(item.status)) {
			details.push({
				path: "index.json",
				field: `items[${position}].phase/status`,
				reason: `${item.phase ?? "missing"}/${item.status ?? "missing"}`,
			});
			continue;
		}
		if (
			item.archiveReason !== null &&
			!["completed", "rejected", "superseded"].includes(
				item.archiveReason,
			)
		) {
			details.push({
				path: "index.json",
				field: `items[${position}].archiveReason`,
				reason: "invalid archive reason",
			});
			continue;
		}
		if (item.phase !== "archive" && item.archiveReason !== null) {
			details.push({
				path: "index.json",
				field: `items[${position}].archiveReason`,
				reason: "non-archived item must use null",
			});
			continue;
		}
		if (item.phase === "archive" && item.archiveReason === null) {
			details.push({
				path: "index.json",
				field: `items[${position}].archiveReason`,
				reason: "archived item requires a reason",
			});
			continue;
		}
		counts[item.phase][item.status] += 1;
		items.push(item);
	}

	if (details.length > 0) return { details };
	items.sort(
		(left, right) =>
			String(right.updatedAt).localeCompare(String(left.updatedAt)) ||
			left.id.localeCompare(right.id),
	);
	return { counts, items };
}

const config = readJson(configPath, "sidecar_missing");
if (!config) process.exit(process.exitCode ?? 1);
const index = readJson(indexPath, "sidecar_missing");
if (!index) process.exit(process.exitCode ?? 1);
const snapshot = validateAndSummarize(config, index);
if (snapshot.details) {
	fail(
		"invalid_sidecar",
		"Sidecar data failed v2 status validation.",
		snapshot.details,
	);
} else {
	const executable = snapshot.items
		.filter(
			(item) =>
				item.phase === "execution" &&
				["ready", "running"].includes(item.status),
		)
		.map((item) => item.id);
	const blocked = snapshot.items
		.filter(
			(item) => item.phase === "execution" && item.status === "blocked",
		)
		.map((item) => item.id);
	const needsDecision = snapshot.items
		.filter(
			(item) =>
				item.phase === "demand" && item.status === "needs-decision",
		)
		.map((item) => item.id);
	process.stdout.write(
		`${JSON.stringify(
			{
				ok: true,
				schemaVersion: 2,
				projectName: config.projectName,
				projectKey: config.projectKey,
				sidecarPath,
				source: { indexPath: "index.json", updatedAt: index.updatedAt },
				generatedAt: new Date().toISOString(),
				counts: snapshot.counts,
				items: snapshot.items,
				executable,
				blocked,
				needsDecision,
			},
			null,
			2,
		)}\n`,
	);
}
