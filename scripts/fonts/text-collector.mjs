import fs from "node:fs";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([
	".astro",
	".js",
	".json",
	".md",
	".mdx",
	".mjs",
	".svelte",
	".ts",
	".yaml",
	".yml",
]);

const CJK_CHARACTER =
	/[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/u;

const CJK_SAFELIST =
	"0123456789，。！？；：‘’“”（）【】《》、·—…「」『』示例歌曲艺术家";

export function getAsciiCharset() {
	return Array.from({ length: 95 }, (_, index) =>
		String.fromCharCode(index + 32),
	).join("");
}

function walkTextFiles(directory, files = []) {
	if (!fs.existsSync(directory)) return files;

	const entries = fs
		.readdirSync(directory, { withFileTypes: true })
		.sort((left, right) => left.name.localeCompare(right.name));

	for (const entry of entries) {
		const filePath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			walkTextFiles(filePath, files);
		} else if (
			TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
		) {
			files.push(filePath);
		}
	}

	return files;
}

function addCjkCharacters(content, characters) {
	for (const character of content) {
		if (CJK_CHARACTER.test(character)) characters.add(character);
	}
}

export function resolveContentDirectory(rootDir, environment = process.env) {
	if (environment.ENABLE_CONTENT_SYNC === "true") {
		const contentStateDir = environment.CONTENT_DIR || "content";
		return path.resolve(rootDir, contentStateDir, "current");
	}

	return path.resolve(rootDir, "src/content");
}

/**
 * @param {{ rootDir: string, environment?: NodeJS.ProcessEnv }} options
 */
export function collectSiteCjkCharset({ rootDir, environment = process.env }) {
	if (!rootDir) throw new Error("rootDir is required to collect font text");

	const characters = new Set(CJK_SAFELIST);
	const sourceDir = path.resolve(rootDir, "src");
	const localContentDir = path.resolve(rootDir, "src/content");
	const contentDir = resolveContentDirectory(rootDir, environment);

	for (const filePath of walkTextFiles(sourceDir)) {
		if (
			contentDir !== localContentDir &&
			(filePath === localContentDir ||
				filePath.startsWith(`${localContentDir}${path.sep}`))
		) {
			continue;
		}
		addCjkCharacters(fs.readFileSync(filePath, "utf8"), characters);
	}

	if (contentDir !== localContentDir) {
		if (!fs.existsSync(contentDir)) {
			throw new Error(
				`Prepared content directory does not exist: ${contentDir}`,
			);
		}
		for (const filePath of walkTextFiles(contentDir)) {
			addCjkCharacters(fs.readFileSync(filePath, "utf8"), characters);
		}
	}

	return [...characters].sort().join("");
}

/**
 * @param {{ charset: string, id: string }} fontPackage
 * @param {{ rootDir: string, environment?: NodeJS.ProcessEnv }} options
 */
export function collectCharset(fontPackage, options) {
	switch (fontPackage.charset) {
		case "ascii":
			return getAsciiCharset();
		case "site-cjk":
			return collectSiteCjkCharset(options);
		default:
			throw new Error(
				`Unknown charset strategy for ${fontPackage.id}: ${fontPackage.charset}`,
			);
	}
}
