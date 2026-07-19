import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/core/source", () => ({ buildPostIndex: vi.fn() }));

import { buildContentStore } from "@/services/core/content-store";
import { buildPostRouteIndex } from "@/services/core/post-routes";
import type {
	PostIndexEntry,
	PostRoute,
	PostRouteSource,
} from "@/services/core/types";

function indexPost(id: string, route: PostRoute): PostIndexEntry {
	return {
		id,
		postId: 1,
		route,
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

function buildFixture(sources: PostRouteSource[]) {
	const routes = buildPostRouteIndex(sources);
	const posts = sources.map((source) =>
		indexPost(source.id, routes.byId.get(source.id)!),
	);
	return { posts, routes };
}

describe("content store route index", () => {
	it("preserves canonical route identity and normalized slug lookups", () => {
		const fixture = buildFixture([
			{ id: "guide" },
			{ id: "legacy-name", alias: "Caf%C3%A9" },
		]);
		const store = buildContentStore(fixture.posts, fixture.routes);

		expect(store.routes).toBe(fixture.routes);
		expect(store.routes.byId.get("guide")?.canonicalUrl).toBe(
			"/posts/guide/",
		);
		expect(store.routes.bySlug.get("café")?.postId).toBe("legacy-name");
		expect(store.routes.bySlug.has("Caf%C3%A9")).toBe(false);
	});

	it("rejects a missing route entry", () => {
		const fixture = buildFixture([{ id: "guide" }]);
		expect(() =>
			buildContentStore(fixture.posts, {
				byId: new Map(),
				bySlug: new Map(),
			}),
		).toThrow("does not match post index size");
	});

	it("rejects a copied route instead of the authoritative entry", () => {
		const fixture = buildFixture([{ id: "guide" }]);
		fixture.posts[0].route = { ...fixture.posts[0].route };
		expect(() => buildContentStore(fixture.posts, fixture.routes)).toThrow(
			"is not the canonical index entry",
		);
	});
});
