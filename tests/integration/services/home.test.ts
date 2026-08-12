import { beforeEach, describe, expect, it, vi } from "vitest";

const { getContentStore } = vi.hoisted(() => ({
	getContentStore: vi.fn(),
}));

vi.mock("@/services/core/content-store", () => ({ getContentStore }));
vi.mock("@/services/core/inject", () => ({
	toPostCardViewModel: (post: {
		id: string;
		category: { slug: string };
	}) => ({
		id: post.id,
		category: post.category,
	}),
}));

import { getHomePageViewModel } from "@/services/home";
import type {
	CategoryEntry,
	ContentStore,
	PostIndexEntry,
	PostNavigatorCategory,
	TagItem,
} from "@/services/core/types";

function post(id: string, categorySlug: string, score: number): PostIndexEntry {
	return {
		id,
		postId: Number.parseInt(id.replace(/\D/g, ""), 10) || score,
		route: {
			postId: id,
			defaultSlug: id,
			canonicalSlug: id,
			canonicalUrl: `/posts/${id}/`,
			usesAlias: false,
		},
		title: id,
		description: "",
		score,
		category: { name: categorySlug, slug: categorySlug, url: "" },
		tags: [
			{
				name: `${categorySlug}-tag`,
				slug: `${categorySlug}-tag`,
				url: `/category/${categorySlug}/?tag=${categorySlug}-tag`,
			},
		],
		words: 100,
		minutes: 1,
		excerpt: "",
		pinned: false,
		draft: false,
		encrypted: false,
		updated: new Date("2026-01-02T00:00:00.000Z"),
		published: new Date("2026-01-01T00:00:00.000Z"),
	} as PostIndexEntry;
}

function buildStore(posts: PostIndexEntry[]): ContentStore {
	const categoryMap = new Map<string, CategoryEntry>();

	for (const entry of posts) {
		let categoryEntry = categoryMap.get(entry.category.slug);
		if (!categoryEntry) {
			categoryEntry = {
				category: {
					slug: entry.category.slug,
					name: entry.category.name,
					count: 0,
					url: `/category/${entry.category.slug}/`,
				},
				posts: [],
				tags: new Map<string, TagItem>(),
			};
			categoryMap.set(entry.category.slug, categoryEntry);
		}

		categoryEntry.posts.push(entry);
		categoryEntry.category.count += 1;

		for (const tag of entry.tags) {
			const current = categoryEntry.tags.get(tag.slug);
			categoryEntry.tags.set(tag.slug, {
				slug: tag.slug,
				name: tag.name,
				count: (current?.count ?? 0) + 1,
				url: tag.url,
			});
		}
	}

	const categories: PostNavigatorCategory[] = Array.from(
		categoryMap.values(),
	).map((entry) => ({
		slug: entry.category.slug,
		name: entry.category.name,
		count: entry.posts.length,
		url: entry.category.url,
		tags: Array.from(entry.tags.values()),
	}));

	return {
		posts,
		postsById: new Map(posts.map((entry) => [entry.id, entry])),
		routes: {
			byId: new Map(posts.map((entry) => [entry.id, entry.route])),
			bySlug: new Map(
				posts.map((entry) => [entry.route.canonicalSlug, entry.route]),
			),
		},
		stats: {
			postCount: posts.length,
			totalWords: posts.reduce((total, entry) => total + entry.words, 0),
			lastActivityAt: posts[0]?.updated ?? posts[0]?.published ?? null,
		},
		categoryMap,
		categories,
	};
}

describe("home page content selection", () => {
	beforeEach(() => getContentStore.mockReset());

	it("builds recent, recommended, and category guide sections", async () => {
		getContentStore.mockResolvedValue(
			buildStore([
				post("tech-new", "tech", 1),
				post("notes-high", "notes", 100),
				post("guide", "guides", 20),
			]),
		);

		const page = await getHomePageViewModel();

		expect(page.sections.map((section) => section.id)).toEqual([
			"recent",
			"recommended",
		]);
		expect(page.sections[0].href).toBe("/category/recent/");
		expect(page.sections[1].href).toBe("/category/recommended/");
		expect(page.categorySection).toMatchObject({
			id: "categories",
			title: "文章分类",
			href: "/category/",
			linkLabel: "全部分类",
		});
		expect(
			page.categorySection.categories.map((category) => category.slug),
		).toEqual(["tech", "notes", "guides"]);
	});

	it("limits category cards to the first six categories", async () => {
		getContentStore.mockResolvedValue(
			buildStore(
				Array.from({ length: 7 }, (_, index) =>
					post(`post-${index}`, `cat-${index}`, index),
				),
			),
		);

		const page = await getHomePageViewModel();

		expect(
			page.categorySection.categories.map((category) => category.slug),
		).toEqual(["cat-0", "cat-1", "cat-2", "cat-3", "cat-4", "cat-5"]);
	});

	it("limits recent and recommended sections separately from categories", async () => {
		const posts = Array.from({ length: 7 }, (_, index) =>
			post(`post-${index}`, `cat-${index}`, index),
		);
		getContentStore.mockResolvedValue(buildStore(posts));

		const page = await getHomePageViewModel();

		expect(
			page.sections.find((section) => section.id === "recent")?.posts,
		).toHaveLength(3);
		expect(
			page.sections.find((section) => section.id === "recommended")
				?.posts,
		).toHaveLength(3);
		expect(page.categorySection.categories).toHaveLength(6);
	});

	it("reuses category card data for homepage category previews", async () => {
		getContentStore.mockResolvedValue(
			buildStore([
				post("tech-new", "tech", 1),
				post("tech-old", "tech", 2),
			]),
		);

		const page = await getHomePageViewModel();
		const [category] = page.categorySection.categories;

		expect(category).toMatchObject({
			slug: "tech",
			name: "tech",
			url: "/category/tech/",
			count: 2,
			tagCount: 1,
			description: "记录前端工程、框架实践、构建工具与技术问题处理。",
			image: {
				src: "/assets/desktop-banner/1.webp",
			},
		});
		expect(category.tags).toEqual([
			{
				slug: "tech-tag",
				name: "tech-tag",
				count: 2,
				url: "/category/tech/?tag=tech-tag",
			},
		]);
		expect(category.recentPosts.map((post) => post.title)).toEqual([
			"tech-new",
			"tech-old",
		]);
	});
});
