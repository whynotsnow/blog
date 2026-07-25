import { describe, expect, it, vi } from "vitest";
import {
	buildPostIndexEntries,
	toPostCardViewModel,
} from "@/services/core/inject";
import { buildPostRouteIndex } from "@/services/core/post-routes";
import type { RawPost } from "@/services/core/types";

function rawPost(id: string): RawPost {
	return {
		id,
		collection: "posts",
		filePath: `src/content/posts/${id}.md`,
		body: "This body must stay outside the index.",
		rendered: {
			html: "<p>Rendered body</p>",
			metadata: {
				imagePaths: [],
				frontmatter: {
					words: 42,
					minutes: 2,
					excerpt: "Index excerpt",
				},
			},
		},
		data: {
			title: "Indexed post",
			published: new Date("2026-01-01T00:00:00.000Z"),
			updated: undefined,
			draft: false,
			pinned: false,
			priority: undefined,
			description: "Description",
			image: "",
			author: "",
			lang: "",
			tags: ["Astro"],
			category: "Technology",
			comment: true,
			sourceLink: "",
			licenseName: "",
			licenseUrl: "",
			encrypted: false,
			password: "",
			alias: undefined,
			recommendScore: 0,
			prevTitle: undefined,
			prevSlug: undefined,
			nextTitle: undefined,
			nextSlug: undefined,
		},
	};
}

describe("post index", () => {
	it("extracts list metadata without retaining raw content", () => {
		vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));
		const raw = rawPost("indexed");
		const routes = buildPostRouteIndex([
			{ id: raw.id, filePath: raw.filePath },
		]);

		const [index] = buildPostIndexEntries([raw], routes);

		expect(index).toMatchObject({
			id: "indexed",
			title: "Indexed post",
			category: { name: "技术", slug: "tech", url: "/category/tech/" },
			tags: [
				{
					name: "Astro",
					slug: "astro",
					url: "/category/tech/?tag=astro",
				},
			],
			words: 42,
			minutes: 2,
			excerpt: "Index excerpt",
		});
		expect(index).not.toHaveProperty("body");
		expect(index).not.toHaveProperty("rendered");
		expect(index).not.toHaveProperty("data");
		vi.useRealTimers();
	});

	it("produces a browser DTO without raw or debug-only fields", () => {
		const raw = rawPost("card");
		const routes = buildPostRouteIndex([
			{ id: raw.id, filePath: raw.filePath },
		]);
		const [index] = buildPostIndexEntries([raw], routes);

		const card = toPostCardViewModel(index);

		expect(card.published).toBe("2026-01-01T00:00:00.000Z");
		expect(card).not.toHaveProperty("filePath");
		expect(card).not.toHaveProperty("_dev");
		expect(JSON.parse(JSON.stringify(card))).toEqual(card);
	});
});
