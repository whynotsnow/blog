import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const astroCacheDir = path.join(rootDir, "node_modules", ".astro");
const distDir = path.join(rootDir, "dist");
const astroAssetPattern =
	/(?:href|src)=["']\/(_astro\/[^"'?#]+)(?:[?#][^"']*)?["']/g;

export function clearAstroCache({
	cacheDir = astroCacheDir,
	logger = console,
} = {}) {
	if (!fs.existsSync(cacheDir)) {
		logger.log("[build-assets] Astro cache already clean");
		return false;
	}

	fs.rmSync(cacheDir, { recursive: true, force: true });
	logger.log("[build-assets] Removed stale Astro content cache");
	return true;
}

export function findMissingAstroAssets({
	outputDir = distDir,
	readFile = fs.readFileSync,
	exists = fs.existsSync,
} = {}) {
	const missingAssets = new Map();

	for (const htmlFile of walkFiles(outputDir, ".html")) {
		const html = readFile(htmlFile, "utf8");
		const relativeHtml = path.relative(outputDir, htmlFile);

		for (const match of html.matchAll(astroAssetPattern)) {
			const assetPath = match[1];
			const fullAssetPath = path.join(outputDir, assetPath);

			if (exists(fullAssetPath)) {
				continue;
			}

			const pages = missingAssets.get(assetPath) ?? [];
			pages.push(relativeHtml);
			missingAssets.set(assetPath, pages);
		}
	}

	return missingAssets;
}

export function verifyAstroAssets(options = {}) {
	const outputDir = options.outputDir ?? distDir;
	const logger = options.logger ?? console;
	const missingAssets = findMissingAstroAssets({
		outputDir,
		readFile: options.readFile,
		exists: options.exists,
	});

	if (missingAssets.size === 0) {
		logger.log("[build-assets] All referenced /_astro assets exist");
		return;
	}

	const details = [...missingAssets.entries()]
		.map(([assetPath, pages]) => {
			const pageList = pages.slice(0, 5).join(", ");
			const suffix =
				pages.length > 5 ? `, and ${pages.length - 5} more` : "";
			return `- /${assetPath} referenced by ${pageList}${suffix}`;
		})
		.join("\n");

	throw new Error(`Missing generated Astro assets:\n${details}`);
}

function* walkFiles(directory, extension) {
	if (!fs.existsSync(directory)) {
		return;
	}

	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const fullPath = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			yield* walkFiles(fullPath, extension);
			continue;
		}

		if (entry.isFile() && fullPath.endsWith(extension)) {
			yield fullPath;
		}
	}
}

const command = process.argv[2];

if (command === "clear-astro-cache") {
	clearAstroCache();
} else if (command === "verify-astro-assets") {
	verifyAstroAssets();
} else if (command) {
	console.error(`[build-assets] Unknown command: ${command}`);
	process.exit(1);
}
