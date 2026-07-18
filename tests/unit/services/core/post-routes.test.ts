import { describe, expect, it } from "vitest";
import {
	PostRouteValidationError,
	buildPostRoute,
	buildPostRouteIndex,
	normalizePostSlug,
	validatePostRoutes,
} from "@/services/core/post-routes";
import type { PostRouteSource } from "@/services/core/types";

function post(
	id: string,
	alias?: string,
	filePath = `src/content/posts/${id}.md`,
): PostRouteSource {
	return { id, alias, filePath };
}

describe("post route normalization", () => {
	it("normalizes optional posts prefixes and unicode", () => {
		expect(normalizePostSlug(" /posts/guide/ ")).toBe("guide");
		expect(normalizePostSlug("posts/cafe\u0301")).toBe("café");
	});

	it.each([
		"",
		"../archive",
		"foo//bar",
		"foo?draft=1",
		"foo#top",
		"foo\\bar",
	])("rejects unsafe alias %j", (alias) => {
		expect(() => normalizePostSlug(alias)).toThrow();
	});

	it("rejects encoded path traversal and malformed percent encoding", () => {
		expect(() => normalizePostSlug("%2E%2E/archive")).toThrow();
		expect(() => normalizePostSlug("bad%2")).toThrow();
	});
});

describe("post route model", () => {
	it("uses the default slug when no alias exists", () => {
		expect(buildPostRoute(post("guide"))).toMatchObject({
			defaultSlug: "guide",
			canonicalSlug: "guide",
			canonicalUrl: "/posts/guide/",
			usesAlias: false,
		});
	});

	it("uses the normalized alias as the canonical route", () => {
		expect(buildPostRoute(post("guide", "/posts/start/"))).toMatchObject({
			defaultSlug: "guide",
			canonicalSlug: "start",
			canonicalUrl: "/posts/start/",
			usesAlias: true,
		});
	});

	it("indexes canonical routes by id and normalized slug", () => {
		const index = buildPostRouteIndex([
			post("guide"),
			post("entry", "Café"),
		]);
		expect(index.byId.get("entry")?.canonicalUrl).toBe("/posts/Café/");
		expect(index.bySlug.get("café")?.postId).toBe("entry");
	});
});

describe("post route validation", () => {
	it("aggregates alias and default-slug collisions", () => {
		const posts = [
			post("guide"),
			post("other", "GUIDE"),
			post("first", "same"),
			post("second", "Same"),
		];

		expect(() => validatePostRoutes(posts)).toThrow(
			PostRouteValidationError,
		);
		try {
			validatePostRoutes(posts);
		} catch (error) {
			expect(error).toBeInstanceOf(PostRouteValidationError);
			expect((error as PostRouteValidationError).issues).toHaveLength(2);
			expect((error as Error).message).toContain('alias "GUIDE"');
			expect((error as Error).message).toContain(
				'alias "same" is shared',
			);
		}
	});

	it("reports every invalid post in one error", () => {
		try {
			validatePostRoutes([post("one", ".."), post("two", "bad#hash")]);
			expect.fail("validation should fail");
		} catch (error) {
			expect(error).toBeInstanceOf(PostRouteValidationError);
			expect((error as PostRouteValidationError).issues).toHaveLength(2);
		}
	});
});
