import { describe, expect, it, vi } from "vitest";

import {
	applyPostQuery,
	calculateRecommendScore,
	sortByDate,
	sortByScore,
} from "@/services/core/sort";
import type { ListPost, RawPost } from "@/services/core/types";

function listPost(score: number, published: string): ListPost {
	return {
		data: { published: new Date(published) },
		meta: { score },
	} as unknown as ListPost;
}

describe("content sorting", () => {
	it("sorts scores without mutating the source", () => {
		const posts = [listPost(2, "2025-01-02"), listPost(9, "2025-01-01")];

		expect(sortByScore(posts).map((post) => post.meta.score)).toEqual([
			9, 2,
		]);
		expect(posts.map((post) => post.meta.score)).toEqual([2, 9]);
	});

	it("sorts dates in either direction", () => {
		const posts = [listPost(1, "2025-01-02"), listPost(2, "2025-01-01")];

		expect(sortByDate(posts).map((post) => post.meta.score)).toEqual([
			2, 1,
		]);
		expect(
			sortByDate(posts, "desc").map((post) => post.meta.score),
		).toEqual([1, 2]);
	});

	it("applies the requested query sorter", () => {
		const posts = [listPost(2, "2025-01-02"), listPost(9, "2025-01-01")];

		expect(applyPostQuery(posts, { sort: "score" })[0].meta.score).toBe(9);
	});

	it("combines recommendation inputs deterministically", () => {
		vi.setSystemTime(new Date("2025-01-11T00:00:00.000Z"));
		const post = {
			data: {
				published: new Date("2025-01-01T00:00:00.000Z"),
				pinned: true,
				priority: 2,
				recommendScore: 3,
			},
		} as unknown as RawPost;

		expect(calculateRecommendScore(post)).toBe(1527);
		vi.useRealTimers();
	});
});
