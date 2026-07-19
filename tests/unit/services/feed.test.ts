import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/core/content-store", () => ({
	getContentStore: vi.fn(),
}));
import {
	buildFeedItems,
	escapeXmlAttribute,
	escapeXmlText,
	getFeedUpdated,
	renderAtomFeed,
} from "@/services/feed";
import type { PostIndexEntry } from "@/services/core/types";

function buildPost(
	id: string,
	overrides: Partial<PostIndexEntry> = {},
): PostIndexEntry {
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
		title: `Title ${id}`,
		description: "",
		published: new Date("2026-01-01T00:00:00.000Z"),
		category: { slug: "tech", name: "Tech", url: "/category/tech/" },
		tags: [{ slug: "astro", name: "Astro", url: "/archive/?tag=astro" }],
		score: 1,
		words: 100,
		minutes: 1,
		excerpt: `Excerpt ${id}`,
		pinned: false,
		draft: false,
		encrypted: false,
		...overrides,
	};
}

describe("feed service", () => {
	it("builds body-free items with stable summary fallbacks and filtering", () => {
		const items = buildFeedItems(
			[
				buildPost("description", { description: "  Description  " }),
				buildPost("excerpt"),
				buildPost("title", { excerpt: " " }),
				buildPost("draft", { draft: true }),
				buildPost("encrypted", { encrypted: true }),
			],
			new URL("https://example.com/base/"),
		);

		expect(items.map((item) => item.summary)).toEqual([
			"Description",
			"Excerpt excerpt",
			"Title title",
		]);
		expect(items[0]?.url).toBe("https://example.com/posts/description/");
		expect(items[0]?.categories).toEqual(["Tech", "Astro"]);
		expect(items).toHaveLength(3);
	});

	it("escapes XML text and attributes without CDATA boundaries", () => {
		expect(escapeXmlText('A & B < C > D "]]>')).toBe(
			'A &amp; B &lt; C &gt; D "]]&gt;',
		);
		expect(escapeXmlAttribute(`A & B < C > D "quote" 'apostrophe'`)).toBe(
			"A &amp; B &lt; C &gt; D &quot;quote&quot; &apos;apostrophe&apos;",
		);
	});

	it("renders Atom from the shared item contract", () => {
		const item = buildFeedItems(
			[
				buildPost("special", {
					title: "A & <title>",
					description: "literal ]]> & summary",
					updated: new Date("2026-02-03T00:00:00.000Z"),
					category: {
						slug: "quoted",
						name: 'A "quoted" category',
						url: "/category/quoted/",
					},
				}),
			],
			new URL("https://example.com/"),
		)[0]!;

		const xml = renderAtomFeed({
			title: "Site & title",
			subtitle: "Subtitle <safe>",
			site: new URL("https://example.com/"),
			lang: "zh_CN",
			author: "Author & Co",
			items: [item],
			emptyUpdated: new Date("2026-01-01T00:00:00.000Z"),
		});

		expect(xml).toContain('xml:lang="zh-CN"');
		expect(xml).toContain("<title>A &amp; &lt;title&gt;</title>");
		expect(xml).toContain("literal ]]&gt; &amp; summary");
		expect(xml).toContain('term="A &quot;quoted&quot; category"');
		expect(xml).toContain("<updated>2026-02-03T00:00:00.000Z</updated>");
		expect(xml).not.toContain("<![CDATA[");
		expect(xml).not.toContain("<language>");
	});

	it("uses the stable fallback only when the feed is empty", () => {
		const fallback = new Date("2026-01-01T00:00:00.000Z");
		const olderItem = {
			title: "Old",
			summary: "Old",
			url: "https://example.com/old/",
			published: new Date("2025-01-01T00:00:00.000Z"),
			updated: new Date("2025-01-01T00:00:00.000Z"),
			categories: [],
		};

		expect(getFeedUpdated([], fallback)).toBe(fallback);
		expect(getFeedUpdated([olderItem], fallback)).toBe(olderItem.updated);
	});
});
