import { beforeEach, describe, expect, it, vi } from "vitest";

const { getContentStore } = vi.hoisted(() => ({
	getContentStore: vi.fn(),
}));

vi.mock("@/services/core/content-store", () => ({ getContentStore }));
vi.mock("@/services/core/inject", () => ({
	toPostCardViewModel: (post: { id: string }) => ({ id: post.id }),
}));
vi.mock("@/services/core/sort", () => ({
	sortByScore: <T>(posts: T[]) => posts,
}));

import {
	getCategoryIndexStaticPaths,
	getCategoryPaginatedStaticPaths,
} from "@/services/category-page";
import type { CategoryPageProps } from "@/services/category-page";
import type {
	CategoryEntry,
	ContentStore,
	PostIndexEntry,
	PostNavigatorCategory,
	TagItem,
} from "@/services/core/types";

function buildPosts(count: number, categorySlug: string): PostIndexEntry[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `post-${index + 1}`,
		postId: index + 1,
		route: {
			postId: `post-${index + 1}`,
			defaultSlug: `post-${index + 1}`,
			canonicalSlug: `post-${index + 1}`,
			canonicalUrl: `/posts/post-${index + 1}/`,
			usesAlias: false,
		},
		title: `Post ${index + 1}`,
		description: "",
		published: new Date(
			`2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
		),
		category: {
			slug: categorySlug,
			name: categorySlug,
			url: `/category/${categorySlug}/`,
		},
		tags: [
			{
				slug: `${categorySlug}-tag`,
				name: `${categorySlug} tag`,
				url: `/category/${categorySlug}/?tag=${categorySlug}-tag`,
			},
		],
		score: count - index,
		words: 100,
		minutes: 1,
		excerpt: "",
		pinned: false,
		draft: false,
		encrypted: false,
	})) as PostIndexEntry[];
}

function categoryEntry(slug: string, posts: PostIndexEntry[]): CategoryEntry {
	const tags = new Map<string, TagItem>();
	for (const post of posts) {
		for (const tag of post.tags) {
			const current = tags.get(tag.slug);
			tags.set(tag.slug, {
				slug: tag.slug,
				name: tag.name,
				count: (current?.count ?? 0) + 1,
				url: tag.url,
			});
		}
	}

	return {
		category: {
			slug,
			name: slug,
			count: posts.length,
			url: `/category/${slug}/`,
		},
		posts,
		tags,
	};
}

function buildStore(entries: CategoryEntry[]): ContentStore {
	const posts = entries.flatMap((entry) => entry.posts);
	const categories: PostNavigatorCategory[] = entries.map((entry) => ({
		slug: entry.category.slug,
		name: entry.category.name,
		count: entry.posts.length,
		url: entry.category.url,
		tags: Array.from(entry.tags.values()),
	}));

	return {
		posts,
		postsById: new Map(posts.map((post) => [post.id, post])),
		routes: {
			byId: new Map(posts.map((post) => [post.id, post.route])),
			bySlug: new Map(
				posts.map((post) => [post.route.canonicalSlug, post.route]),
			),
		},
		stats: {
			postCount: posts.length,
			totalWords: posts.reduce((total, post) => total + post.words, 0),
			lastActivityAt: posts[0]?.updated ?? posts[0]?.published ?? null,
		},
		categoryMap: new Map(
			entries.map((entry) => [entry.category.slug, entry]),
		),
		categories,
	};
}

describe("category static paths", () => {
	beforeEach(() => {
		getContentStore.mockReset();
		getContentStore.mockResolvedValue(
			buildStore([
				categoryEntry("tech", buildPosts(13, "tech")),
				categoryEntry("notes", buildPosts(1, "notes")),
			]),
		);
	});

	it("keeps the category root as page one", async () => {
		const paths = await getCategoryIndexStaticPaths();

		expect(paths.map((path) => path.params)).toEqual([
			{ slug: "tech" },
			{ slug: "notes" },
		]);
		const firstPage = paths[0]?.props as CategoryPageProps;
		expect(firstPage.pagination.url.current).toBe("/category/tech/");
		expect(firstPage.posts).toHaveLength(12);
		expect(firstPage.posts[0]).toEqual({ id: "post-1" });
		expect(firstPage).not.toHaveProperty("allPosts");
		expect(firstPage.pagination).not.toHaveProperty("data");
		expect(firstPage.tagIndexUrl).toBe("/api/categories/tech.json/");
	});

	it("generates pagination from page two and skips single-page categories", async () => {
		const paths = await getCategoryPaginatedStaticPaths();

		expect(paths.map((path) => path.params)).toEqual([
			{ slug: "tech", page: "2" },
		]);
		const secondPage = paths[0]?.props as CategoryPageProps;
		expect(secondPage.pagination.url).toMatchObject({
			current: "/category/tech/page/2/",
			first: "/category/tech/",
			prev: "/category/tech/",
		});
	});
});
