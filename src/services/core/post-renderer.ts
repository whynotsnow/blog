import { render } from "astro:content";
import { runPostBuildTask, type TaskRunner } from "./concurrency";
import type { RawPost } from "./types";

export type RenderedPost = Awaited<ReturnType<typeof render>>;
export type RenderPost = (entry: RawPost) => Promise<RenderedPost>;
export type PostRenderRegistry = {
	get(entry: RawPost): Promise<RenderedPost>;
	clear(): void;
};

export function createPostRenderRegistry(
	renderEntry: RenderPost,
	runTask: TaskRunner,
): PostRenderRegistry {
	const inFlight = new Map<string, Promise<RenderedPost>>();

	return {
		get(entry: RawPost): Promise<RenderedPost> {
			const cached = inFlight.get(entry.id);
			if (cached) return cached;

			const rendered = runTask(() => renderEntry(entry)).then(
				(result) => {
					if (inFlight.get(entry.id) === rendered) {
						inFlight.delete(entry.id);
					}
					return result;
				},
				(error: unknown) => {
					if (inFlight.get(entry.id) === rendered) {
						inFlight.delete(entry.id);
					}
					throw error;
				},
			);
			inFlight.set(entry.id, rendered);
			return rendered;
		},
		clear(): void {
			inFlight.clear();
		},
	};
}

const registry: PostRenderRegistry = createPostRenderRegistry(
	render,
	runPostBuildTask,
);

export const getRenderedPost: PostRenderRegistry["get"] = registry.get;
export const _clearPostRenderCache: PostRenderRegistry["clear"] =
	registry.clear;

if (import.meta.hot) {
	import.meta.hot.dispose(_clearPostRenderCache);
}
