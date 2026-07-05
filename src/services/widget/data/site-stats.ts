import { siteConfig } from "@/config";
import type {
	BaseSlug,
	ListPost,
	PostNavigatorCategory,
} from "@/services/core/types";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

export interface StatItem {
	icon: string;
	label: string;
	value: number;
	formatted?: boolean;
	suffix?: string;
	dynamic?: boolean;
	id?: string;
}

export interface SiteStatsWidgetData {
	stats: StatItem[];
	lastPostDate: string | null;
	siteStartDate: string;
}

export function calculateTotalWords(posts: ListPost[]): number {
	let totalWords = 0;

	const cjkPattern =
		/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]/g;

	for (const post of posts) {
		if (!post.body) continue;

		let text = post.body;

		text = text.replace(/```[\s\S]*?```/g, "");
		text = text.replace(/`[^`]+`/g, "");

		const cjkMatches = text.match(cjkPattern);
		const cjkCount = cjkMatches ? cjkMatches.length : 0;

		const nonCjkText = text.replace(cjkPattern, " ");

		const nonCjkWords = nonCjkText
			.split(/\s+/)
			.filter((word) => word.trim().length > 0);

		totalWords += cjkCount + nonCjkWords.length;
	}

	return totalWords;
}

export function buildSiteStats({
	posts,
	categories,
	tags,
	totalWords,
}: {
	posts: ListPost[];
	categories: PostNavigatorCategory[];
	tags: BaseSlug[];
	totalWords: number;
}): StatItem[] {
	return [
		{
			icon: "material-symbols:article-outline",
			label: i18n(I18nKey.siteStatsPostCount),
			value: posts.length,
		},
		{
			icon: "material-symbols:folder-outline",
			label: i18n(I18nKey.siteStatsCategoryCount),
			value: categories.length,
		},
		{
			icon: "material-symbols:label-outline",
			label: i18n(I18nKey.siteStatsTagCount),
			value: tags.length,
		},
		{
			icon: "material-symbols:text-ad-outline-rounded",
			label: i18n(I18nKey.siteStatsTotalWords),
			value: totalWords,
			formatted: true,
		},
		{
			icon: "material-symbols:calendar-clock-outline",
			label: i18n(I18nKey.siteStatsRunningDays),
			value: 0,
			suffix: i18n(I18nKey.siteStatsDays).replace("{days}", ""),
			dynamic: true,
			id: "running-days",
		},
		{
			icon: "material-symbols:ecg-heart-outline",
			label: i18n(I18nKey.siteStatsLastUpdate),
			value: 0,
			suffix: i18n(I18nKey.siteStatsDaysAgo).replace("{days}", ""),
			dynamic: true,
			id: "last-update",
		},
	];
}

export function buildSiteStatsWidgetData({
	posts,
	categories,
	tags,
}: {
	posts: ListPost[];
	categories: PostNavigatorCategory[];
	tags: BaseSlug[];
}): SiteStatsWidgetData {
	const totalWords = calculateTotalWords(posts);
	const latestPost = posts.reduce((latest, post) => {
		if (!latest) return post;
		return post.data.published > latest.data.published ? post : latest;
	}, posts[0]);

	return {
		lastPostDate: latestPost
			? latestPost.data.published.toISOString()
			: null,
		siteStartDate: siteConfig.siteStartDate || "2025-01-01",
		stats: buildSiteStats({
			posts,
			categories,
			tags,
			totalWords,
		}),
	};
}
