import {
	HOME_CATEGORY_SECTION_SIZE,
	HOME_FEATURED_SECTION_SIZE,
} from "@constants/constants";
import {
	getCategoryHubUrl,
	getCategoryRecentUrl,
	getCategoryRecommendedUrl,
} from "@/utils/url";
import { buildCategoryCards, type CategoryHubCard } from "./category-hub";
import { toPostCardViewModel } from "./core/inject";
import type { PostCardViewModel } from "./core/types";
import { getContentStore } from "./core/content-store";
import {
	buildGlobalDiscoveryCards,
	toSupportTagLink,
	type GlobalDiscoveryCardViewModel,
	type SupportTaxonomyLink,
} from "./support";

export interface HomePostSection {
	id: string;
	title: string;
	href: string;
	linkLabel: string;
	posts: PostCardViewModel[];
}

export interface HomePageViewModel {
	sections: HomePostSection[];
	categorySection: HomeCategorySection;
	support: HomeSupportViewModel;
}

export interface HomeCategorySection {
	id: string;
	title: string;
	href: string;
	linkLabel: string;
	categories: CategoryHubCard[];
}

export interface HomeSupportViewModel {
	stats: {
		postCount: number;
		categoryCount: number;
		tagCount: number;
		totalWords: number;
	};
	discoveryCards: GlobalDiscoveryCardViewModel[];
	tags: SupportTaxonomyLink[];
}

export async function getHomePageViewModel(): Promise<HomePageViewModel> {
	const store = await getContentStore();
	const recommended = store.posts
		.slice(0, HOME_FEATURED_SECTION_SIZE)
		.map(toPostCardViewModel);
	const recent = [...store.posts]
		.sort(
			(a, b) =>
				(b.updated ?? b.published).getTime() -
				(a.updated ?? a.published).getTime(),
		)
		.slice(0, HOME_FEATURED_SECTION_SIZE)
		.map(toPostCardViewModel);
	const categories = buildCategoryCards(store).slice(
		0,
		HOME_CATEGORY_SECTION_SIZE,
	);
	const allTagLinks = Array.from(store.categoryMap.values()).flatMap(
		(entry) =>
			Array.from(entry.tags.values()).map((tag) =>
				toSupportTagLink(tag, entry.category.slug),
			),
	);
	const tagLinks = allTagLinks
		.slice()
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	return {
		sections: [
			{
				id: "recent",
				title: "最近更新",
				href: getCategoryRecentUrl(),
				linkLabel: "更多",
				posts: recent,
			},
			{
				id: "recommended",
				title: "推荐阅读",
				href: getCategoryRecommendedUrl(),
				linkLabel: "更多",
				posts: recommended,
			},
		],
		categorySection: {
			id: "categories",
			title: "文章分类",
			href: getCategoryHubUrl(),
			linkLabel: "全部分类",
			categories,
		},
		support: {
			stats: {
				postCount: store.stats.postCount,
				categoryCount: store.categories.length,
				tagCount: allTagLinks.length,
				totalWords: store.stats.totalWords,
			},
			discoveryCards: buildGlobalDiscoveryCards({
				posts: store.posts,
				categories: store.categories,
				include: ["recent", "category"],
			}),
			tags: tagLinks,
		},
	};
}
