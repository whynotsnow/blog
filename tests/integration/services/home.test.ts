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

	it("selects and ranks only canonical technology posts", async () => {
		const technologyPosts = [
			post("tech-low", "tech", 1),
			post("tech-high", "tech", 10),
		];
		const other = post("other", "notes", 100);
		getContentStore.mockResolvedValue(
			buildStore([other, ...technologyPosts]),
		);

		const page = await getHomePageViewModel();
		const technology = page.sections.find(
			(section) => section.id === "technology",
		);

		expect(technology?.href).toBe("/category/tech/");
		expect(technology?.posts.map((entry) => entry.id)).toEqual([
			"tech-high",
			"tech-low",
		]);
		expect(
			technology?.posts.every((entry) => entry.category.slug === "tech"),
		).toBe(true);
	});

	it("does not backfill a short technology section", async () => {
		const onlyTechnologyPost = post("only-tech", "tech", 1);
		getContentStore.mockResolvedValue(
			buildStore([onlyTechnologyPost, post("other", "notes", 100)]),
		);

		const page = await getHomePageViewModel();
		expect(
			page.sections.find((section) => section.id === "technology")?.posts,
		).toHaveLength(1);
	});

	it("limits recent and recommended sections separately from technology", async () => {
		const technologyPosts = Array.from({ length: 7 }, (_, index) =>
			post(`tech-${index}`, "tech", index),
		);
		getContentStore.mockResolvedValue(buildStore(technologyPosts));

		const page = await getHomePageViewModel();

		expect(
			page.sections.find((section) => section.id === "recent")?.posts,
		).toHaveLength(3);
		expect(
			page.sections.find((section) => section.id === "recommended")
				?.posts,
		).toHaveLength(3);
		expect(
			page.sections.find((section) => section.id === "technology")?.posts,
		).toHaveLength(6);
	});

	it("omits the technology section when the category is empty", async () => {
		getContentStore.mockResolvedValue(
			buildStore([post("other", "notes", 100)]),
		);

		const page = await getHomePageViewModel();
		expect(page.sections.map((section) => section.id)).toEqual([
			"recent",
			"recommended",
		]);
	});
});
