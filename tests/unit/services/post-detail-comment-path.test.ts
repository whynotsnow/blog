import { describe, expect, test } from "vitest";
import { buildTwikooCommentPath } from "@/services/post-detail/comment-path";

describe("buildTwikooCommentPath", () => {
	test("keeps ascii canonical post paths unchanged", () => {
		expect(buildTwikooCommentPath("/posts/markdown-tutorial/")).toBe(
			"/posts/markdown-tutorial/",
		);
	});

	test("encodes non-ascii post path segments for Twikoo lookup keys", () => {
		expect(buildTwikooCommentPath("/posts/我的博客文章-3/")).toBe(
			"/posts/%E6%88%91%E7%9A%84%E5%8D%9A%E5%AE%A2%E6%96%87%E7%AB%A0-3/",
		);
	});

	test("does not double-encode already encoded path segments", () => {
		expect(
			buildTwikooCommentPath(
				"/posts/%E6%88%91%E7%9A%84%E5%8D%9A%E5%AE%A2%E6%96%87%E7%AB%A0-3/",
			),
		).toBe(
			"/posts/%E6%88%91%E7%9A%84%E5%8D%9A%E5%AE%A2%E6%96%87%E7%AB%A0-3/",
		);
	});
});
