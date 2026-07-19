#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.js";
import { parseContentSyncConfig } from "./content-sync/config.mjs";
import { preparePinnedCheckout } from "./content-sync/prepare.mjs";

const rootDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

export function main() {
	loadEnv();
	const config = parseContentSyncConfig(process.env, rootDir);

	if (!config.enabled) {
		console.log("[content] mode=local");
		return;
	}

	const prepared = preparePinnedCheckout(config);
	try {
		console.log(`[content] mode=external commit=${prepared.commitSha}`);
	} finally {
		prepared.cleanup();
	}
}

try {
	main();
} catch (error) {
	console.error(`[content] preparation failed: ${error.message}`);
	process.exitCode = 1;
}
