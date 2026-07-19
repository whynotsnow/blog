import type { GetStaticPathsItem, Page } from "astro";
import { CATEGORY_PAGE_SIZE } from "@constants/constants";
import { toPostCardViewModel } from "./core/inject";
import { getContentStore } from "./core/content-store";
import { sortByScore } from "./core/sort";
import type {
	ContentStore,
	PostCardViewModel,
	PostIndexEntry,
	PostNavigatorCategory,
} from "./core/types";

export type CategoryPageProps = {
	posts: PostCardViewModel[];
	allPosts: PostCardViewModel[];
	page: Page<PostCardViewModel>;
	categorySlug: string;
	categories: PostNavigatorCategory[];
	store: ContentStore;
};

function buildCategoryPage(
	allPosts: PostCardViewModel[],
	slug: string,
	currentPage: number,
): Page<PostCardViewModel> {
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
	sortedPosts: PostIndexEntry[];
	slug: string;
	currentPage: number;
	categories: PostNavigatorCategory[];
	store: ContentStore;
}): CategoryPageProps {
	const { sortedPosts, slug, currentPage, categories, store } = params;
	const allPosts = sortedPosts.map(toPostCardViewModel);
	const page = buildCategoryPage(allPosts, slug, currentPage);

	return {
		posts: page.data,
		allPosts,
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
		const paginatedPageCount = Math.max(0, lastPageNumber - 1);

		return Array.from({ length: paginatedPageCount }, (_, index) => {
			const currentPage = index + 2;

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
