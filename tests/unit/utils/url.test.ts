import { describe, expect, it } from "vitest";
import {
	getCategoryPageUrl,
	getCategoryTagUrl,
	getTagUrl,
	pathsEqual,
	toSlug,
	url,
} from "@/utils/url";

describe("universal URL utilities", () => {
	it("joins paths against root and nested base paths", () => {
		expect(url("/posts/guide/", "/")).toBe("/posts/guide/");
		expect(url("posts/guide/", "/blog/")).toBe("/blog/posts/guide/");
	});

	it("compares paths without case or boundary slash drift", () => {
		expect(pathsEqual("/Posts/Guide/", "posts/guide")).toBe(true);
		expect(pathsEqual("/posts/guide/", "/posts/other/")).toBe(false);
	});

	it("normalizes unicode-friendly slugs without escaping content", () => {
		expect(toSlug(" 技术 文章 ")).toBe("技术-文章");
	});

	it("encodes tag query values consistently", () => {
		expect(getTagUrl("Astro 技巧 & Notes")).toBe(
			"/archive/?tag=Astro%20%E6%8A%80%E5%B7%A7%20%26%20Notes",
		);
		expect(getTagUrl("  ")).toBe("/archive/");
	});

	it("builds category and category-scoped tag URLs", () => {
		expect(getCategoryPageUrl("tech")).toBe("/category/tech/");
		expect(getCategoryTagUrl("tech", "astro")).toBe(
			"/category/tech/?tag=astro",
		);
		expect(getCategoryTagUrl("技术", "Astro 技巧")).toBe(
			"/category/%E6%8A%80%E6%9C%AF/?tag=Astro%20%E6%8A%80%E5%B7%A7",
		);
		expect(getCategoryTagUrl("tech", "  ")).toBe("/category/tech/");
	});
});
