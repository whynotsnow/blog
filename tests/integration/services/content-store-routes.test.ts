import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/core/source", () => ({
	getAllPosts: vi.fn(),
}));

import { buildContentStore } from "@/services/core/content-store";
import type { PostIndexEntry } from "@/services/core/types";

function indexPost(id: string, alias?: string): PostIndexEntry {
	return {
		id,
		postId: 1,
		route: {
			postId: id,
			defaultSlug: id,
			canonicalSlug: alias ?? id,
			canonicalUrl: `/posts/${alias ?? id}/`,
			usesAlias: Boolean(alias),
		},
		title: id,
		description: "",
		published: new Date("2026-01-01T00:00:00.000Z"),
		category: {
			name: "uncategorized",
			slug: "uncategorized",
			url: "/category/uncategorized/",
		},
		tags: [],
		score: 0,
		words: 0,
		minutes: 0,
		excerpt: "",
		pinned: false,
		draft: false,
		encrypted: false,
	};
}

describe("content store route index", () => {
	it("exposes canonical routes without presentation-side derivation", () => {
		const store = buildContentStore([
			indexPost("guide"),
			indexPost("legacy-name", "canonical-name"),
		]);

		expect(store.routes.byId.get("guide")?.canonicalUrl).toBe(
			"/posts/guide/",
		);
		expect(store.routes.byId.get("legacy-name")?.canonicalUrl).toBe(
			"/posts/canonical-name/",
		);
	});
});
