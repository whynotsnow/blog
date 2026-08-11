import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
	"src/pages/albums.astro",
	"src/pages/albums",
	"src/pages/diary.astro",
	"src/components/albums",
	"src/components/diary",
	"src/components/filter-tabs",
	"src/features/diary",
	"src/styles/albums.css",
	"src/features/post-list",
	"src/styles/markdown.css",
	"src/styles/markdown-extend.styl",
];
const TEXT_CLASS_RE = /(?:^|[^\w-])text-(xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g;
const FONT_SIZE_RE = /font-size\s*:\s*([^;\n]+);?/g;
const FONT_SIZE_TOKEN_RE = /var\(--[\w-]+(?:\s*,[^)]*)?\)/;
const SIZE_TOKEN_DEFINITION_RE = /(--[\w-]*size)\s*:\s*([^;\n]+);?/g;
const TYPOGRAPHY_SIZE_TOKEN_HINT_RE =
	/(?:text|font|title|heading|label|meta|caption|toc|support|twikoo|license|markdown|category|home|floating|post-detail|post-meta)/;
const GEOMETRY_SIZE_TOKEN_RE =
	/(?:cover|intrinsic|block|inline|width|height|min|max|rail)/;

function walk(path) {
	const absolutePath = join(ROOT, path);
	const entries = readdirSync(absolutePath, { withFileTypes: true });
	return entries.flatMap((entry) => {
		const child = join(path, entry.name);
		if (entry.isDirectory()) return walk(child);
		return SOURCE_EXTENSIONS.has(extname(child)) ? [child] : [];
	});
}

function resolvePaths(paths) {
	return paths.flatMap((path) => {
		try {
			const absolutePath = join(ROOT, path);
			if (statSync(absolutePath).isDirectory()) return walk(path);
			return SOURCE_EXTENSIONS.has(extname(path)) ? [path] : [];
		} catch {
			return SOURCE_EXTENSIONS.has(extname(path)) ? [path] : [];
		}
	});
}

