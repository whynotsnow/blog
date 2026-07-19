import type { GetStaticPathsItem, ImageMetadata } from "astro";
import { CATEGORY_PAGE_SIZE } from "@constants/constants";
import { url } from "@utils/url-utils";
import { toPostCardViewModel } from "./core/inject";
import { getContentStore } from "./core/content-store";
import { sortByScore } from "./core/sort";
import type {
	PostCardViewModel,
	PostIndexEntry,
	PostNavigatorCategory,
} from "./core/types";

export type CategoryPageProps = {
	posts: PostCardViewModel[];
	pagination: CategoryPaginationViewModel;
	categorySlug: string;
	categories: PostNavigatorCategory[];
	tagIndexUrl: string;
};

export type CategoryPaginationViewModel = {
	start: number;
	end: number;
	size: number;
	total: number;
	currentPage: number;
	lastPage: number;
	url: {
		current: string;
		first: string;
		last: string;
		prev?: string;
		next?: string;
	};
};

export type ClientPostCard = {
	id: string;
	url: string;
	title: string;
	summary: string;
	published: string;
	category: {
		name: string;
		url: string;
	};
	tags: Array<{
		slug: string;
		name: string;
		url: string;
	}>;
	words: number;
	pinned: boolean;
	image?: ImageMetadata;
};

export type CategoryTagIndexStaticPathProps = {
	posts: ClientPostCard[];
};

export function toClientPostCard(post: PostIndexEntry): ClientPostCard {
	return {
		id: post.id,
		url: post.route.canonicalUrl,
		title: post.title,
		summary: post.description.trim() || post.excerpt.trim() || post.title,
		published: post.published.toISOString(),
		category: {
			name: post.category.name,
			url: post.category.url,
		},
		tags: post.tags.map(({ slug, name, url }) => ({ slug, name, url })),
		words: post.words,
		pinned: post.pinned,
		image: post.cover,
	};
}

export function buildCategoryTagIndex(
	posts: PostIndexEntry[],
): ClientPostCard[] {
	return sortByScore(posts).map(toClientPostCard);
}

export async function getCategoryTagIndexStaticPaths(): Promise<
	GetStaticPathsItem[]
> {
	const { categoryMap } = await getContentStore();

	return Array.from(categoryMap.entries()).map(([slug, entry]) => ({
		params: { slug },
		props: { posts: buildCategoryTagIndex(entry.posts) },
	}));
}

function buildCategoryPage(
	allPosts: PostCardViewModel[],
	slug: string,
	currentPage: number,
): { posts: PostCardViewModel[]; pagination: CategoryPaginationViewModel } {
	const lastPageNumber = Math.ceil(allPosts.length / CATEGORY_PAGE_SIZE);
	const start = (currentPage - 1) * CATEGORY_PAGE_SIZE;
	const end = start + CATEGORY_PAGE_SIZE;

	return {
		posts: allPosts.slice(start, end),
		pagination: {
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
		},
	};
}

function buildCategoryPageProps(params: {
	sortedPosts: PostIndexEntry[];
	slug: string;
	currentPage: number;
	categories: PostNavigatorCategory[];
}): CategoryPageProps {
	const { sortedPosts, slug, currentPage, categories } = params;
	const allPosts = sortedPosts.map(toPostCardViewModel);
	const { posts, pagination } = buildCategoryPage(
		allPosts,
		slug,
		currentPage,
	);

	return {
		posts,
		pagination,
		categorySlug: slug,
		categories,
		tagIndexUrl: url(`/api/categories/${slug}.json/`),
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
				}),
			};
		});
	});
}
