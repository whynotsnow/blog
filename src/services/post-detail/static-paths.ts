import type { ListPost, PostRoute, PostRouteIndex } from "../core/types";

export type CanonicalPostPath = {
	entry: ListPost;
	route: PostRoute;
};

export function buildCanonicalPostPaths(
	posts: readonly ListPost[],
	routes: PostRouteIndex,
): CanonicalPostPath[] {
	return posts.map((entry) => {
		const route = routes.byId.get(entry.id);
		if (!route) throw new Error(`Missing post route for ${entry.id}`);
		return { entry, route };
	});
}
