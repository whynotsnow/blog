import { GetStaticPathsItem, Page } from "astro";
import { toUIPost } from "./core/inject";
import { sortByScore } from "./core/sort";
import { CategoryEntry, ListPost } from "./core/types";
import { getContentStore } from "./core/content-store";
import { PAGE_SIZE } from "@constants/constants";

/**
 * 生成分类分页的元数据对象（page）
 * @param allPosts 该分类下的所有原始文章
 * @param slug 分类标识
 * @param currentPage 当前页码（默认 1）
 * @returns 符合 Astro Page 类型的分页元数据对象
 */
export function generateCategoryPage(
	allPosts: ListPost[],
	slug: string,
	currentPage: number = 1,
): Page<ListPost> {
	const lastPageNumber = Math.ceil(allPosts.length / PAGE_SIZE);

	const start = (currentPage - 1) * PAGE_SIZE;
	const end = start + PAGE_SIZE;

	return {
		data: allPosts.slice(start, end),
		start,
		end: Math.min(end, allPosts.length),
		size: PAGE_SIZE,
		total: allPosts.length,
		currentPage,
		lastPage: lastPageNumber,
		url: {
			current:
				currentPage === 1
					? `/category/${slug}/`
					: `/category/${slug}/page/${currentPage}/`,
			first: `/category/${slug}/`,
			last:
				lastPageNumber > 1
					? `/category/${slug}/page/${lastPageNumber}/`
					: `/category/${slug}/`,
			prev:
				currentPage > 1
					? currentPage === 2
						? `/category/${slug}/`
						: `/category/${slug}/page/${currentPage - 1}/`
					: undefined,
			next:
				currentPage < lastPageNumber
					? `/category/${slug}/page/${currentPage + 1}/`
					: undefined,
		},
	};
}

export async function getCategoryStaticPaths() {
	const { categoryMap, categories } = await getContentStore();

	const paths: GetStaticPathsItem[] = [];

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
