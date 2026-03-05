import { PAGE_SIZE } from "@constants/constants";
import { getAllPosts } from "./core/source";
import { toUIPost } from "./core/inject";
import type { PostNavigatorCategory, UIPost } from "./core/types";
import { getContentStore } from "./core/content-store";

export async function getHomeList(): Promise<{
	posts: UIPost[];
	categories: PostNavigatorCategory[];
}> {
	const { posts, categories } = await getContentStore();

	const uiPosts = await Promise.all(posts.map(toUIPost));

	const sliced = uiPosts.slice(0, PAGE_SIZE);
	return { posts: sliced, categories };
}
