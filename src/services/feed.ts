import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import MarkdownIt from "markdown-it";
import { parse as htmlParser } from "node-html-parser";
import sanitizeHtml from "sanitize-html";
import { getContentStore } from "./core/content-store";
import { getAllPostsRaw } from "./core/source";
import type { PostIndexEntry, RawPost } from "./core/types";

const markdownParser = new MarkdownIt();

const imagesGlob = import.meta.glob<{ default: ImageMetadata }>(
	"/src/content/**/*.{jpeg,jpg,png,gif,webp}",
);

export type FeedPost = {
	index: PostIndexEntry;
	raw: RawPost;
};

export async function getFeedPosts(): Promise<FeedPost[]> {
	const [store, rawPosts] = await Promise.all([
		getContentStore(),
		getAllPostsRaw(),
	]);
	const rawById = new Map(rawPosts.map((post) => [post.id, post]));

	return store.posts
		.filter((post) => !post.encrypted && !post.draft)
		.map((index) => {
			const raw = rawById.get(index.id);
			if (!raw) throw new Error(`Missing raw feed post for ${index.id}`);
			return { index, raw };
		});
}

function resolveContentImageImportPath(post: RawPost, src: string): string {
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
	post: FeedPost,
	site: URL,
): Promise<string> {
	const body = markdownParser.render(String(post.raw.body ?? ""));
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
			const importPath = resolveContentImageImportPath(post.raw, src);
			const imageMod = await imagesGlob[importPath]?.()?.then(
				(res) => res.default,
			);

			if (imageMod) {
				const optimizedImg = await getImage({ src: imageMod });
				img.setAttribute("src", new URL(optimizedImg.src, site).href);
			} else {
				console.log(
					`Failed to load image: ${importPath} for post: ${post.index.id}`,
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
