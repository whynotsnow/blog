import { getTagUrl } from "@/utils/client-utils";
import {
	generateCategorySlug,
	generateTagSlug,
	getCategoryUrl,
	resolveImageUrl,
} from "@/utils/url-utils";
import { UNCATEGORIZED } from "@constants/constants";
import type {
	PostCardViewModel,
	PostIndexEntry,
	PostNavigationLink,
	PostRouteIndex,
	RawPost,
	UIMeta,
} from "./types";
import { calculateRecommendScore } from "./sort";

type ContentMeta = {
	words?: number;
	excerpt?: string;
	minutes?: number;
};

type NavigationMeta = {
	prev?: PostNavigationLink;
	next?: PostNavigationLink;
};

function getContentMeta(post: RawPost): Required<ContentMeta> {
	const frontmatter = post.rendered?.metadata?.frontmatter as
		| ContentMeta
		| undefined;

	return {
		words: frontmatter?.words ?? 0,
		excerpt: frontmatter?.excerpt ?? "",
		minutes: frontmatter?.minutes ?? 0,
	};
}

export function buildCategoryItems(category: string): UIMeta {
	const name = category.trim() || UNCATEGORIZED;
	const slug = generateCategorySlug(name);
	return {
		name,
		slug,
		url: getCategoryUrl(slug),
	};
}

export function buildTagItems(tags: string[]): UIMeta[] {
	return (tags ?? [])
		.map((tag) => {
			const name = tag.trim();
			const slug = generateTagSlug(name);
			return {
				name,
				slug,
				url: getTagUrl(slug),
			};
		})
		.filter((tag) => tag.name.length > 0)
		.sort((a, b) => a.name.localeCompare(b.name));
}

function buildNavigation(
	posts: readonly PostIndexEntry[],
): ReadonlyMap<string, NavigationMeta> {
	const navigation = new Map<string, NavigationMeta>();

	for (let index = 1; index < posts.length; index++) {
		const nextPost = posts[index - 1];
		navigation.set(posts[index].id, {
			next: { title: nextPost.title, url: nextPost.route.canonicalUrl },
		});
	}

	for (let index = 0; index < posts.length - 1; index++) {
		const prevPost = posts[index + 1];
		const current = navigation.get(posts[index].id) ?? {};
		navigation.set(posts[index].id, {
			...current,
			prev: { title: prevPost.title, url: prevPost.route.canonicalUrl },
		});
	}

	return navigation;
}

export function buildPostIndexEntries(
	posts: readonly RawPost[],
	routes: PostRouteIndex,
): PostIndexEntry[] {
	const entries = posts.map((post, index): PostIndexEntry => {
		const route = routes.byId.get(post.id);
		if (!route) throw new Error(`Missing post route for ${post.id}`);

		const contentMeta = getContentMeta(post);
		return {
			id: post.id,
			postId: index + 1,
			route,
			title: post.data.title,
			description: post.data.description,
			published: post.data.published,
			updated: post.data.updated,
			category: buildCategoryItems(post.data.category),
			tags: buildTagItems(post.data.tags),
			score: calculateRecommendScore(post),
			...contentMeta,
			pinned: post.data.pinned,
			draft: post.data.draft,
			encrypted: post.data.encrypted,
			cover: resolveImageUrl(post),
		};
	});

	const navigation = buildNavigation(entries);
	return entries.map((entry) => ({
		...entry,
		...navigation.get(entry.id),
	}));
}

export function toPostCardViewModel(post: PostIndexEntry): PostCardViewModel {
	return {
		id: post.id,
		slug: post.category.slug,
		url: post.route.canonicalUrl,
		title: post.title,
		description: post.description,
		published: post.published.toISOString(),
		updated: post.updated?.toISOString(),
		category: post.category,
		tags: post.tags,
		pinned: post.pinned,
		meta: {
			id: post.id,
			category: post.category,
			tags: post.tags,
			words: post.words,
			excerpt: post.excerpt,
		},
		hasCoverImage: Boolean(post.cover),
		image: post.cover,
	};
}

/** @deprecated Use toPostCardViewModel. */
export const toUIPost = toPostCardViewModel;
