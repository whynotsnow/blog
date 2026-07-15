import { siteConfig } from "@/config";
import type { ContentStore } from "@/services/core/types";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type FooterStatItem = {
	id: "posts" | "words" | "running-days" | "last-update";
	label: string;
	value: number;
	formatted?: boolean;
	suffix?: string;
};

export type FooterViewModel = {
	statsLabel: string;
	stats: FooterStatItem[];
	siteStartDate: string;
	lastActivityDate: string | null;
	traffic: {
		pageViewsLabel: string;
		visitsLabel: string;
	};
};

function daysSince(date: Date, now: Date): number {
	return Math.max(
		0,
		Math.floor((now.getTime() - date.getTime()) / DAY_IN_MS),
	);
}

function runningDaysSince(date: Date, now: Date): number {
	return Math.max(0, Math.ceil((now.getTime() - date.getTime()) / DAY_IN_MS));
}

function getLastActivityDate(store: ContentStore): Date | null {
	return store.posts.reduce<Date | null>((latest, post) => {
		const activityDate = post.data.updated ?? post.data.published;
		return !latest || activityDate > latest ? activityDate : latest;
	}, null);
}

export function buildFooterViewModel(
	store: ContentStore,
	now = new Date(),
): FooterViewModel {
	const siteStartDate = siteConfig.siteStartDate || "2025-01-01";
	const startDate = new Date(siteStartDate);
	const lastActivityDate = getLastActivityDate(store);
	const totalWords = store.posts.reduce(
		(total, post) => total + post.meta.words,
		0,
	);

	return {
		statsLabel: i18n(I18nKey.siteStats),
		siteStartDate,
		lastActivityDate: lastActivityDate?.toISOString() ?? null,
		stats: [
			{
				id: "posts",
				label: i18n(I18nKey.siteStatsPostCount),
				value: store.posts.length,
			},
			{
				id: "words",
				label: i18n(I18nKey.siteStatsTotalWords),
				value: totalWords,
				formatted: true,
			},
			{
				id: "running-days",
				label: i18n(I18nKey.siteStatsRunningDays),
				value: runningDaysSince(startDate, now),
				suffix: i18n(I18nKey.siteStatsDays).replace("{days}", ""),
			},
			{
				id: "last-update",
				label: i18n(I18nKey.siteStatsLastUpdate),
				value: lastActivityDate ? daysSince(lastActivityDate, now) : 0,
				suffix: i18n(I18nKey.siteStatsDaysAgo).replace("{days}", ""),
			},
		],
		traffic: {
			pageViewsLabel: i18n(I18nKey.profileStatsPageViews),
			visitsLabel: i18n(I18nKey.profileStatsVisits),
		},
	};
}
