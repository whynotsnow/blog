import { HOME_SECTION_SIZE } from "@constants/constants";
import { toUIPost } from "./core/inject";
import type { ContentStore, UIPost } from "./core/types";
import { getContentStore } from "./core/content-store";

export interface HomePostSection {
	id: string;
	title: string;
	href: string;
	linkLabel: string;
	posts: UIPost[];
}

export interface HomePageViewModel {
	sections: HomePostSection[];
	store: ContentStore;
}

export async function getHomePageViewModel(): Promise<HomePageViewModel> {
	const store = await getContentStore();
	const recommended = store.posts.slice(0, HOME_SECTION_SIZE).map(toUIPost);
	const recent = [...store.posts]
		.sort(
			(a, b) =>
				(b.data.updated ?? b.data.published).getTime() -
				(a.data.updated ?? a.data.published).getTime(),
		)
		.slice(0, HOME_SECTION_SIZE)
		.map(toUIPost);
	const technology = store.posts
		.slice(HOME_SECTION_SIZE, HOME_SECTION_SIZE * 2)
		.map(toUIPost);

	return {
		store,
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
			{
				id: "technology",
				title: "技术文章",
				href: "/category/technology/",
				linkLabel: "查看技术文章",
				posts: technology,
			},
		],
	};
}
