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
import type { PostIndexEntry } from "@/services/core/types";

function post(id: string, categorySlug: string, score: number): PostIndexEntry {
	return {
		id,
		score,
		category: { name: categorySlug, slug: categorySlug, url: "" },
		updated: new Date("2026-01-02T00:00:00.000Z"),
		published: new Date("2026-01-01T00:00:00.000Z"),
	} as PostIndexEntry;
}

describe("home page content selection", () => {
	beforeEach(() => getContentStore.mockReset());

	it("selects and ranks only canonical technology posts", async () => {
		const technologyPosts = [
			post("tech-low", "tech", 1),
			post("tech-high", "tech", 10),
		];
		const other = post("other", "notes", 100);
		getContentStore.mockResolvedValue({
			posts: [other, ...technologyPosts],
			categoryMap: new Map([["tech", { posts: technologyPosts }]]),
		});

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
		getContentStore.mockResolvedValue({
			posts: [onlyTechnologyPost, post("other", "notes", 100)],
			categoryMap: new Map([["tech", { posts: [onlyTechnologyPost] }]]),
		});

		const page = await getHomePageViewModel();
		expect(
			page.sections.find((section) => section.id === "technology")?.posts,
		).toHaveLength(1);
	});

	it("limits recent and recommended sections separately from technology", async () => {
		const technologyPosts = Array.from({ length: 7 }, (_, index) =>
			post(`tech-${index}`, "tech", index),
		);
		getContentStore.mockResolvedValue({
			posts: technologyPosts,
			categoryMap: new Map([["tech", { posts: technologyPosts }]]),
		});

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
		getContentStore.mockResolvedValue({
			posts: [post("other", "notes", 100)],
			categoryMap: new Map(),
		});

		const page = await getHomePageViewModel();
		expect(page.sections.map((section) => section.id)).toEqual([
			"recent",
			"recommended",
		]);
	});
});
