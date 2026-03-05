import Categories from "@components/widget/Categories.astro";
import Tags from "@components/widget/Tags.astro";
import Profile from "@components/widget/Profile.astro";
import Announcement from "@components/widget/Announcement.astro";
import SiteStats from "@components/widget/SiteStats.astro";
import TOC from "@components/widget/TOC.astro";
import Calendar from "@components/widget/Calendar.astro";

import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { MarkdownHeading } from "astro";
import type {
	ContentStore,
	ListPost,
	PostNavigatorCategory,
} from "../core/types";
import type { Props as SiteStatsProps } from "@components/widget/SiteStats.astro";
import type { Props as CategoriesProps } from "@components/widget/Categories.astro";
import type { Props as TagsProps } from "@components/widget/Tags.astro";
import type { Props as TocProps } from "@components/widget/TOC.astro";
import type { Props as ProfileProps } from "@components/widget/Profile.astro";
import type { Props as AnnouncementProps } from "@components/widget/Announcement.astro";
import type { Props as CalendarProps } from "@components/widget/Calendar.astro";

import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { siteConfig } from "@/config";

export interface SidebarContext {
	store: ContentStore;
	headings?: MarkdownHeading[];
}

/**
 * 每个组件最终渲染所需结构
 */
export interface ResolvedWidget<TProps> {
	component: AstroComponentFactory;
	props: TProps;
}

export interface StatItem {
	icon: string;
	label: string;
	value: number;
	formatted?: boolean;
	suffix?: string;
	dynamic?: boolean;
	id?: string;
}

export interface CalendarPost {
	id: string;
	title: string;
	date: string; // yyyy-mm-dd
}

export interface CalendarData {
	posts: CalendarPost[];
	postDateMap: Record<string, CalendarPost[]>;
	postsByMonth: Record<string, CalendarPost[]>;
	stats: {
		hasPostInYear: Record<number, boolean>;
		hasPostInMonth: Record<string, boolean>;
		minYear: number;
		maxYear: number;
	};
}

/**
 * 所有 widget 类型映射
 */
export type WidgetComponentMap = {
	"site-stats": ResolvedWidget<SiteStatsProps>;
	categories: ResolvedWidget<CategoriesProps>;
	tags: ResolvedWidget<TagsProps>;
	toc: ResolvedWidget<TocProps>;
	profile: ResolvedWidget<ProfileProps>;
	calendar: ResolvedWidget<CalendarProps>;
	announcement: ResolvedWidget<AnnouncementProps>;
};

export type Tag = {
	name: string;
	count: number;
};

/**
 * 计算总字数
 */
function calculateTotalWords(posts: ListPost[]): number {
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

/**
 * 构建 SiteStats 展示数据
 */
function buildSiteStats({
	posts,
	categories,
	tags,
	totalWords,
}: {
	posts: ListPost[];
	categories: PostNavigatorCategory[];
	tags: Tag[];
	totalWords: number;
}) {
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

function buildCalendarData(posts: ListPost[]): CalendarData {
	const calendarPosts: CalendarPost[] = [];
	const postDateMap: Record<string, CalendarPost[]> = {};
	const postsByMonth: Record<string, CalendarPost[]> = {};

	const stats = {
		hasPostInYear: {} as Record<number, boolean>,
		hasPostInMonth: {} as Record<string, boolean>,
		minYear: new Date().getFullYear(),
		maxYear: new Date().getFullYear() + 5,
	};

	posts.forEach((post) => {
		const date = new Date(post.data.published);
		const year = date.getFullYear();
		const month = date.getMonth(); // 0-11
		const day = date.getDate();

		const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
		const monthKey = `${year}-${month}`;

		const item = {
			id: post.id,
			title: post.data.title,
			date: dateKey,
		};

		calendarPosts.push(item);

		if (!postDateMap[dateKey]) postDateMap[dateKey] = [];
		postDateMap[dateKey].push(item);

		if (!postsByMonth[monthKey]) postsByMonth[monthKey] = [];
		postsByMonth[monthKey].push(item);

		stats.hasPostInYear[year] = true;
		stats.hasPostInMonth[`${year}-${month + 1}`] = true;

		if (year < stats.minYear) stats.minYear = year;
	});

	return {
		posts: calendarPosts,
		postDateMap,
		postsByMonth,
		stats,
	};
}

/**
 * 统一构建组件 Map
 */
export function getWidgetComponentMap(ctx: SidebarContext): WidgetComponentMap {
	const { categories, posts } = ctx.store;
	const tags: Tag[] = categories.flatMap((category) =>
		category.tags.map((tag) => ({
			name: tag.name,
			count: tag.count,
		})),
	);

	// 计算总字数
	const totalWords = calculateTotalWords(posts);

	// 获取最新文章
	const latestPost = posts.reduce((latest, post) => {
		if (!latest) return post;
		return post.data.published > latest.data.published ? post : latest;
	}, posts[0]);

	const lastPostDate = latestPost
		? latestPost.data.published.toISOString()
		: null;

	const stats = buildSiteStats({
		posts,
		categories,
		tags,
		totalWords,
	});

	return {
		"site-stats": {
			component: SiteStats,
			props: {
				lastPostDate,
				siteStartDate: siteConfig.siteStartDate || "2025-01-01",
				stats,
			},
		},

		categories: {
			component: Categories,
			props: {
				categories,
			},
		},
		tags: {
			component: Tags,
			props: {
				tags,
			},
		},

		toc: {
			component: TOC,
			props: {
				headings: ctx.headings ?? [],
			},
		},

		calendar: {
			component: Calendar,
			props: {
				calendarData: buildCalendarData(posts),
			},
		},

		profile: {
			component: Profile,
			props: {},
		},

		announcement: {
			component: Announcement,
			props: {},
		},
	};
}
