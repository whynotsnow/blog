import type { GetStaticPaths } from "astro";
import { render } from "astro:content";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { resolveSharePosterImages } from "@/utils/url-utils";
import { formatDateToYYYYMMDD } from "@/utils/date-utils";
import { siteConfig, profileConfig } from "@/config";
import type { ListPost, PostRoute } from "../core/types";
import type { BlogPostingJsonLd, PostDetailPageProps } from "./types";
import { getContentStore } from "../core/content-store";
import { buildCanonicalPostPaths } from "./static-paths";

/* =========================
   构建单篇文章页面数据
========================= */

async function buildPostDetailPageData(
	entry: ListPost,
	route: PostRoute,
): Promise<PostDetailPageProps> {
	const { Content, headings } = await render(entry);
	const { posterCoverUrl, posterAvatarUrl } =
		await resolveSharePosterImages(entry);

	const isEncrypted = !!entry.data.encrypted && !!entry.data.password;

	dayjs.extend(utc);

	const lastModified = dayjs(entry.data.updated || entry.data.published)
		.utc()
		.format("YYYY-MM-DDTHH:mm:ss");

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
		inLanguage: entry.data.lang
			? entry.data.lang.replace("_", "-")
			: siteConfig.lang.replace("_", "-"),
	};

	return {
		entry,
		canonicalUrl: route.canonicalUrl,
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
	const { posts: listPosts, routes } = await getContentStore();

	return Promise.all(
		buildCanonicalPostPaths(listPosts, routes).map(
			async ({ entry, route }) => ({
				params: { slug: route.canonicalSlug },
				props: await buildPostDetailPageData(entry, route),
			}),
		),
	);
};
