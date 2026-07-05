import type { GetStaticPaths, GetStaticPathsItem } from "astro";
import { render } from "astro:content";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
	removeFileExtension,
	resolveSharePosterImages,
} from "@/utils/url-utils";
import { formatDateToYYYYMMDD } from "@/utils/date-utils";
import { siteConfig, profileConfig } from "@/config";
import type { ListPost } from "../core/types";
import type { BlogPostingJsonLd, PostDetailPageProps } from "./types";
import { getContentStore } from "../core/content-store";

/* =========================
   构建单篇文章页面数据
========================= */

async function buildPostDetailPageData(
	entry: ListPost,
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
	const { posts: listPosts } = await getContentStore();

	// 并行处理
	const results = await Promise.all(
		listPosts.map(async (entry) => {
			const pageData = await buildPostDetailPageData(entry);

			const defaultSlug = removeFileExtension(entry.id);

			const items: GetStaticPathsItem[] = [];

			// 默认路径
			items.push({
				params: { slug: defaultSlug },
				props: pageData,
			});

			// alias
			if (entry.data.alias) {
				let alias = entry.data.alias
					.replace(/^\/+/, "")
					.replace(/\/+$/, "");

				if (alias.startsWith("posts/")) {
					alias = alias.replace(/^posts\//, "");
				}

				items.push({
					params: { slug: alias },
					props: pageData,
				});
			}

			return items;
		}),
	);

	// 扁平化
	return results.flat();
};
