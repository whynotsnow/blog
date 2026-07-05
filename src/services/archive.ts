import type { ListPost } from "./core/types";

import { generateCategorySlug, generateTagSlug } from "@utils/url-utils";

export interface SlugItem {
	name: string;
	slug: string;
	count?: number;
}

export type ArchivePost = {
	id: string;
	url?: string;
	data: {
		title: string;
		tags: SlugItem[];
		category?: SlugItem;
		published: Date;
		alias?: string;
	};
};

export interface ArchiveGroup {
	year: number;
	posts: ArchivePost[];
}

export type ArchivePageData = {
	// 默认 archive
	groups: ArchiveGroup[];
};

function toArchivePost(post: ListPost): ArchivePost {
	const tags: SlugItem[] = (post.data.tags ?? []).map((t: string) => ({
		name: t,
		slug: generateTagSlug(t),
	}));

	const category = post.data.category
		? {
				name: post.data.category,
				slug: generateCategorySlug(post.data.category),
			}
		: undefined;

	return {
		id: post.id,
		// url: `/posts/${post.id}/`,
		data: {
			title: post.data.title,
			tags,
			category,
			published: post.data.published,
			alias: post.data.alias,
		},
	};
}

function buildArchiveGroups(posts: ArchivePost[]): ArchiveGroup[] {
	const map: Record<number, ArchivePost[]> = {};

	for (const post of posts) {
		const year = post.data.published.getFullYear();

		if (!map[year]) {
			map[year] = [];
		}

		map[year].push(post);
	}

	return Object.entries(map)
		.map(([year, posts]) => ({
			year: Number(year),
			posts: posts.sort(
				(a, b) =>
					b.data.published.getTime() - a.data.published.getTime(),
			),
		}))
		.sort((a, b) => b.year - a.year);
}

export async function buildArchivePageData(
	posts: ListPost[],
): Promise<ArchivePageData> {
	const archivePosts = posts.map(toArchivePost);
	const groups = buildArchiveGroups(archivePosts);

	return {
		groups,
	};
}
