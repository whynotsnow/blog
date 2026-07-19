import type { GetStaticPaths } from "astro";
import { render } from "astro:content";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { resolveSharePosterImages } from "@/utils/url-utils";
import { formatDateToYYYYMMDD } from "@/utils/date-utils";
import { siteConfig, profileConfig } from "@/config";
import type { PostIndexEntry, PostRoute, RawPost } from "../core/types";
import type {
	BlogPostingJsonLd,
	PostDetailEntry,
	PostDetailPageProps,
} from "./types";
import { getContentStore } from "../core/content-store";
import { getAllPostsRaw } from "../core/source";
import { buildCanonicalPostPaths } from "./static-paths";

/* =========================
   构建单篇文章页面数据
========================= */

async function buildPostDetailPageData(
	index: PostIndexEntry,
	raw: RawPost,
	route: PostRoute,
): Promise<PostDetailPageProps> {
	const entry: PostDetailEntry = {
		...raw,
		meta: {
			postId: index.postId,
			route: index.route,
			words: index.words,
			minutes: index.minutes,
			excerpt: index.excerpt,
			prev: index.prev,
			next: index.next,
		},
	};
	const { Content, headings } = await render(entry);
	const { posterCoverUrl, posterAvatarUrl } =
		await resolveSharePosterImages(entry);

	const isEncrypted = !!entry.data.encrypted && !!entry.data.password;

	dayjs.extend(utc);

	const lastModified = dayjs(entry.data.updated || entry.data.published)
		.utc()
		.format("YYYY-MM-DDTHH:mm:ss");
	const canonicalUrl = new URL(
		route.canonicalUrl,
		siteConfig.siteURL,
	).toString();

	const jsonLd: BlogPostingJsonLd = {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: entry.data.title,
		description: entry.data.description || entry.data.title,
		keywords: entry.data.tags,
		author: {
			"@type": "Person",
			name: profileConfig.name,
		},
		datePublished: formatDateToYYYYMMDD(entry.data.published),
		url: canonicalUrl,
		mainEntityOfPage: {
			"@type": "WebPage",
			"@id": canonicalUrl,
		},
		inLanguage: entry.data.lang
			? entry.data.lang.replace("_", "-")
			: siteConfig.lang.replace("_", "-"),
	};

	return {
		entry,
		canonicalUrl,
		canonicalOgSlug: route.canonicalSlug,
		Content,
		headings,
		isEncrypted,
		lastModified,
		jsonLd,
		posterCoverUrl,
		posterAvatarUrl,
	};
}

/* =========================
   统一构建 posts/[...slug]
========================= */

export const buildPostDetailStaticPaths: GetStaticPaths = async () => {
	const [{ posts, routes }, rawPosts] = await Promise.all([
		getContentStore(),
		getAllPostsRaw(),
	]);
	const rawById = new Map(rawPosts.map((post) => [post.id, post]));

	return Promise.all(
		buildCanonicalPostPaths(posts, routes).map(
			async ({ entry: index, route }) => ({
				params: { slug: route.canonicalSlug },
				props: await buildPostDetailPageData(
					index,
					rawById.get(index.id) ??
						(() => {
							throw new Error(`Missing raw post for ${index.id}`);
						})(),
					route,
				),
			}),
		),
	);
};
