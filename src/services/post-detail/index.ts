import type { GetStaticPaths } from "astro";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
	getFileDirFromPath,
	resolveSharePosterImages,
} from "../core/content-assets";
import { formatDateToYYYYMMDD } from "@/utils/date-utils";
import { siteConfig, profileConfig } from "@/config";
import type { BlogPostingJsonLd, PostDetailPageProps } from "./types";
import { getContentStore } from "../core/content-store";
import { getRawPostById } from "../core/source";
import { getRenderedPost } from "../core/post-renderer";
import { runPostBuildTask } from "../core/concurrency";
import { buildPostDetailStaticPathItems } from "./static-paths";
import {
	buildDeterministicRandomPostLinks,
	buildRecommendedPostLinks,
	toSupportPostLink,
} from "../support";
import { buildTwikooCommentPath } from "./comment-path";

dayjs.extend(utc);

export type PostDetailStaticPathProps = {
	postId: string;
};

export async function getPostDetailPageData(
	postId: string,
): Promise<PostDetailPageProps> {
	const [store, raw] = await Promise.all([
		getContentStore(),
		getRawPostById(postId),
	]);
	const index = store.postsById.get(postId);
	if (!index) throw new Error(`Missing post index for ${postId}`);

	const [{ Content, headings }, { posterCoverUrl, posterAvatarUrl }] =
		await Promise.all([
			getRenderedPost(raw),
			runPostBuildTask(() => resolveSharePosterImages(raw)),
		]);

	const lastModified = dayjs(raw.data.updated || raw.data.published)
		.utc()
		.format("YYYY-MM-DDTHH:mm:ss");
	const canonicalUrl = new URL(
		index.route.canonicalUrl,
		siteConfig.siteURL,
	).toString();

	const jsonLd: BlogPostingJsonLd = {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: index.title,
		description: index.description || index.title,
		keywords: raw.data.tags,
		author: {
			"@type": "Person",
			name: profileConfig.name,
		},
		datePublished: formatDateToYYYYMMDD(index.published),
		url: canonicalUrl,
		mainEntityOfPage: {
			"@type": "WebPage",
			"@id": canonicalUrl,
		},
		inLanguage: raw.data.lang
			? raw.data.lang.replace("_", "-")
			: siteConfig.lang.replace("_", "-"),
	};
	const continueReading = [index.prev, index.next]
		.map((link) =>
			link
				? store.posts.find(
						(post) => post.route.canonicalUrl === link.url,
					)
				: undefined,
		)
		.filter((post): post is NonNullable<typeof post> => Boolean(post))
		.map(toSupportPostLink);
	const recommendedPosts = buildRecommendedPostLinks({
		current: index,
		posts: store.posts,
		limit: 4,
	}).filter(
		(post) =>
			!continueReading.some((continued) => continued.id === post.id),
	);
	const visibleRecommendedPosts = recommendedPosts.slice(0, 3);
	const randomPosts = buildDeterministicRandomPostLinks({
		seed: index.id,
		posts: store.posts,
		excludeIds: [
			index.id,
			...continueReading.map((post) => post.id),
			...visibleRecommendedPosts.map((post) => post.id),
		],
		limit: 3,
	});

	return {
		id: index.id,
		title: index.title,
		description: index.description,
		author: raw.data.author,
		lang: raw.data.lang,
		banner: raw.data.image || undefined,
		header: {
			id: index.id,
			title: index.title,
			published: index.published,
			updated: index.updated,
			category: index.category,
			tags: index.tags,
			words: index.words,
			minutes: index.minutes,
			hasCover: Boolean(raw.data.image),
		},
		cover: raw.data.image
			? {
					src: index.cover ?? raw.data.image,
					basePath: index.cover
						? undefined
						: getFileDirFromPath(raw.filePath ?? ""),
				}
			: undefined,
		encryption: {
			enabled: Boolean(raw.data.encrypted && raw.data.password),
			password: raw.data.password,
		},
		comment: {
			enabled: raw.data.comment,
			path: buildTwikooCommentPath(index.route.canonicalUrl),
		},
		license: {
			sourceLink: raw.data.sourceLink,
			licenseName: raw.data.licenseName,
			licenseUrl: raw.data.licenseUrl,
		},
		navigation: { prev: index.prev, next: index.next },
		support: {
			continueReading,
			recommendedPosts: visibleRecommendedPosts,
			randomPosts,
		},
		canonicalUrl,
		canonicalOgSlug: index.route.canonicalSlug,
		Content,
		headings,
		lastModified,
		jsonLd,
		posterCoverUrl,
		posterAvatarUrl,
	};
}

export const buildPostDetailStaticPaths: GetStaticPaths = async () => {
	const { posts } = await getContentStore();

	return buildPostDetailStaticPathItems(posts);
};
