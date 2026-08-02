import { CATEGORY_PAGE_SIZE } from "@constants/constants";
import {
	getCategoryHubUrl,
	getCategoryPageUrl,
	getCategoryRecommendedUrl,
} from "@/utils/url";
import {
	categoryAssets,
	type CategoryImageAsset,
} from "@/data/category-assets";
import type { PostCardViewModel } from "./core/types";
import { getContentStore } from "./core/content-store";
import { toPostCardViewModel } from "./core/inject";
import { sortByScore } from "./core/sort";
import type { CategorySupportViewModel } from "./category-page";
import {
	sortByRecentActivity,
	toSupportCategoryLink,
	toSupportPostLink,
	toSupportTagLink,
	type SupportPostLink,
	type SupportTaxonomyLink,
} from "./support";

export type CategoryHubView = "all" | "recommended";

export type CategoryHubTab = {
	id: CategoryHubView;
	label: string;
	url: string;
};

export type CategoryHubCard = {
	slug: string;
	name: string;
	url: string;
	count: number;
	tagCount: number;
	description?: string;
	image?: CategoryImageAsset;
	updated?: string;
	tags: SupportTaxonomyLink[];
	recentPosts: SupportPostLink[];
};

export type CategoryHubPageViewModel = {
	activeView: CategoryHubView;
	title: string;
	description: string;
	tabs: CategoryHubTab[];
	categories: CategoryHubCard[];
	posts: PostCardViewModel[];
	support: CategorySupportViewModel;
};

const CATEGORY_HUB_TAG_LIMIT = 5;
const CATEGORY_HUB_RECENT_LIMIT = 3;
const CATEGORY_HUB_SUPPORT_MODULES = [
	"recentPosts",
	"tags",
] satisfies CategorySupportViewModel["modules"];
const CATEGORY_HUB_SUPPORT_RECENT_POST_LIMIT = 5;
const CATEGORY_HUB_SUPPORT_CATEGORY_LIMIT = 8;
const CATEGORY_HUB_SUPPORT_TAG_LIMIT = 8;

function buildCategoryHubTabs(): CategoryHubTab[] {
	return [
		{
			id: "all",
			label: "全部分类",
			url: getCategoryHubUrl(),
		},
		{
			id: "recommended",
			label: "推荐",
			url: getCategoryRecommendedUrl(),
		},
	];
}

async function buildCategoryHubPageViewModel(
	activeView: CategoryHubView,
): Promise<CategoryHubPageViewModel> {
	const store = await getContentStore();
	const categories = store.categories.map((category) => {
		const entry = store.categoryMap.get(category.slug);
		const sortedRecentPosts = sortByRecentActivity(entry?.posts ?? []);
		const latestPost = sortedRecentPosts[0];
		const tags = (entry ? Array.from(entry.tags.values()) : category.tags)
			.slice()
			.sort((a, b) => b.count - a.count)
			.slice(0, CATEGORY_HUB_TAG_LIMIT)
			.map((tag) => toSupportTagLink(tag, category.slug));
		const recentPosts = sortedRecentPosts
			.slice(0, CATEGORY_HUB_RECENT_LIMIT)
			.map(toSupportPostLink);
		const link = toSupportCategoryLink(category);
		const asset = categoryAssets[category.slug];

		return {
			slug: category.slug,
			name: category.name,
			url: link.url || getCategoryPageUrl(category.slug),
			count: category.count,
			tagCount: entry?.tags.size ?? category.tags.length,
			description: asset?.description,
			image: asset?.image,
			updated: latestPost
				? (latestPost.updated ?? latestPost.published).toISOString()
				: undefined,
			tags,
			recentPosts,
		};
	});
	const posts =
		activeView === "recommended"
			? sortByScore(store.posts)
					.slice(0, CATEGORY_PAGE_SIZE)
					.map(toPostCardViewModel)
			: [];
	const supportTags = Array.from(store.categoryMap.values())
		.flatMap((entry) =>
			Array.from(entry.tags.values()).map((tag) =>
				toSupportTagLink(tag, entry.category.slug),
			),
		)
		.sort((a, b) => b.count - a.count)
		.slice(0, CATEGORY_HUB_SUPPORT_TAG_LIMIT);

	return {
		activeView,
		title: activeView === "recommended" ? "推荐" : "全部分类",
		description:
			activeView === "recommended"
				? "按推荐分展示值得优先阅读的文章。"
				: "按主题浏览文章，进入具体分类后可继续按标签筛选。",
		tabs: buildCategoryHubTabs(),
		categories,
		posts,
		support: {
			modules: [...CATEGORY_HUB_SUPPORT_MODULES],
			recentPosts: sortByRecentActivity(store.posts)
				.slice(0, CATEGORY_HUB_SUPPORT_RECENT_POST_LIMIT)
				.map(toSupportPostLink),
			categories: store.categories
				.slice(0, CATEGORY_HUB_SUPPORT_CATEGORY_LIMIT)
				.map(toSupportCategoryLink),
			tags: supportTags,
		},
	};
}

export async function getCategoryHubPageViewModel(): Promise<CategoryHubPageViewModel> {
	return buildCategoryHubPageViewModel("all");
}

export async function getCategoryRecommendedPageViewModel(): Promise<CategoryHubPageViewModel> {
	return buildCategoryHubPageViewModel("recommended");
}
