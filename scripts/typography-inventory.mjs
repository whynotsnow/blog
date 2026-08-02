import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SOURCE_EXTENSIONS = new Set([
	".astro",
	".css",
	".js",
	".mjs",
	".styl",
	".svelte",
	".ts",
]);
const PRIORITY_PATHS = [
	"src/pages/index.astro",
	"src/pages/posts",
	"src/components/home",
	"src/components/category",
	"src/components/post-detail",
	"src/components/post-toc",
	"src/components/PostMeta.astro",
	"src/components/MobileTOC.svelte",
	"src/components/control/FloatingTOC.astro",
	"src/components/comment",
	"src/components/misc/License.astro",
	"src/components/misc/Markdown.astro",
	"src/features/post-list",
	"src/styles/markdown.css",
	"src/styles/markdown-extend.styl",
];
const TEXT_CLASS_RE = /(?:^|[^\w-])text-(xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g;
const FONT_SIZE_RE = /font-size\s*:\s*([^;\n]+);?/g;
const TYPOGRAPHY_TOKEN_RE =
	/var\(--(?:text-(?:caption|meta|ui|body|body-size|body-leading|small|title|article-h[1-4]|display|[\w-]+-size)|post-[\w-]*size|category-[\w-]*size|home-[\w-]*size|toc-[\w-]*size|comment-[\w-]*size|navbar-font-size|footer-[\w-]*size|banner-[\w-]*size)[^)]*\)/;

function walk(path) {
	const absolutePath = join(ROOT, path);
	const entries = readdirSync(absolutePath, { withFileTypes: true });
	return entries.flatMap((entry) => {
		const child = join(path, entry.name);
		if (entry.isDirectory()) return walk(child);
		return SOURCE_EXTENSIONS.has(extname(child)) ? [child] : [];
	});
}

function sourceFiles() {
	return [
		...new Set(
			PRIORITY_PATHS.flatMap((path) => {
				try {
					const absolutePath = join(ROOT, path);
					if (statSync(absolutePath).isDirectory()) return walk(path);
					return SOURCE_EXTENSIONS.has(extname(path)) ? [path] : [];
				} catch {
					return SOURCE_EXTENSIONS.has(extname(path)) ? [path] : [];
				}
			}),
		),
	].sort();
}

function increment(map, key) {
	map.set(key, (map.get(key) ?? 0) + 1);
}

function topEntries(map) {
	return [...map.entries()].sort(
		(a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
	);
}

function isIconLine(line) {
	return /<\s*(?:Icon|LocalIcon)\b|class:\s*["'][^"']*icon|icon[-_]/i.test(
		line,
	);
}

function collectInventory() {
	const files = sourceFiles();
	const textClasses = new Map();
	const textClassFiles = new Map();
	const iconTextClasses = [];
	const rawTextClasses = [];
	const fontSizes = new Map();
	const rawFontSizes = new Map();
	const tokenFontSizes = new Map();
	const rawFontSizeFiles = new Map();
	const invalidTextTokens = [];

	for (const file of files) {
		const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
		lines.forEach((line, index) => {
			const lineNumber = index + 1;
			for (const match of line.matchAll(TEXT_CLASS_RE)) {
				const value = `text-${match[1]}`;
				increment(textClasses, value);
				increment(textClassFiles, file);
				const record = { file, line: lineNumber, value };
				if (isIconLine(line)) iconTextClasses.push(record);
				else rawTextClasses.push(record);
			}

			for (const match of line.matchAll(FONT_SIZE_RE)) {
				const value = match[1].trim();
				increment(fontSizes, value);
				if (TYPOGRAPHY_TOKEN_RE.test(value)) {
					increment(tokenFontSizes, value);
				} else {
					increment(rawFontSizes, value);
					increment(rawFontSizeFiles, file);
				}
			}

			if (/var\(--text-sm\)/.test(line)) {
				invalidTextTokens.push({
					file,
					line: lineNumber,
					token: "--text-sm",
				});
			}
		});
	}

	return {
		files: files.length,
		textClasses: Object.fromEntries(topEntries(textClasses)),
		textClassFiles: Object.fromEntries(topEntries(textClassFiles)),
		textClassTotal: [...textClasses.values()].reduce(
			(sum, count) => sum + count,
			0,
		),
		iconTextClassTotal: iconTextClasses.length,
		rawTextClassTotal: rawTextClasses.length,
		fontSizes: Object.fromEntries(topEntries(fontSizes)),
		fontSizeTotal: [...fontSizes.values()].reduce(
			(sum, count) => sum + count,
			0,
		),
		rawFontSizes: Object.fromEntries(topEntries(rawFontSizes)),
		rawFontSizeFiles: Object.fromEntries(topEntries(rawFontSizeFiles)),
		rawFontSizeTotal: [...rawFontSizes.values()].reduce(
			(sum, count) => sum + count,
			0,
		),
		tokenFontSizes: Object.fromEntries(topEntries(tokenFontSizes)),
		tokenFontSizeTotal: [...tokenFontSizes.values()].reduce(
			(sum, count) => sum + count,
			0,
		),
		invalidTextTokens,
	};
}

function printInventory(inventory) {
	console.log("[typography-inventory] Priority scope");
	console.log(`Files scanned: ${inventory.files}`);
	console.log(
		`Tailwind text-* total: ${inventory.textClassTotal} (${inventory.rawTextClassTotal} text-like, ${inventory.iconTextClassTotal} icon-like)`,
	);
	console.log(
		`font-size total: ${inventory.fontSizeTotal} (${inventory.rawFontSizeTotal} raw, ${inventory.tokenFontSizeTotal} tokenized)`,
	);
	console.log(`Invalid text tokens: ${inventory.invalidTextTokens.length}`);

	console.log("\nTailwind text-* values");
	for (const [value, count] of Object.entries(inventory.textClasses)) {
		console.log(`${String(count).padStart(4)} ${value}`);
	}

	console.log("\nRaw font-size values");
	for (const [value, count] of Object.entries(inventory.rawFontSizes)) {
		console.log(`${String(count).padStart(4)} ${value}`);
	}

	console.log("\nTop text-* files");
	for (const [file, count] of Object.entries(inventory.textClassFiles).slice(
		0,
		20,
	)) {
		console.log(`${String(count).padStart(4)} ${file}`);
	}

	console.log("\nTop raw font-size files");
	for (const [file, count] of Object.entries(
		inventory.rawFontSizeFiles,
	).slice(0, 20)) {
		console.log(`${String(count).padStart(4)} ${file}`);
	}

	if (inventory.invalidTextTokens.length > 0) {
		console.log("\nInvalid text token references");
		for (const item of inventory.invalidTextTokens) {
			console.log(`${item.file}:${item.line} ${item.token}`);
		}
	}
}

const inventory = collectInventory();
if (process.argv.includes("--json")) {
	process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
} else {
	printInventory(inventory);
}

if (
	process.argv.includes("--fail-on-invalid-token") &&
	inventory.invalidTextTokens.length > 0
) {
	process.exitCode = 1;
}
