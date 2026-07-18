import { getCollection } from "astro:content";
import type { ListPost, PostQuery, RawPost } from "./types";
import {
	injectListMeta,
	injectNavigationMeta,
	injectSystemMeta,
} from "./inject";
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

export async function getAllPosts(
	query: PostQuery = { sort: "score" },
): Promise<ListPost[]> {
	const rawPosts = await getAllPostsRaw();

	const sortedPosts = sortByDate(rawPosts);

	const systemPosts = injectSystemMeta(sortedPosts);

	const listPosts = await injectListMeta(systemPosts);

	const routes = buildPostRouteIndex(
		listPosts.map((post) => ({
			id: post.id,
			filePath: post.filePath,
			alias: post.data.alias,
		})),
	);
	const navPosts = injectNavigationMeta(listPosts, routes);

	return applyPostQuery(navPosts, query);
}
