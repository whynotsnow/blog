import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DESIGN_ROOT = "src/design";
const BASELINE_PATH = "scripts/design-system-baseline.json";
const SOURCE_EXTENSIONS = new Set([
	".astro",
	".css",
	".styl",
	".svelte",
	".ts",
]);
const LEGACY_TOKENS = [
	"--page-bg",
	"--card-bg",
	"--card-bg-transparent",
	"--float-panel-bg",
	"--primary",
	"--title-active",
	"--line-divider",
	"--line-color",
	"--content-meta",
	"--radius-large",
];
const REQUIRED_IMPORTS = [
	"./tokens/primitive.css",
	"./tokens/semantic.css",
	"./tokens/typography.css",
	"./tokens/layout.css",
	"./tokens/shape.css",
	"./tokens/motion.css",
	"./themes/light.css",
	"./themes/dark.css",
	"./themes/wallpaper.css",
	"./foundations/document.css",
	"./foundations/focus.css",
	"./foundations/selection.css",
	"./patterns/surface.css",
	"./patterns/page-shell.css",
	"./patterns/reading-flow.css",
	"./patterns/stack.css",
	"./patterns/cluster.css",
	"./compatibility/legacy-tokens.css",
];

function walk(directory) {
	return readdirSync(join(ROOT, directory), { withFileTypes: true }).flatMap(
		(entry) => {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) return walk(path);
			return SOURCE_EXTENSIONS.has(extname(path)) ? [path] : [];
		},
	);
}

function read(path) {
	return readFileSync(join(ROOT, path), "utf8");
}

function uniqueSorted(values) {
	return [...new Set(values)].sort();
}

function collectBaseline() {
	const sourceFiles = [
		"src/pages",
		"src/components",
		"src/layouts",
		"src/features",
		"src/styles",
	].flatMap(walk);
	const legacyTokens = Object.fromEntries(
		LEGACY_TOKENS.map((token) => [
			token,
			uniqueSorted(
				sourceFiles.filter((file) => read(file).includes(token)),
			),
		]),
	);
	const primitiveTokens = {};
	for (const file of sourceFiles) {
		for (const match of read(file).matchAll(/--color-[\w-]+/g)) {
			(primitiveTokens[match[0]] ??= []).push(file);
		}
	}
	for (const [token, files] of Object.entries(primitiveTokens)) {
		primitiveTokens[token] = uniqueSorted(files);
	}
	const pageViolations = {};
	for (const file of walk("src/pages")) {
		const source = read(file);
		const violations = [];
		if (/(?:#(?:[0-9a-f]{3,8})\b|oklch\(|rgba?\()/i.test(source))
			violations.push("color-literal");
		if (/box-shadow\s*:/i.test(source)) violations.push("box-shadow");
		if (/(^|[;{]\s*)--[\w-]+\s*:/m.test(source))
			violations.push("custom-property-definition");
		if (violations.length > 0) pageViolations[file] = violations;
	}
	return { legacyTokens, primitiveTokens, pageViolations };
}

if (process.argv.includes("--print-baseline")) {
	process.stdout.write(`${JSON.stringify(collectBaseline(), null, 2)}\n`);
	process.exit(0);
}

const errors = [];
const baseline = JSON.parse(read(BASELINE_PATH));
const current = collectBaseline();

const indexSource = read(`${DESIGN_ROOT}/index.css`);
const actualImports = [
	...indexSource.matchAll(/@import\s+["']([^"']+)["']/g),
].map((match) => match[1]);
if (JSON.stringify(actualImports) !== JSON.stringify(REQUIRED_IMPORTS)) {
	errors.push(
		"src/design/index.css imports must match the documented Design entry order.",
	);
}

const tokenOwners = new Map();
for (const file of walk(`${DESIGN_ROOT}/tokens`)) {
	for (const match of read(file).matchAll(/(^|[;{]\s*)(--[\w-]+)\s*:/gm)) {
		const token = match[2];
		const owner = tokenOwners.get(token);
		if (owner && owner !== file)
			errors.push(`${token} is defined in both ${owner} and ${file}.`);
		tokenOwners.set(token, file);
	}
}

for (const [token, files] of Object.entries(current.primitiveTokens)) {
	const allowed = new Set(baseline.primitiveTokens?.[token] ?? []);
	for (const file of files) {
		if (!allowed.has(file)) {
			errors.push(`${file} adds primitive token consumption ${token}.`);
		}
	}
}

for (const file of walk(`${DESIGN_ROOT}/patterns`)) {
	for (const match of read(file).matchAll(/\.([a-zA-Z_-][\w-]*)/g)) {
		if (!match[1].startsWith("ds-"))
			errors.push(`${file} exposes non-ds Pattern class .${match[1]}.`);
	}
}

for (const area of ["tokens", "foundations", "patterns", "compatibility"]) {
	for (const file of walk(`${DESIGN_ROOT}/${area}`)) {
		const source = read(file);
		if (
			/#(?:navbar|main-grid|post-container|page-content)\b|\.(?:post-|home-|widget-|search-|settings-)/.test(
				source,
			)
		) {
			errors.push(`${file} contains a feature or route selector.`);
		}
	}
}

for (const [token, files] of Object.entries(current.legacyTokens)) {
	const allowed = new Set(baseline.legacyTokens[token] ?? []);
	for (const file of files) {
		if (!allowed.has(file))
			errors.push(`${file} adds deprecated token ${token}.`);
	}
}

for (const [file, rules] of Object.entries(current.pageViolations)) {
	const allowed = new Set(baseline.pageViolations[file] ?? []);
	for (const rule of rules) {
		if (!allowed.has(rule))
			errors.push(`${file} adds forbidden page-level ${rule}.`);
	}
}

const compatibilitySource = read(
	`${DESIGN_ROOT}/compatibility/legacy-tokens.css`,
);
const aliasGraph = new Map();
for (const match of compatibilitySource.matchAll(
	/(--[\w-]+)\s*:\s*var\((--[\w-]+)/g,
))
	aliasGraph.set(match[1], match[2]);
for (const start of aliasGraph.keys()) {
	const visited = new Set();
	let currentToken = start;
	while (aliasGraph.has(currentToken)) {
		if (visited.has(currentToken)) {
			errors.push(
				`Compatibility aliases contain a cycle starting at ${start}.`,
			);
			break;
		}
		visited.add(currentToken);
		currentToken = aliasGraph.get(currentToken);
	}
}

for (const file of walk(DESIGN_ROOT).filter(
	(file) => !file.includes("/compatibility/"),
)) {
	const source = read(file);
	for (const token of LEGACY_TOKENS) {
		if (source.includes(`var(${token}`))
			errors.push(
				`${file} makes Design depend on legacy token ${token}.`,
			);
	}
}

if (errors.length > 0) {
	console.error("[design-check] FAIL");
	for (const error of uniqueSorted(errors)) console.error(`- ${error}`);
	process.exit(1);
}

console.log(
	`[design-check] PASS: ${tokenOwners.size} Design tokens, ${actualImports.length} ordered imports, no new legacy debt.`,
);
