import type {
	PostIndexEntry,
	PostNavigatorCategory,
	TagItem,
} from "./core/types";
import { sortByScore } from "./core/sort";
import {
	getCategoryHubUrl,
	getCategoryRecentUrl,
	getCategoryRecommendedUrl,
} from "@/utils/url";

export type SupportDiscoveryId = "category" | "recent" | "recommended";

export type SupportDiscoveryLink = {
	id: SupportDiscoveryId;
	title: string;
	url: string;
	icon: string;
};

export type GlobalDiscoveryCardItem =
	| {
			type: "category";
			label: string;
			url: string;
			count: number;
	  }
	| {
			type: "post";
			label: string;
			url: string;
			meta: string;
	  };

export type GlobalDiscoveryCardViewModel = {
	id: SupportDiscoveryId;
	title: string;
	url: string;
	icon: string;
	items: GlobalDiscoveryCardItem[];
};

export type SupportPostLink = {
	id: string;
	title: string;
	url: string;
	summary: string;
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

const DISCOVERY_LINKS: SupportDiscoveryLink[] = [
	{
		id: "category",
		title: "全部分类",
		url: getCategoryHubUrl(),
		icon: "material-symbols:category-outline-rounded",
	},
	{
		id: "recent",
		title: "最近更新",
		url: getCategoryRecentUrl(),
		icon: "material-symbols:update-rounded",
	},
	{
		id: "recommended",
		title: "推荐阅读",
		url: getCategoryRecommendedUrl(),
		icon: "material-symbols:bookmark-star-outline-rounded",
	},
];

export function buildDiscoveryLinks(
	params: {
		current?: SupportDiscoveryId;
		include?: SupportDiscoveryId[];
	} = {},
): SupportDiscoveryLink[] {
	const included = params.include ? new Set(params.include) : undefined;

	return DISCOVERY_LINKS.filter(
		(link) =>
			link.id !== params.current && (!included || included.has(link.id)),
	).map((link) => ({ ...link }));
}

export function buildGlobalDiscoveryCards(params: {
	posts: PostIndexEntry[];
	categories: PostNavigatorCategory[];
	current?: SupportDiscoveryId;
	include?: SupportDiscoveryId[];
	itemLimit?: number;
}): GlobalDiscoveryCardViewModel[] {
	const { posts, categories, current, include, itemLimit = 4 } = params;
	const categoryItems = categories
		.slice(0, itemLimit)
		.map((category): GlobalDiscoveryCardItem => {
			const link = toSupportCategoryLink(category);

			return {
				type: "category",
				label: link.name,
				url: link.url,
				count: link.count,
			};
		});
	const recentItems = sortByRecentActivity(posts)
		.slice(0, itemLimit)
		.map((post): GlobalDiscoveryCardItem => {
			const link = toSupportPostLink(post);

			return {
				type: "post",
				label: link.title,
				url: link.url,
				meta: link.category.name,
			};
		});
	const recommendedItems = sortByScore(posts)
		.slice(0, itemLimit)
		.map((post): GlobalDiscoveryCardItem => {
			const link = toSupportPostLink(post);

			return {
				type: "post",
				label: link.title,
				url: link.url,
				meta: link.category.name,
			};
		});
	const itemsById: Record<SupportDiscoveryId, GlobalDiscoveryCardItem[]> = {
		category: categoryItems,
		recent: recentItems,
		recommended: recommendedItems,
	};

	return buildDiscoveryLinks({ current, include }).map((link) => ({
		...link,
		items: itemsById[link.id],
	}));
}

export function toSupportPostLink(post: PostIndexEntry): SupportPostLink {
	return {
		id: post.id,
		title: post.title,
		url: post.route.canonicalUrl,
		summary: post.description.trim() || post.excerpt.trim(),
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
		.filter(
			(post) => post.id !== current.id && !post.draft && !post.encrypted,
		)
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

function hashPostSeed(value: string): number {
	let hash = 2166136261;

	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
}

export function buildDeterministicRandomPostLinks(params: {
	seed: string;
	posts: PostIndexEntry[];
	excludeIds: Iterable<string>;
	limit: number;
}): SupportPostLink[] {
	const { seed, posts, excludeIds, limit } = params;
	const excluded = new Set(excludeIds);

	return posts
		.filter(
			(post) => !excluded.has(post.id) && !post.draft && !post.encrypted,
		)
		.map((post) => ({
			post,
			rank: hashPostSeed(`${seed}:${post.id}`),
		}))
		.sort((a, b) => {
			if (a.rank !== b.rank) return a.rank - b.rank;
			return b.post.published.getTime() - a.post.published.getTime();
		})
		.slice(0, limit)
		.map(({ post }) => toSupportPostLink(post));
}
