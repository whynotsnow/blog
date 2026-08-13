import { CATEGORY_PAGE_SIZE } from "@constants/constants";
import {
	getCategoryHubUrl,
	getCategoryPageUrl,
	getCategoryRecentUrl,
	getCategoryRecommendedUrl,
} from "@/utils/url";
import {
	categoryAssets,
	type CategoryImageAsset,
} from "@/data/category-assets";
import type { CategoryTaxonomy, PostCardViewModel } from "./core/types";
import { getContentStore } from "./core/content-store";
import { toPostCardViewModel } from "./core/inject";
import { sortByScore } from "./core/sort";
import type { CategorySupportViewModel } from "./category-page";
import {
	buildGlobalDiscoveryCards,
	sortByRecentActivity,
	toSupportCategoryLink,
	toSupportPostLink,
	toSupportTagLink,
	type SupportPostLink,
	type SupportTaxonomyLink,
} from "./support";

export type CategoryHubView = "all" | "recent" | "recommended";

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
			id: "recent",
			label: "最近更新",
			url: getCategoryRecentUrl(),
		},
		{
			id: "recommended",
			label: "推荐阅读",
			url: getCategoryRecommendedUrl(),
		},
	];
}

async function buildCategoryHubPageViewModel(
	activeView: CategoryHubView,
): Promise<CategoryHubPageViewModel> {
	const store = await getContentStore();
	const categories = buildCategoryCards(store);
	// Hub 的 all 视图只展示分类卡；recent/recommended 才输出文章列表。
	const posts =
		activeView === "all"
			? []
			: (activeView === "recent"
					? sortByRecentActivity(store.posts)
					: sortByScore(store.posts)
				)
					.slice(0, CATEGORY_PAGE_SIZE)
					.map(toPostCardViewModel);
	const supportTags = Array.from(store.categoryMap.values())
		.flatMap((entry) =>
			Array.from(entry.tags.values()).map((tag) =>
				toSupportTagLink(tag, entry.category.slug),
			),
		)
		.sort((a, b) => b.count - a.count)
		.slice(0, CATEGORY_HUB_SUPPORT_TAG_LIMIT);

	// support 复用全局导航结构，但会隐藏当前 Hub 视图对应的发现卡。
	return {
		activeView,
		title:
			activeView === "recommended"
				? "推荐阅读"
				: activeView === "recent"
					? "最近更新"
					: "全部分类",
		description:
			activeView === "recommended"
				? "按推荐分展示值得优先阅读的文章。"
				: activeView === "recent"
					? "按最近活动时间浏览最新更新的文章。"
					: "按主题浏览文章，进入具体分类后可继续按标签筛选。",
		tabs: buildCategoryHubTabs(),
		categories,
		posts,
		support: {
			modules: [...CATEGORY_HUB_SUPPORT_MODULES],
			recentPosts: sortByRecentActivity(store.posts)
				.slice(0, CATEGORY_HUB_SUPPORT_RECENT_POST_LIMIT)
				.map(toSupportPostLink),
			discoveryCards: buildGlobalDiscoveryCards({
				posts: store.posts,
				categories: store.categories,
				current: activeView === "all" ? "category" : activeView,
			}),
			categoryNavigation: {
				featuredLinks: [],
				categories: store.categories
					.slice(0, CATEGORY_HUB_SUPPORT_CATEGORY_LIMIT)
					.map(toSupportCategoryLink),
			},
			tags: supportTags,
		},
	};
}

export function buildCategoryCards(
	taxonomy: CategoryTaxonomy,
): CategoryHubCard[] {
	return taxonomy.categories.map((category) => {
		const entry = taxonomy.categoryMap.get(category.slug);
		// 卡片展示从 taxonomy 派生，不重新扫描内容集合，保持分类统计的单一来源。
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
}

export async function getCategoryHubPageViewModel(): Promise<CategoryHubPageViewModel> {
	return buildCategoryHubPageViewModel("all");
}

export async function getCategoryRecommendedPageViewModel(): Promise<CategoryHubPageViewModel> {
	return buildCategoryHubPageViewModel("recommended");
}

export async function getCategoryRecentPageViewModel(): Promise<CategoryHubPageViewModel> {
	return buildCategoryHubPageViewModel("recent");
}
