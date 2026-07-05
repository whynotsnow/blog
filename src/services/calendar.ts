import { getContentStore } from "./core/content-store";

export type CalendarPostData = {
	id: string;
	title: string;
	date: string;
};

export async function getCalendarData(): Promise<CalendarPostData[]> {
	const { posts } = await getContentStore();

	return posts.map((post) => {
		const date = new Date(post.data.published);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");

		return {
			id: post.id,
			title: post.data.title,
			date: `${year}-${month}-${day}`,
		};
	});
}
