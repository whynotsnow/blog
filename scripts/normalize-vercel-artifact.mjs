import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
	statSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

function fail(message) {
	console.error(`[vercel-artifact] ${message}`);
	process.exit(1);
}

function findConfigRoots(directory, roots = []) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const entryPath = join(directory, entry.name);
		if (entry.isSymbolicLink()) continue;
		if (entry.isDirectory()) {
			findConfigRoots(entryPath, roots);
		} else if (entry.isFile() && entry.name === "config.json") {
			roots.push(dirname(entryPath));
		}
	}
	return roots;
}

function copyDirectoryContents(source, destination) {
	rmSync(destination, { recursive: true, force: true });
	mkdirSync(destination, { recursive: true });
	for (const entry of readdirSync(source, { withFileTypes: true })) {
		cpSync(join(source, entry.name), join(destination, entry.name), {
			recursive: true,
			force: true,
		});
	}
}

const [sourceArgument, destinationArgument = ".vercel/output"] =
	process.argv.slice(2);
if (!sourceArgument) {
	fail(
		"Usage: node scripts/normalize-vercel-artifact.mjs <download-dir> [output-dir]",
	);
}

const source = resolve(sourceArgument);
const destination = resolve(destinationArgument);
if (!existsSync(source) || !statSync(source).isDirectory()) {
	fail(`Downloaded artifact directory does not exist: ${sourceArgument}`);
}
if (destination === source || destination.startsWith(`${source}${sep}`)) {
	fail(
		"Output directory must not be inside the downloaded artifact directory.",
	);
}

const configRoots = findConfigRoots(source);
if (configRoots.length !== 1) {
	fail(
		`Expected exactly one Vercel config.json in the downloaded artifact, found ${configRoots.length}.`,
	);
}

const [artifactRoot] = configRoots;
copyDirectoryContents(artifactRoot, destination);
if (!existsSync(join(destination, "config.json"))) {
	fail("Normalized Vercel artifact is missing .vercel/output/config.json.");
}

console.log(
	`Normalized Vercel artifact root: ${relative(process.cwd(), artifactRoot) || "."} -> ${destinationArgument}`,
);
