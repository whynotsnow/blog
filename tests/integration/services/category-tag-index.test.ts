import { beforeEach, describe, expect, it, vi } from "vitest";

const { getContentStore } = vi.hoisted(() => ({
	getContentStore: vi.fn(),
}));

vi.mock("@/services/core/content-store", () => ({ getContentStore }));
vi.mock("@/services/core/sort", () => ({
	sortByScore: <T extends { score: number }>(posts: T[]) =>
		[...posts].sort((a, b) => b.score - a.score),
}));

import {
	buildCategoryTagIndex,
	getCategoryTagIndexStaticPaths,
	type CategoryTagIndexStaticPathProps,
} from "@/services/category-page";
import { GET } from "@/pages/api/categories/[slug].json";
import type { PostIndexEntry } from "@/services/core/types";

function buildPost(
	id: string,
	overrides: Partial<PostIndexEntry> = {},
): PostIndexEntry {
	return {
		id,
		postId: 1,
		route: {
			postId: id,
			defaultSlug: id,
			canonicalSlug: id,
			canonicalUrl: `/posts/${id}/`,
			usesAlias: false,
		},
		title: `Title ${id}`,
		description: "",
		published: new Date("2026-01-02T00:00:00.000Z"),
		category: { slug: "tech", name: "Tech", url: "/category/tech/" },
		tags: [
			{ slug: "astro", name: "Astro", url: "/archive/?tag=astro" },
			{ slug: "svelte", name: "Svelte", url: "/archive/?tag=svelte" },
		],
		score: 1,
		words: 1200,
		minutes: 5,
		excerpt: `Excerpt ${id}`,
		pinned: false,
		draft: false,
		encrypted: false,
		...overrides,
	};
}

describe("category tag index", () => {
	beforeEach(() => {
		getContentStore.mockReset();
	});

	it("sorts posts and emits only the compact client contract", () => {
		const posts = buildCategoryTagIndex([
			buildPost("low", { score: 1 }),
			buildPost("high", {
				score: 10,
				description: "  Preferred summary  ",
			}),
		]);

		expect(posts.map((post) => post.id)).toEqual(["high", "low"]);
		expect(posts[0]).toEqual({
			id: "high",
			url: "/posts/high/",
			title: "Title high",
			summary: "Preferred summary",
			published: "2026-01-02T00:00:00.000Z",
			category: { name: "Tech", url: "/category/tech/" },
			tags: [
				{ slug: "astro", name: "Astro", url: "/archive/?tag=astro" },
				{ slug: "svelte", name: "Svelte", url: "/archive/?tag=svelte" },
			],
			words: 1200,
			pinned: false,
			image: undefined,
		});
		expect(posts[1]?.summary).toBe("Excerpt low");
		expect(Object.keys(posts[0] ?? {})).not.toContain("meta");
		expect(Object.keys(posts[0] ?? {})).not.toContain("updated");
	});

	it("falls back to the title when description and excerpt are blank", () => {
		const [post] = buildCategoryTagIndex([
			buildPost("fallback", { description: " ", excerpt: " " }),
		]);

		expect(post?.summary).toBe("Title fallback");
	});

	it("generates one static JSON path per category", async () => {
		getContentStore.mockResolvedValue({
			categoryMap: new Map([
				["tech", { posts: [buildPost("one")] }],
				["notes", { posts: [buildPost("two")] }],
			]),
		});

		const paths = await getCategoryTagIndexStaticPaths();

		expect(paths.map((path) => path.params)).toEqual([
			{ slug: "tech" },
			{ slug: "notes" },
		]);
	});

	it("serves JSON with a revalidating public cache policy", async () => {
		const props: CategoryTagIndexStaticPathProps = {
			posts: buildCategoryTagIndex([buildPost("one")]),
		};
		const response = GET({ props } as never);

		expect(response.headers.get("content-type")).toBe(
			"application/json; charset=utf-8",
		);
		expect(response.headers.get("cache-control")).toBe(
			"public, max-age=0, must-revalidate",
		);
		expect(await response.json()).toEqual(props.posts);
	});
});
