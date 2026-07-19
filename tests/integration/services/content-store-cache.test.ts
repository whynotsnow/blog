import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAllPosts } = vi.hoisted(() => ({
	getAllPosts: vi.fn(),
}));

vi.mock("@/services/core/source", () => ({ getAllPosts }));

import {
	_clearContentStoreCache,
	getContentStore,
} from "@/services/core/content-store";

describe("content store cache", () => {
	beforeEach(() => {
		_clearContentStoreCache();
		getAllPosts.mockReset();
	});

	it("shares one in-flight initialization across concurrent callers", async () => {
		getAllPosts.mockResolvedValue([]);

		const [first, second] = await Promise.all([
			getContentStore(),
			getContentStore(),
		]);

		expect(first).toBe(second);
		expect(getAllPosts).toHaveBeenCalledTimes(1);
	});

	it("drops a rejected initialization so development can retry", async () => {
		getAllPosts
			.mockRejectedValueOnce(new Error("content unavailable"))
			.mockResolvedValueOnce([]);

		await expect(getContentStore()).rejects.toThrow("content unavailable");
		await expect(getContentStore()).resolves.toMatchObject({ posts: [] });
		expect(getAllPosts).toHaveBeenCalledTimes(2);
	});

	it("rebuilds after explicit invalidation", async () => {
		getAllPosts.mockResolvedValue([]);

		await getContentStore();
		_clearContentStoreCache();
		await getContentStore();

		expect(getAllPosts).toHaveBeenCalledTimes(2);
	});
});