function sourceFiles(scope) {
	const paths = scope === "all" ? ["src"] : PRIORITY_PATHS;
	return [...new Set(resolvePaths(paths))].sort();
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

function isTypographySizeToken(token) {
	return (
		TYPOGRAPHY_SIZE_TOKEN_HINT_RE.test(token) &&
		!GEOMETRY_SIZE_TOKEN_RE.test(token)
	);
}

function usesPublicTypographySize(value) {
	return (
		/^\s*var\(--text-[\w-]+size\)/.test(value) ||
		(/^\s*clamp\(/.test(value) && /var\(--text-[\w-]+size\)/.test(value))
	);
}

export function collectTypographyInventory({ scope = "priority" } = {}) {
	const files = sourceFiles(scope);
	const textClasses = new Map();
	const textClassFiles = new Map();
	const iconTextClasses = [];
	const rawTextClasses = [];
	const fontSizes = new Map();
	const rawFontSizes = new Map();
	const rawNonInheritFontSizes = new Map();
	const tokenFontSizes = new Map();
	const rawFontSizeFiles = new Map();
	const rawFontSizeRecords = [];
	const rawSizeTokenDefinitions = [];
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
				if (FONT_SIZE_TOKEN_RE.test(value)) {
					increment(tokenFontSizes, value);
				} else {
					increment(rawFontSizes, value);
					increment(rawFontSizeFiles, file);
					rawFontSizeRecords.push({
						file,
						line: lineNumber,
						value,
					});
					if (value !== "inherit")
						increment(rawNonInheritFontSizes, value);
				}
			}

			for (const match of line.matchAll(SIZE_TOKEN_DEFINITION_RE)) {
				const value = match[2].trim();
				if (value === "inherit") continue;
				if (!isTypographySizeToken(match[1])) continue;
				if (usesPublicTypographySize(value)) continue;
				rawSizeTokenDefinitions.push({
					file,
					line: lineNumber,
					token: match[1],
					value,
				});
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
		scope,
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
		rawNonInheritFontSizes: Object.fromEntries(
			topEntries(rawNonInheritFontSizes),
		),
		rawFontSizeFiles: Object.fromEntries(topEntries(rawFontSizeFiles)),
		rawFontSizeTotal: [...rawFontSizes.values()].reduce(
			(sum, count) => sum + count,
			0,
		),
		rawNonInheritFontSizeTotal: [...rawNonInheritFontSizes.values()].reduce(
			(sum, count) => sum + count,
			0,
		),
		rawFontSizeRecords,
		tokenFontSizes: Object.fromEntries(topEntries(tokenFontSizes)),
		tokenFontSizeTotal: [...tokenFontSizes.values()].reduce(
			(sum, count) => sum + count,
			0,
		),
		rawSizeTokenDefinitions,
		invalidTextTokens,
	};
}

function printInventory(inventory) {
	console.log(`[typography-inventory] ${inventory.scope} scope`);
	console.log(`Files scanned: ${inventory.files}`);
	console.log(
		`Tailwind text-* total: ${inventory.textClassTotal} (${inventory.rawTextClassTotal} text-like, ${inventory.iconTextClassTotal} icon-like)`,
	);
	console.log(
		`font-size total: ${inventory.fontSizeTotal} (${inventory.rawFontSizeTotal} raw, ${inventory.tokenFontSizeTotal} tokenized)`,
	);
	console.log(`Invalid text tokens: ${inventory.invalidTextTokens.length}`);
	console.log(
		`Raw size token definitions: ${inventory.rawSizeTokenDefinitions.length}`,
	);

	console.log("\nTailwind text-* values");
	for (const [value, count] of Object.entries(inventory.textClasses)) {
		console.log(`${String(count).padStart(4)} ${value}`);
	}

	console.log("\nRaw font-size values");
	for (const [value, count] of Object.entries(inventory.rawFontSizes)) {
		console.log(`${String(count).padStart(4)} ${value}`);
	}

	console.log("\nRaw non-inherit font-size values");
	for (const [value, count] of Object.entries(
		inventory.rawNonInheritFontSizes,
	)) {
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

	if (inventory.rawSizeTokenDefinitions.length > 0) {
		console.log("\nRaw size token definitions");
		for (const item of inventory.rawSizeTokenDefinitions.slice(0, 40)) {
			console.log(
				`${item.file}:${item.line} ${item.token}: ${item.value}`,
			);
		}
	}
}

function getOptionValue(name, fallback) {
	const prefix = `${name}=`;
	const value = process.argv.find((arg) => arg.startsWith(prefix));
	return value ? value.slice(prefix.length) : fallback;
}

function runCli() {
	const scope = getOptionValue("--scope", "priority");
	if (!["priority", "all"].includes(scope)) {
		console.error(
			"[typography-inventory] --scope must be priority or all.",
		);
		process.exitCode = 1;
		return;
	}

	const inventory = collectTypographyInventory({ scope });
	if (process.argv.includes("--json")) {
		process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
	} else {
		printInventory(inventory);
	}

	const failReasons = [];
	if (
		process.argv.includes("--fail-on-invalid-token") &&
		inventory.invalidTextTokens.length > 0
	)
		failReasons.push("invalid Typography token references");
	if (
		process.argv.includes("--fail-on-text-class") &&
		inventory.rawTextClassTotal > 0
	)
		failReasons.push("text-like Tailwind text-* classes");
	if (
		process.argv.includes("--fail-on-raw-font-size") &&
		inventory.rawNonInheritFontSizeTotal > 0
	)
		failReasons.push("raw non-inherit font-size declarations");
	if (
		process.argv.includes("--fail-on-raw-size-token") &&
		inventory.rawSizeTokenDefinitions.length > 0
	)
		failReasons.push("raw --*-size token definitions");

	if (failReasons.length > 0) {
		console.error(
			`[typography-inventory] FAIL: ${failReasons.join(", ")}.`,
		);
		process.exitCode = 1;
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	runCli();
}
