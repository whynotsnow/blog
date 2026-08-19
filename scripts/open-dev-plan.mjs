import { spawn, spawnSync } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const planRoot = resolve(repoRoot, "..", "blog.plan");
const planPackage = resolve(planRoot, "package.json");
const planServer = resolve(planRoot, "server.mjs");
const requestedPort = Number.parseInt(process.env.PORT || "4177", 10);
const args = process.argv.slice(2);
const shouldPrintOnly = args.includes("--print");
const shouldSkipOpen = args.includes("--no-open") || shouldPrintOnly;
const itemId = args.find((arg) => !arg.startsWith("-"));

async function assertFile(filePath, message) {
	try {
		await access(filePath, constants.R_OK);
	} catch {
		console.error(message);
		process.exit(1);
	}
}

await assertFile(
	planPackage,
	[
		"Missing sidecar planning repository at ../blog.plan.",
		"Restore or create the sidecar before running `pnpm dev:plan`.",
	].join("\n"),
);

await assertFile(
	planServer,
	[
		"Found ../blog.plan, but it does not contain server.mjs.",
		"Check that the sidecar planning board has been initialized.",
	].join("\n"),
);

function isPortAvailable(port) {
	return new Promise((resolveAvailable) => {
		const server = createServer();
		server.once("error", () => resolveAvailable(false));
		server.once("listening", () => {
			server.close(() => resolveAvailable(true));
		});
		server.listen(port);
	});
}

async function findAvailablePort(startPort) {
	if (!Number.isInteger(startPort) || startPort <= 0 || startPort > 65535) {
		console.error(`Invalid PORT: ${process.env.PORT}`);
		process.exit(1);
	}

	const endPort = Math.min(startPort + 20, 65535);
	for (let candidate = startPort; candidate <= endPort; candidate += 1) {
		if (await isPortAvailable(candidate)) {
			return candidate;
		}
	}

	console.error(
		`No available dev plan port found from ${startPort} to ${endPort}.`,
	);
	process.exit(1);
}

function openUrl(url) {
	const command =
		process.platform === "darwin"
			? { cmd: "open", args: [url] }
			: process.platform === "win32"
				? { cmd: "cmd", args: ["/c", "start", "", url] }
				: { cmd: "xdg-open", args: [url] };

	spawnSync(command.cmd, command.args, { stdio: "ignore" });
}

const port = await findAvailablePort(requestedPort);
const previewUrl = `http://localhost:${port}${itemId ? `/?item=${encodeURIComponent(itemId)}` : ""}`;

if (shouldPrintOnly) {
	console.log(previewUrl);
	process.exit(0);
}

console.log(`Starting blog plan board on ${previewUrl}`);
console.log("Use PORT=<port> pnpm dev:plan to choose another port.");

const child = spawn(process.execPath, [planServer], {
	cwd: planRoot,
	env: { ...process.env, PORT: String(port) },
	stdio: "inherit",
});

child.on("error", (error) => {
	console.error(`Failed to start plan board: ${error.message}`);
	process.exit(1);
});

if (!shouldSkipOpen) {
	setTimeout(() => openUrl(previewUrl), 250);
}

child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 0);
});
