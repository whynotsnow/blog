import { describe, expect, it } from "vitest";

import {
	DEVELOPMENT_POSTS_CONTENT_BASE,
	POSTS_CONTENT_BASE,
	resolveBlogContentMode,
	resolvePostsContentBase,
	TEST_POSTS_CONTENT_BASE,
} from "@/content-source";

describe("content source selection", () => {
	it("uses production posts by default", () => {
		expect(resolveBlogContentMode({})).toBe("production");
		expect(resolvePostsContentBase({})).toBe(POSTS_CONTENT_BASE);
	});

	it("uses test fixture posts only when explicitly requested", () => {
		expect(resolveBlogContentMode({ BLOG_CONTENT_MODE: "test" })).toBe(
			"test",
		);
		expect(resolvePostsContentBase({ BLOG_CONTENT_MODE: "test" })).toBe(
			TEST_POSTS_CONTENT_BASE,
		);
	});

	it("uses the development overlay only when explicitly requested", () => {
		expect(
			resolveBlogContentMode({ BLOG_CONTENT_MODE: "development" }),
		).toBe("development");
		expect(
			resolvePostsContentBase({ BLOG_CONTENT_MODE: "development" }),
		).toBe(DEVELOPMENT_POSTS_CONTENT_BASE);
	});

	it("fails closed for unsupported modes", () => {
		expect(() =>
			resolvePostsContentBase({ BLOG_CONTENT_MODE: "preview" }),
		).toThrow(/Unsupported BLOG_CONTENT_MODE/);
	});
});
