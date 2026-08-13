import { describe, expect, it } from "vitest";

import {
	getMemosBaseUrl,
	renderDiaryMoments,
	transformMemosToDiary,
	type Memo,
} from "@/components/modules/diary/memos";

const baseMemo: Memo = {
	state: "NORMAL",
	createTime: "2026-01-01T00:00:00Z",
	content: "hello",
	visibility: "PUBLIC",
	tags: [],
	attachments: [],
};

describe("diary memos", () => {
	it("derives the attachment file base URL from a Memos API URL", () => {
		expect(getMemosBaseUrl("https://memos.example.com/api/v1/memos")).toBe(
			"https://memos.example.com",
		);
	});

	it("filters public normal memos and sorts pinned entries first", () => {
		const moments = transformMemosToDiary(
			[
				{
					...baseMemo,
					createTime: "2026-01-01T00:00:00Z",
					content: "older",
				},
				{
					...baseMemo,
					createTime: "2026-01-02T00:00:00Z",
					content: "private",
					visibility: "PRIVATE",
				},
				{
					...baseMemo,
					createTime: "2026-01-03T00:00:00Z",
					content: "pinned",
					pinned: true,
				},
				{
					...baseMemo,
					createTime: "2026-01-04T00:00:00Z",
					content: "archived",
					state: "ARCHIVED",
				},
			],
			"https://memos.example.com",
		);

		expect(moments.map((moment) => moment.content)).toEqual([
			"pinned",
			"older",
		]);
	});

	it("maps only image attachments to diary images", () => {
		const moments = transformMemosToDiary(
			[
				{
					...baseMemo,
					attachments: [
						{
							name: "resources/one",
							filename: "photo.webp",
							type: "image/webp",
						},
						{
							name: "resources/two",
							filename: "note.txt",
							type: "text/plain",
						},
					],
				},
			],
			"https://memos.example.com",
		);

		expect(moments[0]?.images).toEqual([
			"https://memos.example.com/file/resources/one/photo.webp",
		]);
	});

	it("renders the same diary card data contract for dynamic entries", () => {
		const html = renderDiaryMoments(
			[
				{
					id: 1,
					content: "<unsafe>",
					date: "2026-01-01T00:00:00Z",
					tags: ["life"],
					images: ["/image.jpg"],
				},
			],
			{
				labels: {
					minutesAgo: "m",
					hoursAgo: "h",
					daysAgo: "d",
				},
				timeZone: 0,
			},
		);

		expect(html).toContain('class="moment-card');
		expect(html).toContain('data-tags="life"');
		expect(html).toContain('class="diary-images');
		expect(html).toContain('href="/image.jpg"');
		expect(html).toContain('data-fancybox="diary-0"');
		expect(html).toContain("&lt;unsafe&gt;");
	});
});
