import { render } from "astro:content";
import { runPostBuildTask, type TaskRunner } from "./concurrency";
import type { RawPost } from "./types";

export type RenderedPost = Awaited<ReturnType<typeof render>>;
export type RenderPost = (entry: RawPost) => Promise<RenderedPost>;

export function createPostRenderRegistry(
	renderEntry: RenderPost,
	runTask: TaskRunner,
) {
	const cache = new Map<string, Promise<RenderedPost>>();

	return {
		get(entry: RawPost): Promise<RenderedPost> {
			const cached = cache.get(entry.id);
			if (cached) return cached;

			const rendered = runTask(() => renderEntry(entry)).catch(
				(error: unknown) => {
					cache.delete(entry.id);
					throw error;
				},
			);
			cache.set(entry.id, rendered);
			return rendered;
		},
		clear(): void {
			cache.clear();
		},
	};
}

const registry = createPostRenderRegistry(render, runPostBuildTask);

export const getRenderedPost = registry.get;
export const _clearPostRenderCache = registry.clear;

if (import.meta.hot) {
	import.meta.hot.dispose(_clearPostRenderCache);
}
