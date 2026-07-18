import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/core/source", () => ({
	getAllPosts: vi.fn(),
}));

import { buildContentStore } from "@/services/core/content-store";
import type { ListPost } from "@/services/core/types";

function listPost(id: string, alias?: string): ListPost {
	return {
		id,
		collection: "posts",
		data: {
			title: id,
			published: new Date("2026-01-01T00:00:00.000Z"),
			draft: false,
			pinned: false,
			description: "",
			image: "",
			author: "",
			lang: "",
			tags: [],
			category: "",
			comment: true,
			sourceLink: "",
			licenseName: "",
			licenseUrl: "",
			encrypted: false,
			password: "",
			alias,
			recommendScore: 0,
		},
		meta: {
			postId: 1,
			score: 0,
			words: 0,
			minutes: 0,
			excerpt: "",
		},
	} as ListPost;
}

describe("content store route index", () => {
	it("exposes canonical routes without presentation-side derivation", () => {
		const store = buildContentStore([
			listPost("guide"),
			listPost("legacy-name", "canonical-name"),
		]);

		expect(store.routes.byId.get("guide")?.canonicalUrl).toBe(
			"/posts/guide/",
		);
		expect(store.routes.byId.get("legacy-name")?.canonicalUrl).toBe(
			"/posts/canonical-name/",
		);
	});
});
