import { describe, expect, it } from "vitest";
import { getTagUrl, pathsEqual, toSlug, url } from "@/utils/url";

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
});
