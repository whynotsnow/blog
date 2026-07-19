import { beforeEach, describe, expect, it, vi } from "vitest";

const { buildPostIndex } = vi.hoisted(() => ({
	buildPostIndex: vi.fn(),
}));

vi.mock("@/services/core/source", () => ({ buildPostIndex }));

import {
	_clearContentStoreCache,
	getContentStore,
} from "@/services/core/content-store";

describe("content store cache", () => {
	beforeEach(() => {
		_clearContentStoreCache();
		buildPostIndex.mockReset();
	});

	it("shares one in-flight initialization across concurrent callers", async () => {
		buildPostIndex.mockResolvedValue({
			posts: [],
			routes: { byId: new Map(), bySlug: new Map() },
		});

		const [first, second] = await Promise.all([
			getContentStore(),
			getContentStore(),
		]);

		expect(first).toBe(second);
		expect(buildPostIndex).toHaveBeenCalledTimes(1);
	});

	it("drops a rejected initialization so development can retry", async () => {
		buildPostIndex
			.mockRejectedValueOnce(new Error("content unavailable"))
			.mockResolvedValueOnce({
				posts: [],
				routes: { byId: new Map(), bySlug: new Map() },
			});

		await expect(getContentStore()).rejects.toThrow("content unavailable");
		await expect(getContentStore()).resolves.toMatchObject({ posts: [] });
		expect(buildPostIndex).toHaveBeenCalledTimes(2);
	});

	it("rebuilds after explicit invalidation", async () => {
		buildPostIndex.mockResolvedValue({
			posts: [],
			routes: { byId: new Map(), bySlug: new Map() },
		});

		await getContentStore();
		_clearContentStoreCache();
		await getContentStore();

		expect(buildPostIndex).toHaveBeenCalledTimes(2);
	});
});
