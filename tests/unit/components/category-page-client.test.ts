import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildPage,
	clearCategoryTagIndexCache,
	loadCategoryTagIndex,
	parseCategoryUrl,
} from "@/components/category/category-page-client";
import type { ClientPostCard } from "@/services/category-page";

const posts: ClientPostCard[] = [
	{
		id: "one",
		url: "/posts/one/",
		title: "One",
		summary: "Summary",
		published: "2026-01-01T00:00:00.000Z",
		category: { name: "Tech", url: "/category/tech/" },
		tags: [{ slug: "astro", name: "Astro", url: "/archive/?tag=astro" }],
		words: 100,
		pinned: false,
	},
];

describe("category page client", () => {
	beforeEach(() => {
		clearCategoryTagIndexCache();
	});

	it("normalizes invalid tag pages and reads static page paths", () => {
		expect(
			parseCategoryUrl(
				"https://example.com/category/tech/page/2/?tag=astro&tagPage=-4",
			),
		).toEqual({ isTagMode: true, tag: "astro", page: 2, tagPage: 1 });
		expect(
			parseCategoryUrl("https://example.com/category/tech/?tagPage=NaN"),
		).toEqual({ isTagMode: false, tag: "", page: 1, tagPage: 1 });
	});

	it("clamps pagination to the available range", () => {
		expect(buildPage([1, 2, 3], 99, 2)).toMatchObject({
			data: [3],
			currentPage: 2,
			lastPage: 2,
			total: 3,
		});
	});

	it("caches successful requests by index URL", async () => {
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				new Response(JSON.stringify(posts), { status: 200 }),
			);

		await expect(
			loadCategoryTagIndex("/api/categories/tech.json", fetcher),
		).resolves.toEqual(posts);
		await expect(
			loadCategoryTagIndex("/api/categories/tech.json", fetcher),
		).resolves.toEqual(posts);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it("evicts failed requests so retry can succeed", async () => {
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify(posts), { status: 200 }),
			);

		await expect(
			loadCategoryTagIndex("/api/categories/tech.json", fetcher),
		).rejects.toThrow("503");
		await expect(
			loadCategoryTagIndex("/api/categories/tech.json", fetcher),
		).resolves.toEqual(posts);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
});
