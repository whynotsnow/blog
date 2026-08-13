import { getCollection, getEntry } from "astro:content";
import type { PostIndexBuildResult, PostQuery, RawPost } from "./types";
import { buildPostIndexEntries } from "./inject";
import { applyPostQuery, sortByDate } from "./sort";
import { buildPostRouteIndex, validatePostRoutes } from "./post-routes";

export async function getAllPostsRaw(): Promise<RawPost[]> {
	const posts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	// 路由合法性在内容进入索引前验证，避免下游服务拿到不可发布的 canonical URL。
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

export async function buildPostIndex(
	query: PostQuery = { sort: "score" },
): Promise<PostIndexBuildResult> {
	const rawPosts = await getAllPostsRaw();
	const sortedPosts = sortByDate(rawPosts);
	// routes 与 indexedPosts 基于同一份排序后的 rawPosts 构建，保证 route 引用身份一致。
	const routes = buildPostRouteIndex(
		sortedPosts.map((post) => ({
			id: post.id,
			filePath: post.filePath,
			alias: post.data.alias,
		})),
	);
	const indexedPosts = buildPostIndexEntries(sortedPosts, routes);

	return { posts: applyPostQuery(indexedPosts, query), routes };
}
