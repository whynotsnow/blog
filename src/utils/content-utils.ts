import type { CollectionEntry } from "astro:content";
import { getPostUrl } from "@utils/url-utils";
import { initPostIdMap } from "@utils/permalink-utils";
import { getContentStore } from "@/services/core/content-store";
import type { ListPost } from "@/services/core/types";

export async function getSortedPosts(): Promise<ListPost[]> {
	const { posts } = await getContentStore();
	return posts;
}

export type PostForList = {
	id: string;
	data: CollectionEntry<"posts">["data"];
	url?: string;
};

export async function getSortedPostsList(): Promise<PostForList[]> {
	const { posts } = await getContentStore();

	initPostIdMap(posts);

	return posts.map((post) => ({
		id: post.id,
		data: post.data,
		url: getPostUrl(post),
	}));
}

export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(): Promise<Tag[]> {
	const { posts } = await getContentStore();
	const countMap: Record<string, number> = {};

	posts.forEach((post) => {
		post.data.tags.forEach((tag) => {
			countMap[tag] = (countMap[tag] ?? 0) + 1;
		});
	});

	const keys = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(): Promise<Category[]> {
	const { categories } = await getContentStore();

	return categories.map((category) => ({
		name: category.name,
		count: category.count,
		url: category.url ?? "",
	}));
}
