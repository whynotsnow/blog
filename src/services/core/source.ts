import { getCollection, getEntry } from "astro:content";
import type { PostIndexEntry, PostQuery, RawPost } from "./types";
import { buildPostIndexEntries } from "./inject";
import { applyPostQuery, sortByDate } from "./sort";
import { buildPostRouteIndex, validatePostRoutes } from "./post-routes";

export async function getAllPostsRaw(): Promise<RawPost[]> {
	const posts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	validatePostRoutes(
		posts.map((post) => ({
			id: post.id,
			filePath: post.filePath,
			alias: post.data.alias,
		})),
	);
	return posts;
}

export async function getRawPostById(id: string): Promise<RawPost> {
	const post = await getEntry("posts", id);
	if (!post) throw new Error(`Missing raw post for ${id}`);
	return post;
}

export async function getAllPosts(
	query: PostQuery = { sort: "score" },
): Promise<PostIndexEntry[]> {
	const rawPosts = await getAllPostsRaw();
	const sortedPosts = sortByDate(rawPosts);
	const routes = buildPostRouteIndex(
		sortedPosts.map((post) => ({
			id: post.id,
			filePath: post.filePath,
			alias: post.data.alias,
		})),
	);
	const indexedPosts = buildPostIndexEntries(sortedPosts, routes);

	return applyPostQuery(indexedPosts, query);
}
