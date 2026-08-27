import type { CollectionEntry } from "astro:content";
import path from "node:path";
import { profileConfig } from "@/config";
import type { RawPost } from "./types";

const imageMap: Record<string, ImageMetadata> = import.meta.glob(
	[
		"/src/content/posts/**/*.{png,jpg,jpeg,webp,avif}",
		"/tests/content/posts/**/*.{png,jpg,jpeg,webp,avif}",
		"/src/.content-dev/posts/**/*.{png,jpg,jpeg,webp,avif}",
	],
	{
		eager: true,
		import: "default",
	},
);
const imageModules = import.meta.glob<ImageMetadata>(
	[
		"/src/content/posts/**/*.{png,jpg,jpeg,webp,avif}",
		"/tests/content/posts/**/*.{png,jpg,jpeg,webp,avif}",
		"/src/.content-dev/posts/**/*.{png,jpg,jpeg,webp,avif}",
	],
	{ import: "default" },
);

function normalizePath(value: string): string {
	return value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/");
}

export function getFileDirFromPath(filePath: string): string {
	return filePath.replace(/^src\//, "").replace(/\/[^/]+$/, "");
}

export function resolveImageUrl(
	post: CollectionEntry<"posts">,
): ImageMetadata | undefined {
	const image = post.data.image;
	const filePath = post.filePath;
	if (!image || !filePath) return;

	const articleDir = filePath.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
	const imageKey = `/${articleDir}/${normalizePath(image)}`;
	const imageUrl = imageMap[imageKey];

	if (!imageUrl) {
		console.warn(
			`[resolveImageUrl] 图片未找到:\n\t\tkey: ${imageKey}\n\t\t原始 image: ${image}\n\t\t文章: ${filePath}`,
		);
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
		imagePath.startsWith("data:")
	);

	if (isLocal) {
		const normalizedPath = path
			.normalize(
				baseDir
					? path.join("../../", baseDir, imagePath)
					: path.join("../../", imagePath),
			)
			.replace(/\\/g, "/");
		const file = imageModules[normalizedPath];
		if (!file) return imagePath;
		return (await file()).src;
	}

	if (imagePath.startsWith("http")) {
		try {
			const response = await fetch(imagePath);
			const base64 = Buffer.from(await response.arrayBuffer()).toString(
				"base64",
			);
			const contentType =
				response.headers.get("content-type") || "image/jpeg";
			return `data:${contentType};base64,${base64}`;
		} catch {
			return imagePath;
		}
	}

	return imagePath;
}

export type SharePosterImages = {
	posterCoverUrl: string | undefined;
	posterAvatarUrl: string | undefined;
};

export async function resolveSharePosterImages(
	entry: RawPost,
): Promise<SharePosterImages> {
	const baseDir = getFileDirFromPath(entry.filePath || "");
	const posterCoverUrl = await resolvePosterImage(entry.data.image, baseDir);
	const posterAvatarUrl = await resolvePosterImage(profileConfig.avatar);

	return {
		posterCoverUrl: posterCoverUrl,
		posterAvatarUrl: posterAvatarUrl,
	};
}
