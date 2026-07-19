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

function buildPosts(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		id: `post-${index + 1}`,
	}));
}

describe("category static paths", () => {
	beforeEach(() => {
		getContentStore.mockReset();
		getContentStore.mockResolvedValue({
			categoryMap: new Map([
				["tech", { posts: buildPosts(13) }],
				["notes", { posts: buildPosts(1) }],
			]),
			categories: [],
		});
	});

	it("keeps the category root as page one", async () => {
		const paths = await getCategoryIndexStaticPaths();

		expect(paths.map((path) => path.params)).toEqual([
			{ slug: "tech" },
			{ slug: "notes" },
		]);
		const firstPage = paths[0]?.props as CategoryPageProps;
		expect(firstPage.page.url.current).toBe("/category/tech/");
	});

	it("generates pagination from page two and skips single-page categories", async () => {
		const paths = await getCategoryPaginatedStaticPaths();

		expect(paths.map((path) => path.params)).toEqual([
			{ slug: "tech", page: "2" },
		]);
		const secondPage = paths[0]?.props as CategoryPageProps;
		expect(secondPage.page.url).toMatchObject({
			current: "/category/tech/page/2/",
			first: "/category/tech/",
			prev: "/category/tech/",
		});
	});
});
