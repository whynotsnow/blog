import type { GetStaticPaths } from "astro";
import { PAGE_SIZE } from "@/constants/constants";
import { sortByScore } from "@/services/core/sort";
import { CategoryEntry } from "../core/types";
import { getContentStore } from "../core/content-store";

export const getCategoryPaginatedStaticPaths: GetStaticPaths = async ({
	paginate,
}) => {
	// 一次性构建全部数据
	const { categoryMap, categories } = await getContentStore();

	// 为每个分类生成分页路径
	return Array.from(categoryMap.entries()).flatMap(([slug, entry]) => {
		const sorted = sortByScore(entry.posts);
		const categoryAllPosts = categoryMap.get(slug) as CategoryEntry;
		return paginate(sorted, {
			pageSize: PAGE_SIZE,
			params: { slug },
			props: {
				categorySlug: slug,
				categories,
				categoryAllPosts,
			},
		});
	});
};
