import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildPage,
	clearCategoryTagIndexCache,
	loadCategoryTagIndex,
	parseCategoryUrl,
	shouldPrefetchCategoryTagIndex,
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

	it("isolates category indexes by URL and evicts the least recently used entry", async () => {
		const fetcher = vi.fn<typeof fetch>().mockImplementation(
			async (url) =>
				new Response(
					JSON.stringify([{ ...posts[0], id: String(url) }]),
					{
						status: 200,
					},
				),
		);

		await loadCategoryTagIndex("/api/categories/tech.json/", fetcher);
		await loadCategoryTagIndex("/api/categories/life.json/", fetcher);
		await loadCategoryTagIndex("/api/categories/notes.json/", fetcher);
		await loadCategoryTagIndex("/api/categories/tech.json/", fetcher);
		await loadCategoryTagIndex("/api/categories/travel.json/", fetcher);
		await loadCategoryTagIndex("/api/categories/life.json/", fetcher);

		expect(fetcher).toHaveBeenCalledTimes(5);
		expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
			"/api/categories/tech.json/",
			"/api/categories/life.json/",
			"/api/categories/notes.json/",
			"/api/categories/travel.json/",
			"/api/categories/life.json/",
		]);
	});

	it("prefetches only on visible, online, unmetered non-2g pages", () => {
		expect(
			shouldPrefetchCategoryTagIndex({
				isVisible: true,
				isOnline: true,
				saveData: false,
				effectiveType: "4g",
			}),
		).toBe(true);

		for (const conditions of [
			{
				isVisible: false,
				isOnline: true,
				saveData: false,
				effectiveType: "4g",
			},
			{
				isVisible: true,
				isOnline: false,
				saveData: false,
				effectiveType: "4g",
			},
			{
				isVisible: true,
				isOnline: true,
				saveData: true,
				effectiveType: "4g",
			},
			{
				isVisible: true,
				isOnline: true,
				saveData: false,
				effectiveType: "2g",
			},
			{
				isVisible: true,
				isOnline: true,
				saveData: false,
				effectiveType: "slow-2g",
			},
		]) {
			expect(shouldPrefetchCategoryTagIndex(conditions)).toBe(false);
		}
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
