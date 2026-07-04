import type { CollectionEntry } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { CATEGORY_SLUG_MAP, permalinkConfig, profileConfig } from "../config";
import { generatePermalinkSlug } from "./permalink-utils";
import type { RawPost } from "@/services/core/types";
import path from "node:path";
import { toSlug } from "./client-utils";

/**
 * 移除文件扩展名（.md, .mdx, .markdown）
 * 用于将 Astro v5 Content Layer API 的 id 转换为 URL 友好的 slug
 */
export function removeFileExtension(id: string): string {
	return id.replace(/\.(md|mdx|markdown)$/i, "");
}

export function pathsEqual(path1: string, path2: string) {
	const normalizedPath1 = path1.replace(/^\/|\/$/g, "").toLowerCase();
	const normalizedPath2 = path2.replace(/^\/|\/$/g, "").toLowerCase();
	return normalizedPath1 === normalizedPath2;
}

function joinUrl(...parts: string[]): string {
	const joined = parts.join("/");
	return joined.replace(/\/+/g, "/");
}

export function getPostUrlBySlug(slug: string): string {
	// 移除文件扩展名（如 .md, .mdx 等）
	const slugWithoutExt = removeFileExtension(slug);
	return url(`/posts/${slugWithoutExt}/`);
}

export function getPostUrlByAlias(alias: string): string {
	// 移除开头的斜杠并确保固定链接在 /posts/ 路径下
	const cleanAlias = alias.replace(/^\/+/, "");
	return url(`/posts/${cleanAlias}/`);
}

export function getPostUrl(post: RawPost): string {
	// 如果文章有自定义 permalink，优先使用（在根目录下）
	if (post.data.permalink) {
		const slug = post.data.permalink
			.replace(/^\/+/, "")
			.replace(/\/+$/, "");
		return url(`/${slug}/`);
	}

	// 如果全局 permalink 功能启用，使用生成的 slug（在根目录下）
	if (permalinkConfig.enable) {
		const slug = generatePermalinkSlug(post);
		return url(`/${slug}/`);
	}

	// 如果文章有 alias，使用 alias（在 /posts/ 下）
	if (post.data.alias) {
		return getPostUrlByAlias(post.data.alias);
	}

	// 否则使用默认的 slug 路径
	return getPostUrlBySlug(post.id);
}

export function getTagUrl(tag: string): string {
	if (!tag) return url("/archive/");
	return url(`/archive/?tag=${encodeURIComponent(tag.trim())}`);
}

export function getCategoryUrl(category: string | null): string {
	if (
		!category ||
		category.trim() === "" ||
		category.trim().toLowerCase() ===
			i18n(I18nKey.uncategorized).toLowerCase()
	)
		return url("/archive/?uncategorized=true");
	return url(`/archive/?category=${encodeURIComponent(category.trim())}`);
}

export function getFileDirFromPath(filePath: string): string {
	return filePath.replace(/^src\//, "").replace(/\/[^/]+$/, "");
}

export function url(path: string) {
	return joinUrl("", import.meta.env.BASE_URL, path);
}

export function generateCategorySlug(name: string) {
	const trimmed = name.trim();

	if (CATEGORY_SLUG_MAP[trimmed]) {
		return CATEGORY_SLUG_MAP[trimmed];
	}

	return toSlug(trimmed);
}
// 统一使用这个函数解析
export function generateTagSlug(name: string) {
	return toSlug(name);
}

/**
 * 静态图片映射表。
 *
 * 由 Vite 在构建阶段生成：
 * - key: 以 "/" 开头的项目相对路径
 *   例如: "/src/content/posts/guide/cover.webp"
 * - value: 构建后可访问的 URL
 *   例如: "/assets/cover.abc123.webp"
 */
const imageMap: Record<string, ImageMetadata> = import.meta.glob(
	"/src/content/posts/**/*.{png,jpg,jpeg,webp,avif}",
	{
		eager: true,
		import: "default",
	},
);
const imageModules = import.meta.glob<ImageMetadata>(
	"/src/content/posts/**/*.{png,jpg,jpeg,webp,avif}",
	{ import: "default" },
);

/**
 * 规范化路径：
 * - 去掉 "./"
 * - 统一为正斜杠
 * - 移除多余的重复斜杠
 */
function normalizePath(path: string): string {
	return path
		.replace(/\\/g, "/") // Windows 兼容
		.replace(/^\.\//, "") // 去掉开头 "./"
		.replace(/\/+/g, "/"); // 去掉重复斜杠
}

/**
 * 解析文章封面图片 URL
 *
 * @param post - Astro CollectionEntry<"posts">
 * @returns 构建后可访问的图片 URL
 *
 * @remarks
 * - 假设文章文件名为 index.md
 * - 图片与文章位于同一目录
 * - 仅支持 content 目录内图片
 * - 构建期运行，不可在纯客户端环境使用
 */
export function resolveImageUrl(
	post: CollectionEntry<"posts">,
): ImageMetadata | undefined {
	const image = post.data.image;
	const filePath = post.filePath;

	if (!image || !filePath) return;

	// 文章所在目录
	const articleDir = filePath.replace(/\\/g, "/").replace(/\/[^/]+$/, ""); // 去掉文件名

	// 规范化 image
	const normalizedImage = normalizePath(image);

	// 构造 glob key
	const imageKey = `/${articleDir}/${normalizedImage}`;

	const imageUrl = imageMap[imageKey];

	if (!imageUrl) {
		console.warn(
			`[resolveImageUrl] 图片未找到:
		key: ${imageKey}
		原始 image: ${image}
		文章: ${filePath}`,
		);
		return;
	}

	return imageUrl;
}

export async function resolvePosterImage(
	imagePath: string | undefined,
	baseDir?: string,
): Promise<string | undefined> {
	if (!imagePath) return undefined;

	const isLocal = !(
		imagePath.startsWith("/") ||
		imagePath.startsWith("http") ||
		imagePath.startsWith("https") ||
		imagePath.startsWith("data:")
	);

	// ===== 本地图片 =====
	if (isLocal) {
		const normalizedPath = path
			.normalize(
				baseDir
					? path.join("../../", baseDir, imagePath)
					: path.join("../../", imagePath),
			)
			.replace(/\\/g, "/");

		const file = imageModules[normalizedPath];
		if (file) {
			const img = await file();
			return img.src;
		}

		return imagePath;
	}

	// ===== 远程图片 =====
	if (imagePath.startsWith("http")) {
		try {
			const response = await fetch(imagePath);
			const arrayBuffer = await response.arrayBuffer();
			const base64 = Buffer.from(arrayBuffer).toString("base64");
			const contentType =
				response.headers.get("content-type") || "image/jpeg";

			return `data:${contentType};base64,${base64}`;
		} catch {
			return imagePath;
		}
	}

	return imagePath;
}

export async function resolveSharePosterImages(entry: RawPost) {
	const baseDir = getFileDirFromPath(entry.filePath || "");

	const posterCoverUrl = await resolvePosterImage(entry.data.image, baseDir);

	const posterAvatarUrl = await resolvePosterImage(profileConfig.avatar);

	return {
		posterCoverUrl,
		posterAvatarUrl,
	};
}
