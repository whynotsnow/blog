import { getContentStore } from "@/services/core/content-store";
import type { PostIndexEntry } from "@/services/core/types";

export async function getSortedPosts(): Promise<PostIndexEntry[]> {
	const { posts } = await getContentStore();
	return posts;
}

export type PostForList = {
	id: string;
	title: string;
	url: string;
};

export async function getSortedPostsList(): Promise<PostForList[]> {
	const { posts } = await getContentStore();

	return posts.map((post) => ({
		id: post.id,
		title: post.title,
		url: post.route.canonicalUrl,
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
		post.tags.forEach((tag) => {
			countMap[tag.name] = (countMap[tag.name] ?? 0) + 1;
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
