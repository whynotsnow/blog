import type { ContentStore, PostIndexEntry } from "./core/types";

import { buildCalendarPosts } from "./calendar";
import {
	buildArchiveCalendarData,
	type ArchiveCalendarData,
} from "./archive-calendar";

export interface SlugItem {
	name: string;
	slug: string;
	count?: number;
}

export type ArchivePost = {
	id: string;
	url: string;
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
	groups: ArchiveGroup[];
	calendar: ArchiveCalendarData;
};

function toArchivePost(post: PostIndexEntry): ArchivePost {
	const tags: SlugItem[] = post.tags.map((tag) => ({
		name: tag.name,
		slug: tag.slug,
	}));

	const category = post.category.name
		? {
				name: post.category.name,
				slug: post.category.slug,
			}
		: undefined;

	return {
		id: post.id,
		url: post.route.canonicalUrl,
		data: {
			title: post.title,
			tags,
			category,
			published: post.published,
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
	store: ContentStore,
): Promise<ArchivePageData> {
	const { posts } = store;
	const archivePosts = posts.map(toArchivePost);
	const groups = buildArchiveGroups(archivePosts);

	return {
		groups,
		calendar: buildArchiveCalendarData(buildCalendarPosts(posts)),
	};
}
