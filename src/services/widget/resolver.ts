import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { MarkdownHeading } from "astro";
import type { BaseSlug, ContentStore } from "../core/types";
import type { Props as SiteStatsProps } from "@components/widget/SiteStats.astro";
import type { Props as CategoriesProps } from "@components/widget/Categories.astro";
import type { Props as TagsProps } from "@components/widget/Tags.astro";
import type { Props as TocProps } from "@components/widget/TOC.astro";
import type { Props as ProfileProps } from "@components/widget/Profile.astro";
import type { Props as AnnouncementProps } from "@components/widget/Announcement.astro";
import type { Props as CalendarProps } from "@components/widget/Calendar.astro";
import { buildCalendarPosts } from "@/services/calendar";
import { widgetComponentRegistry } from "./registry";
import { buildCalendarWidgetData } from "./data/calendar";
import { buildSiteStatsWidgetData } from "./data/site-stats";

export interface SidebarContext {
	store: ContentStore;
	headings?: MarkdownHeading[];
}

export interface ResolvedWidget<TProps> {
	component: AstroComponentFactory;
	props: TProps;
}

export type WidgetComponentMap = {
	"site-stats": ResolvedWidget<SiteStatsProps>;
	categories: ResolvedWidget<CategoriesProps>;
	tags: ResolvedWidget<TagsProps>;
	toc: ResolvedWidget<TocProps>;
	profile: ResolvedWidget<ProfileProps>;
	calendar: ResolvedWidget<CalendarProps>;
	announcement: ResolvedWidget<AnnouncementProps>;
};

export function getWidgetComponentMap(ctx: SidebarContext): WidgetComponentMap {
	const { categories, posts } = ctx.store;
	const tags: BaseSlug[] = categories.flatMap((category) => category.tags);

	return {
		"site-stats": {
			component: widgetComponentRegistry["site-stats"],
			props: buildSiteStatsWidgetData({
				posts,
				categories,
				tags,
			}),
		},

		categories: {
			component: widgetComponentRegistry.categories,
			props: {
				categories,
			},
		},
		tags: {
			component: widgetComponentRegistry.tags,
			props: {
				tags,
			},
		},

		toc: {
			component: widgetComponentRegistry.toc,
			props: {
				headings: ctx.headings ?? [],
			},
		},

		calendar: {
			component: widgetComponentRegistry.calendar,
			props: {
				calendarData: buildCalendarWidgetData(
					buildCalendarPosts(posts),
				),
			},
		},

		profile: {
			component: widgetComponentRegistry.profile,
			props: {},
		},

		announcement: {
			component: widgetComponentRegistry.announcement,
			props: {},
		},
	};
}
