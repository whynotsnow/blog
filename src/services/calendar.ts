import { getContentStore } from "./core/content-store";
import type { PostIndexEntry } from "./core/types";

export type CalendarPostData = {
	id: string;
	title: string;
	date: string;
	url: string;
};

export async function getCalendarData(): Promise<CalendarPostData[]> {
	const { posts } = await getContentStore();

	return buildCalendarPosts(posts);
}

export function buildCalendarPosts(
	posts: PostIndexEntry[],
): CalendarPostData[] {
	return posts.map((post) => {
		const date = post.published;
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");

		return {
			id: post.id,
			title: post.title,
			date: `${year}-${month}-${day}`,
			url: post.route.canonicalUrl,
		};
	});
}
