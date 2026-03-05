import type {
	ContentStore,
	CategoryMap,
	ListPost,
	PostNavigatorCategory,
} from "./types";

import { getAllPosts } from "./source";
import { getTagUrl, toSlug } from "@utils/client-utils";
import { getCategoryUrl } from "@utils/url-utils";

/* =========================
   模块级缓存
========================= */

let cachedStore: ContentStore | null = null;

/* =========================
   构建分类索引（纯函数）
========================= */

function buildCategoryTaxonomy(posts: ListPost[]) {
	const map: CategoryMap = new Map();

	for (const post of posts) {
		const rawCategory = post.data.category?.trim() || "Uncategorized";
		const slug = toSlug(rawCategory);

		let entry = map.get(slug);

		if (!entry) {
			entry = {
				category: { name: rawCategory, slug },
				posts: [],
				tags: new Map(),
			};
			map.set(slug, entry);
		}

		entry.posts.push(post);

		for (const tagName of post.data.tags ?? []) {
			const key = tagName.trim();

			if (!entry.tags.has(key)) {
				entry.tags.set(key, { name: key, count: 0 });
			}

			entry.tags.get(key)!.count++;
		}
	}

	const categories: PostNavigatorCategory[] = Array.from(map.values())
		.map((entry) => ({
			slug: entry.category.slug,
			name: entry.category.name,
			count: entry.posts.length,
			url: getCategoryUrl(entry.category.slug),
			tags: Array.from(entry.tags.values())
				.map((tag) => ({
					slug: toSlug(tag.name),
					name: tag.name,
					count: tag.count,
					url: getTagUrl(tag.name),
				}))
				.sort((a, b) => a.name.localeCompare(b.name)),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		categoryMap: map,
		categories,
	};
}

/* =========================
   ContentStore 构建器
========================= */

export function buildContentStore(posts: ListPost[]): ContentStore {
	const taxonomy = buildCategoryTaxonomy(posts);

	return {
		posts,
		...taxonomy,
	};
}

/* =========================
   单例入口（推荐全站使用）
========================= */

export async function getContentStore(): Promise<ContentStore> {
	if (cachedStore) return cachedStore;

	const posts = await getAllPosts();

	cachedStore = buildContentStore(posts);

	if (import.meta.env.DEV) {
		console.log("[contentIndex] built:", {
			posts: posts.length,
			categories: cachedStore.categories.length,
		});
	}

	return cachedStore;
}
