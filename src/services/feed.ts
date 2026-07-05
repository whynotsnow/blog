import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import MarkdownIt from "markdown-it";
import { parse as htmlParser } from "node-html-parser";
import sanitizeHtml from "sanitize-html";
import { getContentStore } from "./core/content-store";
import type { ListPost } from "./core/types";
import { initPostIdMap } from "@/utils/permalink-utils";

const markdownParser = new MarkdownIt();

const imagesGlob = import.meta.glob<{ default: ImageMetadata }>(
	"/src/content/**/*.{jpeg,jpg,png,gif,webp}",
);

export async function getFeedPosts(): Promise<ListPost[]> {
	const { posts } = await getContentStore();
	const feedPosts = posts.filter(
		(post) => !post.data.encrypted && post.data.draft !== true,
	);

	initPostIdMap(feedPosts);

	return feedPosts;
}

function resolveContentImageImportPath(post: ListPost, src: string): string {
	if (src.startsWith("./")) {
		const prefixRemoved = src.slice(2);
		const postDir = post.id.includes("/") ? post.id.split("/")[0] : "";

		return postDir
			? `/src/content/posts/${postDir}/${prefixRemoved}`
			: `/src/content/posts/${prefixRemoved}`;
	}

	if (src.startsWith("../")) {
		const cleaned = src.replace(/^\.\.\//, "");
		return `/src/content/${cleaned}`;
	}

	const postDir = post.id.includes("/") ? post.id.split("/")[0] : "";
	return postDir
		? `/src/content/posts/${postDir}/${src}`
		: `/src/content/posts/${src}`;
}

export async function renderFeedContent(
	post: ListPost,
	site: URL,
): Promise<string> {
	const body = markdownParser.render(String(post.body ?? ""));
	const html = htmlParser.parse(body);
	const images = html.querySelectorAll("img");

	for (const img of images) {
		const src = img.getAttribute("src");
		if (!src) continue;

		if (
			src.startsWith("./") ||
			src.startsWith("../") ||
			(!src.startsWith("http") && !src.startsWith("/"))
		) {
			const importPath = resolveContentImageImportPath(post, src);
			const imageMod = await imagesGlob[importPath]?.()?.then(
				(res) => res.default,
			);

			if (imageMod) {
				const optimizedImg = await getImage({ src: imageMod });
				img.setAttribute("src", new URL(optimizedImg.src, site).href);
			} else {
				console.log(
					`Failed to load image: ${importPath} for post: ${post.id}`,
				);
			}
		} else if (src.startsWith("/")) {
			img.setAttribute("src", new URL(src, site).href);
		}
	}

	return sanitizeHtml(html.toString(), {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
	});
}
