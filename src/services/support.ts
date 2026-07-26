import type {
	PostIndexEntry,
	PostNavigatorCategory,
	TagItem,
} from "./core/types";

export type SupportPostLink = {
	id: string;
	title: string;
	url: string;
	published: string;
	category: {
		name: string;
		url: string;
	};
	tags: Array<{
		slug: string;
		name: string;
		url: string;
	}>;
};

export type SupportTaxonomyLink = {
	slug: string;
	name: string;
	count: number;
	url: string;
};

export function toSupportPostLink(post: PostIndexEntry): SupportPostLink {
	return {
		id: post.id,
		title: post.title,
		url: post.route.canonicalUrl,
		published: post.published.toISOString(),
		category: {
			name: post.category.name,
			url: post.category.url,
		},
		tags: post.tags.map((tag) => ({
			slug: tag.slug,
			name: tag.name,
			url: tag.url,
		})),
	};
}

export function toSupportCategoryLink(
	category: PostNavigatorCategory,
): SupportTaxonomyLink {
	return {
		slug: category.slug,
		name: category.name,
		count: category.count,
		url: category.url ?? `/category/${category.slug}/`,
	};
}

export function toSupportTagLink(
	tag: TagItem,
	categorySlug: string,
): SupportTaxonomyLink {
	return {
		slug: tag.slug,
		name: tag.name,
		count: tag.count,
		url: `/category/${categorySlug}/?tag=${tag.slug}`,
	};
}

export function sortByRecentActivity(
	posts: PostIndexEntry[],
): PostIndexEntry[] {
	return [...posts].sort(
		(a, b) =>
			(b.updated ?? b.published).getTime() -
			(a.updated ?? a.published).getTime(),
	);
}

export function buildRecommendedPostLinks(params: {
	current: PostIndexEntry;
	posts: PostIndexEntry[];
	limit: number;
}): SupportPostLink[] {
	const { current, posts, limit } = params;
	const currentTags = new Set(current.tags.map((tag) => tag.slug));

	return posts
		.filter((post) => post.id !== current.id)
		.map((post) => {
			const sharedTagCount = post.tags.filter((tag) =>
				currentTags.has(tag.slug),
			).length;
			const sameCategory =
				post.category.slug === current.category.slug ? 1 : 0;

			return {
				post,
				sameCategory,
				sharedTagCount,
				activity: (post.updated ?? post.published).getTime(),
			};
		})
		.sort((a, b) => {
			if (a.sameCategory !== b.sameCategory) {
				return b.sameCategory - a.sameCategory;
			}
			if (a.sharedTagCount !== b.sharedTagCount) {
				return b.sharedTagCount - a.sharedTagCount;
			}
			if (a.post.score !== b.post.score) {
				return b.post.score - a.post.score;
			}
			return b.activity - a.activity;
		})
		.slice(0, limit)
		.map(({ post }) => toSupportPostLink(post));
}
