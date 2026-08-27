#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_PRODUCTION_POSTS_RELATIVE = "src/content/posts";
export const DEFAULT_TEST_POSTS_RELATIVE = "tests/content/posts";
export const DEFAULT_OVERLAY_POSTS_RELATIVE = "src/.content-dev/posts";

const MARKDOWN_PATTERN = /\.(md|mdx|markdown)$/i;
const FORBIDDEN_ALIAS_CHARACTER_PATTERN = /[?#\\]/;
const CATEGORY_DEFINITIONS = new Map([
	["技术", "tech"],
	["technology", "tech"],
	["博客技术", "blog-tech"],
	["测试内容", "test-content"],
	["前端", "frontend"],
	["随笔", "notes"],
	["生活", "life"],
	["学习", "learn"],
	["工作", "work"],
	["教程", "tutorials"],
	["guides", "guides"],
]);

export class ContentOverlayError extends Error {
	/** @param {string[]} issues */
	constructor(issues) {
		super(
			[
				"[content-overlay] development overlay failed.",
				"",
				...issues.map((issue) => `- ${issue}`),
			].join("\n"),
		);
		this.name = "ContentOverlayError";
		this.issues = issues;
	}
}

function normalizeRelativePath(value) {
	return value.split(path.sep).join("/");
}

function toSlug(value) {
	return value.toLocaleLowerCase("en-US").trim().replace(/\s+/g, "-");
}

function decodeSlug(value) {
	try {
		return decodeURIComponent(value);
	} catch {
		throw new Error("contains invalid percent encoding");
	}
}

function validateSlugSegments(value) {
	if (
		Array.from(value).some((character) => {
			const codePoint = character.codePointAt(0) ?? 0;
			return codePoint <= 0x1f || codePoint === 0x7f;
		})
	) {
		throw new Error("contains control characters");
	}

	if (FORBIDDEN_ALIAS_CHARACTER_PATTERN.test(value)) {
		throw new Error("contains a query, hash, or backslash");
	}

	const segments = value.split("/");
	if (segments.some((segment) => segment.length === 0)) {
		throw new Error("contains an empty path segment");
	}

	if (segments.some((segment) => segment === "." || segment === "..")) {
		throw new Error('contains a forbidden "." or ".." path segment');
	}
}

export function normalizePostSlug(value) {
	if (typeof value !== "string") {
		throw new Error("must be a string");
	}

	let normalized = value
		.trim()
		.normalize("NFC")
		.replace(/^\/+|\/+$/g, "");
	if (/^posts\//i.test(normalized)) {
		normalized = normalized.replace(/^posts\//i, "");
	}

	if (!normalized) throw new Error("must not be empty");

	validateSlugSegments(normalized);
	validateSlugSegments(decodeSlug(normalized).normalize("NFC"));

	return normalized;
}

function routeCollisionKey(slug) {
	return decodeSlug(slug).normalize("NFC").toLocaleLowerCase("en-US");
}

function stripMarkdownExtension(relativePath) {
	return relativePath.replace(MARKDOWN_PATTERN, "");
}

function readFrontmatter(content) {
	if (!content.startsWith("---\n")) return "";
	const endIndex = content.indexOf("\n---", 4);
	if (endIndex === -1) return "";
	return content.slice(4, endIndex);
}

function readScalar(frontmatter, field) {
	const match = frontmatter.match(
		new RegExp(`^${field}:\\s*(.*?)\\s*$`, "m"),
	);
	if (!match) return undefined;
	const value = match[1].trim();
	if (!value || value === "''" || value === '""') return undefined;
	const quoted = value.match(/^['"](.*)['"]$/);
	return quoted ? quoted[1] : value;
}

function normalizeCategoryName(value) {
	return value.trim().normalize("NFC");
}

function resolveCategory(category) {
	const name = normalizeCategoryName(category || "");
	if (!name) return undefined;
	const key = name.toLocaleLowerCase("en-US");
	return {
		name,
		slug: CATEGORY_DEFINITIONS.get(key) ?? toSlug(name),
	};
}

function describePost(post) {
	return `${post.sourceLabel}:${post.relativePath}`;
}

function explainConflict(type, matches, suggestion) {
	return `${type}: ${matches.join(" <-> ")}. 建议: ${suggestion}`;
}

function listFiles(directory, fsApi) {
	if (!fsApi.existsSync(directory)) return [];
	const entries = fsApi.readdirSync(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const fullPath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...listFiles(fullPath, fsApi));
			continue;
		}
		if (entry.isFile()) files.push(fullPath);
	}
	return files;
}

function collectSourceFiles(source) {
	return listFiles(source.absolutePath, source.fsApi).map((absolutePath) => {
		const relativePath = normalizeRelativePath(
			path.relative(source.absolutePath, absolutePath),
		);
		return {
			sourceLabel: source.label,
			sourceRoot: source.absolutePath,
			absolutePath,
			relativePath,
		};
	});
}

function collectPost(file, fsApi) {
	const content = fsApi.readFileSync(file.absolutePath, "utf8");
	const frontmatter = readFrontmatter(content);
	const defaultSlug = normalizePostSlug(
		stripMarkdownExtension(file.relativePath),
	);
	const alias = readScalar(frontmatter, "alias");
	const canonicalSlug = alias ? normalizePostSlug(alias) : defaultSlug;
	const category = resolveCategory(readScalar(frontmatter, "category") ?? "");

	return {
		...file,
		defaultSlug,
		canonicalSlug,
		alias,
		category,
	};
}

function pushBucket(buckets, key, post) {
	const matches = buckets.get(key) ?? [];
	matches.push(post);
	buckets.set(key, matches);
}

function addRouteIssues(issues, posts) {
	const defaults = new Map();
	const canonicals = new Map();
	const aliases = new Map();

	for (const post of posts) {
		pushBucket(defaults, routeCollisionKey(post.defaultSlug), post);
		pushBucket(canonicals, routeCollisionKey(post.canonicalSlug), post);
		if (post.alias)
			pushBucket(aliases, routeCollisionKey(post.alias), post);
	}

	for (const matches of defaults.values()) {
		if (matches.length < 2) continue;
		issues.push(
			explainConflict(
				`文章默认 slug 冲突 "${matches[0].defaultSlug}"`,
				matches.map(describePost),
				"重命名测试文章文件或目录，例如使用 fixture-* 前缀。",
			),
		);
	}

	for (const matches of canonicals.values()) {
		if (matches.length < 2) continue;
		issues.push(
			explainConflict(
				`文章 canonical URL 冲突 "/posts/${matches[0].canonicalSlug}/"`,
				matches.map(describePost),
				"调整测试文章 alias 或文件名，保证每篇文章生成唯一公开 URL。",
			),
		);
	}

	for (const matches of aliases.values()) {
		if (matches.length < 2) continue;
		issues.push(
			explainConflict(
				`文章 alias 冲突 "${matches[0].alias}"`,
				matches.map(describePost),
				"为测试文章使用独立 alias，例如 fixture-*。",
			),
		);
	}

	for (const [aliasKey, aliasMatches] of aliases.entries()) {
		const defaultMatches = defaults.get(aliasKey) ?? [];
		const selfDefaults = defaultMatches.filter((defaultPost) =>
			aliasMatches.includes(defaultPost),
		);
		if (selfDefaults.length > 0) {
			issues.push(
				explainConflict(
					`文章 alias 与自身默认 slug 重复 "${aliasMatches[0].alias}"`,
					selfDefaults.map(describePost),
					"移除这个 alias，或把 alias 改成不同于文件默认 slug 的公开路径。",
				),
			);
		}

		const externalDefaults = defaultMatches.filter(
			(defaultPost) => !aliasMatches.includes(defaultPost),
		);
		if (externalDefaults.length === 0) continue;
		issues.push(
			explainConflict(
				`文章 alias 与默认 slug 互撞 "${aliasMatches[0].alias}"`,
				[
					...aliasMatches.map(describePost),
					...externalDefaults.map(describePost),
				],
				"调整 alias 或重命名被指向的测试文件；alias 不能指向另一篇文章的默认 slug。",
			),
		);
	}
}

function addCategoryIssues(issues, posts) {
	const categories = new Map();
	for (const post of posts) {
		if (!post.category) continue;
		const slug = toSlug(post.category.slug);
		const names = categories.get(slug) ?? new Map();
		const nameKey = post.category.name
			.normalize("NFC")
			.toLocaleLowerCase("en-US");
		const matches = names.get(nameKey) ?? [];
		matches.push(post);
		names.set(nameKey, matches);
		categories.set(slug, names);
	}

	for (const [slug, names] of categories.entries()) {
		if (names.size < 2) continue;
		const matches = [...names.values()]
			.map((postsWithName) => postsWithName.map(describePost).join(", "))
			.join(" <-> ");
		issues.push(
			`分类 slug 冲突 "${slug}": ${matches}. 建议: 为测试分类配置独立 slug，或统一使用同一个规范分类名称。`,
		);
	}
}

function assertNoConflicts(files, fsApi) {
	const issues = [];
	const overlayPaths = new Map();
	for (const file of files) {
		const key = file.relativePath
			.normalize("NFC")
			.toLocaleLowerCase("en-US");
		const existing = overlayPaths.get(key);
		if (existing) {
			issues.push(
				explainConflict(
					`overlay 文件路径冲突 "${file.relativePath}"`,
					[describePost(existing), describePost(file)],
					"重命名测试内容文件或目录，避免写入同一个 overlay 相对路径。",
				),
			);
		}
		overlayPaths.set(key, file);
	}

	const posts = [];
	for (const file of files.filter((item) =>
		MARKDOWN_PATTERN.test(item.relativePath),
	)) {
		try {
			posts.push(collectPost(file, fsApi));
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			issues.push(
				`文章路由无效 ${describePost(file)}: ${message}. 建议: 检查文件名和 alias，避免空路径、query/hash、反斜杠、非法 percent encoding 或 "."/".." 路径段。`,
			);
		}
	}

	addRouteIssues(issues, posts);
	addCategoryIssues(issues, posts);

	if (issues.length > 0) throw new ContentOverlayError(issues);
}

function copyFiles(files, overlayRoot, fsApi) {
	fsApi.rmSync(overlayRoot, { recursive: true, force: true });
	fsApi.mkdirSync(overlayRoot, { recursive: true });
	for (const file of files) {
		const destination = path.join(overlayRoot, file.relativePath);
		fsApi.mkdirSync(path.dirname(destination), { recursive: true });
		fsApi.copyFileSync(file.absolutePath, destination);
	}
}

export function prepareDevelopmentContent({
	rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
	productionPostsRelative = DEFAULT_PRODUCTION_POSTS_RELATIVE,
	testPostsRelative = DEFAULT_TEST_POSTS_RELATIVE,
	overlayPostsRelative = DEFAULT_OVERLAY_POSTS_RELATIVE,
	fsApi = fs,
	logger = console,
} = {}) {
	const productionRoot = path.join(rootDir, productionPostsRelative);
	const testRoot = path.join(rootDir, testPostsRelative);
	const overlayRoot = path.join(rootDir, overlayPostsRelative);

	if (!fsApi.existsSync(productionRoot)) {
		throw new ContentOverlayError([
			`生产内容源不存在: ${productionPostsRelative}. 建议: 先运行 pnpm content:prepare，或检查外部内容仓库是否成功准备。`,
		]);
	}
	if (!fsApi.existsSync(testRoot)) {
		throw new ContentOverlayError([
			`测试内容源不存在: ${testPostsRelative}. 建议: 创建测试文章目录，并至少保留用于 E2E 的稳定测试文章。`,
		]);
	}

	const files = [
		...collectSourceFiles({
			label: "production",
			absolutePath: productionRoot,
			fsApi,
		}),
		...collectSourceFiles({
			label: "test",
			absolutePath: testRoot,
			fsApi,
		}),
	];

	assertNoConflicts(files, fsApi);
	copyFiles(files, overlayRoot, fsApi);
	logger.log(
		`[content-overlay] mode=development posts=${files.length} output=${overlayPostsRelative}`,
	);
	return { filesCopied: files.length, overlayRoot };
}

try {
	if (import.meta.url === `file://${process.argv[1]}`) {
		prepareDevelopmentContent();
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
