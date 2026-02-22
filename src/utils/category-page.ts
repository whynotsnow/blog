import { getSortedPosts } from "@/utils/content-utils";
import { initPostIdMap } from "@/utils/permalink-utils";
import { createFallbackCategory, getCategoryByName } from "@utils/url-utils";
import { CollectionEntry } from "astro:content";

export interface CategoryEntry {
	category: {
		name: string;
		slug: string;
		isFallback?: boolean;
	};
	posts: CollectionEntry<"posts">[];
}

export async function buildCategoryIndex() {
	const allPosts = await getSortedPosts();
	initPostIdMap(allPosts);

	const map = new Map<string, CategoryEntry>();

	for (const post of allPosts) {
		const name = post.data.category;
		if (!name) continue;

		let category = getCategoryByName(name);
		if (!category) {
			category = createFallbackCategory(name);
		}

		const existed = map.get(category.slug);

		if (!existed) {
			map.set(category.slug, {
				category,
				posts: [post],
			});
			continue;
		}

		// slug 已存在，检测冲突
		if (existed.category.name !== category.name) {
			console.warn(
				`[category] slug conflict: "${category.slug}" used by "${existed.category.name}" and "${category.name}"`,
			);
		}

		existed.posts.push(post);
	}

	return map;
}

interface CategoryPostIndex {
	slug: string; // 用于跳转
	title: string;
	date: string;
	tags: string[];
	description?: string; // 可选
	cover?: string; // 可选
}

export function getCategoryPosts(id: string): CategoryPostIndex[] {
	const el = document.getElementById(id);
	if (!el?.textContent) return [];
	return JSON.parse(el.textContent);
}
