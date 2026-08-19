import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const sidecarRoot = path.resolve(projectRoot, "..", "blog.plan");
const configPath = path.join(sidecarRoot, "plan.config.json");
const indexPath = path.join(sidecarRoot, "index.json");

function readJson(filePath) {
	if (!fs.existsSync(filePath)) {
		throw new Error(
			`Missing sidecar file: ${path.relative(projectRoot, filePath)}`,
		);
	}

	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

try {
	const config = readJson(configPath);
	const index = readJson(indexPath);
	const executableStatuses = new Set(
		config.executableStatuses ?? ["ready", "running"],
	);
	const items = Array.isArray(index.items) ? index.items : [];
	const executableItems = items.filter((item) =>
		executableStatuses.has(item.status),
	);

	process.stdout.write(
		`${JSON.stringify(
			{
				projectName: config.projectName ?? index.projectName ?? "blog",
				sidecarPath: "../blog.plan",
				totalItems: items.length,
				executableStatuses: [...executableStatuses],
				executableItems,
			},
			null,
			2,
		)}\n`,
	);
} catch (error) {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`,
	);
	process.exitCode = 1;
}
