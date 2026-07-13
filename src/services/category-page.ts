import type { GetStaticPathsItem, Page } from "astro";
import { CATEGORY_PAGE_SIZE } from "@constants/constants";
import { toUIPost } from "./core/inject";
import { getContentStore } from "./core/content-store";
import { sortByScore } from "./core/sort";
import type {
	ContentStore,
	ListPost,
	PostNavigatorCategory,
	UIPost,
} from "./core/types";

export type CategoryPageProps = {
	posts: UIPost[];
	allPosts: UIPost[];
	page: Page<ListPost>;
	categorySlug: string;
	categories: PostNavigatorCategory[];
	store: ContentStore;
};

function buildCategoryPage(
	allPosts: ListPost[],
	slug: string,
	currentPage: number,
): Page<ListPost> {
	const lastPageNumber = Math.ceil(allPosts.length / CATEGORY_PAGE_SIZE);
	const start = (currentPage - 1) * CATEGORY_PAGE_SIZE;
	const end = start + CATEGORY_PAGE_SIZE;

	return {
		data: allPosts.slice(start, end),
		start,
		end: Math.min(end, allPosts.length),
		size: CATEGORY_PAGE_SIZE,
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

function buildCategoryPageProps(params: {
	sortedPosts: ListPost[];
	slug: string;
	currentPage: number;
	categories: PostNavigatorCategory[];
	store: ContentStore;
}): CategoryPageProps {
	const { sortedPosts, slug, currentPage, categories, store } = params;
	const page = buildCategoryPage(sortedPosts, slug, currentPage);

	return {
		posts: page.data.map(toUIPost),
		allPosts: sortedPosts.map(toUIPost),
		page,
		categorySlug: slug,
		categories,
		store,
	};
}

export async function getCategoryIndexStaticPaths(): Promise<
	GetStaticPathsItem[]
> {
	const store = await getContentStore();
	const { categoryMap, categories } = store;

	return Array.from(categoryMap.entries()).map(([slug, entry]) => {
		const sortedPosts = sortByScore(entry.posts);

		return {
			params: { slug },
			props: buildCategoryPageProps({
				sortedPosts,
				slug,
				currentPage: 1,
				categories,
				store,
			}),
		};
	});
}

export async function getCategoryPaginatedStaticPaths(): Promise<
	GetStaticPathsItem[]
> {
	const store = await getContentStore();
	const { categoryMap, categories } = store;

	return Array.from(categoryMap.entries()).flatMap(([slug, entry]) => {
		const sortedPosts = sortByScore(entry.posts);
		const lastPageNumber = Math.ceil(
			sortedPosts.length / CATEGORY_PAGE_SIZE,
		);

		return Array.from({ length: lastPageNumber }, (_, index) => {
			const currentPage = index + 1;

			return {
				params: { slug, page: String(currentPage) },
				props: buildCategoryPageProps({
					sortedPosts,
					slug,
					currentPage,
					categories,
					store,
				}),
			};
		});
	});
}
