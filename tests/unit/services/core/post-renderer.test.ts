import { describe, expect, it, vi } from "vitest";

vi.mock("astro:content", () => ({ render: vi.fn() }));

import { createPostRenderRegistry } from "@/services/core/post-renderer";
import type { RawPost } from "@/services/core/types";

const post = { id: "post", collection: "posts" } as RawPost;

describe("post render registry", () => {
	it("shares the in-flight render for the same entry", async () => {
		const renderEntry = vi.fn().mockResolvedValue({ headings: [] });
		const registry = createPostRenderRegistry(renderEntry, (task) =>
			task(),
		);

		const [first, second] = await Promise.all([
			registry.get(post),
			registry.get(post),
		]);

		expect(first).toBe(second);
		expect(renderEntry).toHaveBeenCalledTimes(1);
	});

	it("re-renders sequential requests after a successful render", async () => {
		const renderEntry = vi.fn().mockResolvedValue({ headings: [] });
		const registry = createPostRenderRegistry(renderEntry, (task) =>
			task(),
		);

		await registry.get(post);
		await registry.get(post);

		expect(renderEntry).toHaveBeenCalledTimes(2);
	});

	it("evicts a rejected render so it can be retried", async () => {
		const renderEntry = vi
			.fn()
			.mockRejectedValueOnce(new Error("render failed"))
			.mockResolvedValueOnce({ headings: [] });
		const registry = createPostRenderRegistry(renderEntry, (task) =>
			task(),
		);

		await expect(registry.get(post)).rejects.toThrow("render failed");
		await expect(registry.get(post)).resolves.toMatchObject({
			headings: [],
		});
		expect(renderEntry).toHaveBeenCalledTimes(2);
	});

	it("does not let an older render evict a newer in-flight render", async () => {
		let resolveFirst: (value: { headings: never[] }) => void = () => {};
		let resolveSecond: (value: { headings: never[] }) => void = () => {};
		const firstResult = { headings: [] };
		const secondResult = { headings: [] };
		const renderEntry = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveFirst = resolve;
					}),
			)
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveSecond = resolve;
					}),
			);
		const registry = createPostRenderRegistry(renderEntry, (task) =>
			task(),
		);

		const first = registry.get(post);
		registry.clear();
		const second = registry.get(post);
		resolveFirst(firstResult);
		await expect(first).resolves.toBe(firstResult);

		const sharedSecond = registry.get(post);
		expect(sharedSecond).toBe(second);
		expect(renderEntry).toHaveBeenCalledTimes(2);

		resolveSecond(secondResult);
		await expect(second).resolves.toBe(secondResult);
	});
});
