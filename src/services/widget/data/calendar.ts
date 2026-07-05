import type { CalendarPostData } from "@/services/calendar";

export interface CalendarWidgetData {
	posts: CalendarPostData[];
	postDateMap: Record<string, CalendarPostData[]>;
	postsByMonth: Record<string, CalendarPostData[]>;
	stats: {
		hasPostInYear: Record<number, boolean>;
		hasPostInMonth: Record<string, boolean>;
		minYear: number;
		maxYear: number;
	};
}

export function buildCalendarWidgetData(
	posts: CalendarPostData[],
): CalendarWidgetData {
	const postDateMap: Record<string, CalendarPostData[]> = {};
	const postsByMonth: Record<string, CalendarPostData[]> = {};

	const stats = {
		hasPostInYear: {} as Record<number, boolean>,
		hasPostInMonth: {} as Record<string, boolean>,
		minYear: new Date().getFullYear(),
		maxYear: new Date().getFullYear() + 5,
	};

	posts.forEach((post) => {
		const date = new Date(post.date);
		const year = date.getFullYear();
		const month = date.getMonth();
		const monthKey = `${year}-${month}`;

		if (!postDateMap[post.date]) postDateMap[post.date] = [];
		postDateMap[post.date].push(post);

		if (!postsByMonth[monthKey]) postsByMonth[monthKey] = [];
		postsByMonth[monthKey].push(post);

		stats.hasPostInYear[year] = true;
		stats.hasPostInMonth[`${year}-${month + 1}`] = true;

		if (year < stats.minYear) stats.minYear = year;
	});

	return {
		posts,
		postDateMap,
		postsByMonth,
		stats,
	};
}
