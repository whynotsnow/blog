import { beforeEach, describe, expect, it, vi } from "vitest";

const { getContentStore } = vi.hoisted(() => ({
	getContentStore: vi.fn(),
}));

vi.mock("@/services/core/content-store", () => ({ getContentStore }));

import { GET as getAtom } from "@/pages/atom.xml";
import { GET as getRss } from "@/pages/rss.xml";
import type { PostIndexEntry } from "@/services/core/types";

const post: PostIndexEntry = {
	id: "special",
	postId: 1,
	route: {
		postId: "special",
		defaultSlug: "special",
		canonicalSlug: "special",
		canonicalUrl: "/posts/special/",
		usesAlias: false,
	},
	title: "Title & <special>",
	description: "Summary & literal ]]>",
	published: new Date("2026-01-01T00:00:00.000Z"),
	updated: new Date("2026-01-02T00:00:00.000Z"),
	category: { slug: "tech", name: "Tech & Tools", url: "/category/tech/" },
	tags: [{ slug: "astro", name: "Astro", url: "/category/tech/?tag=astro" }],
	score: 1,
	words: 100,
	minutes: 1,
	excerpt: "Excerpt",
	pinned: false,
	draft: false,
	encrypted: false,
};

describe("feed endpoints", () => {
	beforeEach(() => {
		getContentStore.mockReset();
		getContentStore.mockResolvedValue({ posts: [post] });
	});

	it("serves summary-only RSS from the shared feed model", async () => {
		const response = await getRss({
			site: new URL("https://example.com/"),
		} as never);
		const xml = await response.text();

		expect(response.headers.get("content-type")).toBe("application/xml");
		expect(xml).toContain("Summary &amp; literal ]]&gt;");
		expect(xml).toContain("https://example.com/posts/special/");
		expect(xml).toContain("<category>Tech &amp; Tools</category>");
		expect(xml).not.toContain("content:encoded");
	});

	it("serves escaped Atom without CDATA or build-time timestamps", async () => {
		const response = await getAtom({
			site: new URL("https://example.com/"),
		} as never);
		const xml = await response.text();

		expect(response.headers.get("content-type")).toBe(
			"application/atom+xml; charset=utf-8",
		);
		expect(xml).toContain("Title &amp; &lt;special&gt;");
		expect(xml).toContain("Summary &amp; literal ]]&gt;");
		expect(xml).toContain("<updated>2026-01-02T00:00:00.000Z</updated>");
		expect(xml).not.toContain("<![CDATA[");
	});
});
