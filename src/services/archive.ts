import { toSlug } from "@utils/client-utils";
import type { ContentStore, ListPost } from "./core/types";
import { getContentStore } from "./core/content-store";

export type ArchivePageData = {
	posts: ArchivePost[];
	tags: string[];
	categories: string[];
	store: ContentStore;
};

export type ArchivePost = {
	id: string;
	url?: string;
	data: {
		title: string;
		tags: string[];
		category?: string;
		published: Date;
		alias?: string;
		permalink?: string;
	};
};

export function toArchivePost(post: ListPost): ArchivePost {
	const tags: string[] = (post.data.tags ?? []).map((t: string) => toSlug(t));
	return {
		id: post.id,
		url: `/posts/${post.id}/`, // url 预计算
		data: {
			title: post.data.title,
			tags,
			category: toSlug(post.data.category),
			published: post.data.published,
			alias: post.data.alias,
			permalink: post.data.permalink,
		},
	};
}

export async function buildArchivePageData(): Promise<ArchivePageData> {
	// 从 core 获取统一数据源
	const store = await getContentStore();
	const { posts, categories } = store;

	const tags = categories.flatMap((c) => c.tags.map((t) => t.name));
	const categorySlug = categories.map((c) => c.slug);
	const postList = posts.map(toArchivePost);

	return {
		posts: postList,
		tags,
		categories: categorySlug,
		store,
	};
}
