import { getCollection } from "astro:content";
import type { ListPost, PostQuery, RawPost } from "./types";
import {
	injectListMeta,
	injectNavigationMeta,
	injectSystemMeta,
} from "./inject";
import { applyPostQuery, sortByDate } from "./sort";

export async function getAllPostsRaw(): Promise<RawPost[]> {
	return getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
}

export async function getAllPosts(
	query: PostQuery = { sort: "score" },
): Promise<ListPost[]> {
	const rawPosts = await getAllPostsRaw();

	const sortedPosts = sortByDate(rawPosts);

	const systemPosts = injectSystemMeta(sortedPosts);

	const listPosts = await injectListMeta(systemPosts);

	const navPosts = injectNavigationMeta(listPosts);

	return applyPostQuery(navPosts, query);
}
