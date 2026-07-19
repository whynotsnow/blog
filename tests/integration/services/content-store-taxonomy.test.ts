import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/core/source", () => ({ buildPostIndex: vi.fn() }));

import { buildContentStore } from "@/services/core/content-store";
import { buildCategoryItems } from "@/services/core/inject";
import { buildPostRouteIndex } from "@/services/core/post-routes";
import type { PostIndexEntry } from "@/services/core/types";

function post(id: string, category: string): PostIndexEntry {
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
		title: id,
		description: "",
		published: new Date("2026-01-01T00:00:00.000Z"),
		category: buildCategoryItems(category),
		tags: [{ name: "Astro", slug: "astro", url: "/archive/?tag=Astro" }],
		score: 0,
		words: 0,
		minutes: 0,
		excerpt: "",
		pinned: false,
		draft: false,
		encrypted: false,
	};
}

describe("content store taxonomy", () => {
	it("merges canonical category names and aliases with shared tag counts", () => {
		const posts = [post("canonical", "技术"), post("alias", "Technology")];
		const routes = buildPostRouteIndex(posts);
		for (const entry of posts) entry.route = routes.byId.get(entry.id)!;
		const store = buildContentStore(posts, routes);

		expect(Array.from(store.categoryMap.keys())).toEqual(["tech"]);
		expect(store.categoryMap.get("tech")?.category).toMatchObject({
			name: "技术",
			count: 2,
		});
		expect(store.categoryMap.get("tech")?.tags.get("astro")?.count).toBe(2);
	});
});
