import { HOME_SECTION_SIZE } from "@constants/constants";
import { CATEGORY_SLUGS } from "@/config";
import { getCategoryPageUrl } from "@/utils/url";
import { toPostCardViewModel } from "./core/inject";
import type { PostCardViewModel } from "./core/types";
import { getContentStore } from "./core/content-store";
import { sortByScore } from "./core/sort";

export interface HomePostSection {
	id: string;
	title: string;
	href: string;
	linkLabel: string;
	posts: PostCardViewModel[];
}

export interface HomePageViewModel {
	sections: HomePostSection[];
}

export async function getHomePageViewModel(): Promise<HomePageViewModel> {
	const store = await getContentStore();
	const recommended = store.posts
		.slice(0, HOME_SECTION_SIZE)
		.map(toPostCardViewModel);
	const recent = [...store.posts]
		.sort(
			(a, b) =>
				(b.updated ?? b.published).getTime() -
				(a.updated ?? a.published).getTime(),
		)
		.slice(0, HOME_SECTION_SIZE)
		.map(toPostCardViewModel);
	const technology = sortByScore(
		store.categoryMap.get(CATEGORY_SLUGS.technology)?.posts ?? [],
	)
		.slice(0, HOME_SECTION_SIZE)
		.map(toPostCardViewModel);
	const technologySection: HomePostSection[] = technology.length
		? [
				{
					id: "technology",
					title: "技术文章",
					href: getCategoryPageUrl(CATEGORY_SLUGS.technology),
					linkLabel: "查看技术文章",
					posts: technology,
				},
			]
		: [];

	return {
		sections: [
			{
				id: "recent",
				title: "最近更新",
				href: "/archive/?sort=updated",
				linkLabel: "查看最近更新",
				posts: recent,
			},
			{
				id: "recommended",
				title: "推荐阅读",
				href: "/archive/",
				linkLabel: "查看全部文章",
				posts: recommended,
			},
			...technologySection,
		],
	};
}
