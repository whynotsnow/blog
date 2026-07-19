import type { PostIndexEntry, PostRoute, PostRouteIndex } from "../core/types";

export type CanonicalPostPath = {
	entry: PostIndexEntry;
	route: PostRoute;
};

export type PostDetailStaticPathItem = {
	params: { slug: string };
	props: { postId: string };
};

export function buildCanonicalPostPaths(
	posts: readonly PostIndexEntry[],
	routes: PostRouteIndex,
): CanonicalPostPath[] {
	return posts.map((entry) => {
		const route = routes.byId.get(entry.id);
		if (!route) throw new Error(`Missing post route for ${entry.id}`);
		return { entry, route };
	});
}

export function buildPostDetailStaticPathItems(
	posts: readonly PostIndexEntry[],
): PostDetailStaticPathItem[] {
	return posts.map((post) => ({
		params: { slug: post.route.canonicalSlug },
		props: { postId: post.id },
	}));
}
