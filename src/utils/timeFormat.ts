export interface RelativeTimeLabels {
	minutesAgo: string;
	hoursAgo: string;
	daysAgo: string;
}

export function formatRelativeTime(
	dateString: string,
	labels: RelativeTimeLabels,
	timeZone: number = 8,
	now: Date = new Date(),
): string {
	const normalizedTimeZone = timeZone >= -12 && timeZone <= 12 ? timeZone : 8;
	const date = new Date(dateString);
	const diffInMinutes = Math.floor(
		(now.getTime() + normalizedTimeZone * 60 * 60 * 1000 - date.getTime()) /
			(1000 * 60),
	);

	if (diffInMinutes < 60) {
		return `${diffInMinutes}${labels.minutesAgo}`;
	}

	if (diffInMinutes < 1440) {
		return `${Math.floor(diffInMinutes / 60)}${labels.hoursAgo}`;
	}

	return `${Math.floor(diffInMinutes / 1440)}${labels.daysAgo}`;
}
