import { getCategoryHubUrl, getCategoryPageUrl } from "@/utils/url";
import type { PostCardViewModel } from "./core/types";
import { getContentStore } from "./core/content-store";
import {
	sortByRecentActivity,
	toSupportCategoryLink,
	toSupportPostLink,
	toSupportTagLink,
	type SupportPostLink,
	type SupportTaxonomyLink,
} from "./support";

export type CategoryHubView = "all";

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
};

const CATEGORY_HUB_TAG_LIMIT = 5;
const CATEGORY_HUB_RECENT_LIMIT = 3;

function buildCategoryHubTabs(): CategoryHubTab[] {
	return [
		{
			id: "all",
			label: "全部分类",
			url: getCategoryHubUrl(),
		},
	];
}

export async function getCategoryHubPageViewModel(): Promise<CategoryHubPageViewModel> {
	const store = await getContentStore();
	const categories = store.categories.map((category) => {
		const entry = store.categoryMap.get(category.slug);
		const tags = (entry ? Array.from(entry.tags.values()) : category.tags)
			.slice()
			.sort((a, b) => b.count - a.count)
			.slice(0, CATEGORY_HUB_TAG_LIMIT)
			.map((tag) => toSupportTagLink(tag, category.slug));
		const recentPosts = sortByRecentActivity(entry?.posts ?? [])
			.slice(0, CATEGORY_HUB_RECENT_LIMIT)
			.map(toSupportPostLink);
		const link = toSupportCategoryLink(category);

		return {
			slug: category.slug,
			name: category.name,
			url: link.url || getCategoryPageUrl(category.slug),
			count: category.count,
			tags,
			recentPosts,
		};
	});

	return {
		activeView: "all",
		title: "全部分类",
		description: "按主题浏览文章，进入具体分类后可继续按标签筛选。",
		tabs: buildCategoryHubTabs(),
		categories,
		posts: [],
	};
}
