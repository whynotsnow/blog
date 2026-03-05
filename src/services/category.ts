import { GetStaticPathsResult } from "astro";
import { toUIPost } from "./core/inject";
import { sortByScore } from "./core/sort";
import { generateCategoryPage } from "./core/category-pagination";
import { CategoryEntry } from "./core/types";
import { getContentStore } from "./core/content-store";

export async function getCategoryStaticPaths() {
	const { categoryMap, categories } = await getContentStore();

	const paths: GetStaticPathsResult = [];

	for (const [slug, entry] of categoryMap) {
		const sorted = sortByScore(entry.posts);

		const page = generateCategoryPage(sorted, slug, 1);

		const uiPosts = page.data.map(toUIPost);
		const categoryAllPosts = categoryMap.get(slug) as CategoryEntry;

		paths.push({
			params: { slug },
			props: {
				posts: uiPosts,
				categoryAllPosts,
				page,
				categorySlug: slug,
				categories,
			},
		});
	}

	return paths;
}
