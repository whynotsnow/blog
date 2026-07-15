import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { MarkdownHeading } from "astro";
import type { BaseSlug, ContentStore } from "../core/types";
import type { Props as CategoriesProps } from "@components/widget/Categories.astro";
import type { Props as TagsProps } from "@components/widget/Tags.astro";
import type { Props as TocProps } from "@components/widget/TOC.astro";
import type { Props as ProfileProps } from "@components/widget/Profile.astro";
import type { Props as CalendarProps } from "@components/widget/Calendar.astro";
import { buildCalendarPosts } from "@/services/calendar";
import { widgetComponentRegistry } from "./registry";
import { buildCalendarWidgetData } from "./data/calendar";
import { widgetPlacementPresets } from "./presets";
import { resolveWidgetClass, resolveWidgetStyle } from "./presentation";
import type {
	ResolvedWidget,
	ResolvedWidgetPlacement,
	WidgetInstanceConfig,
	WidgetPlacementName,
} from "./types";

export interface SidebarContext {
	store: ContentStore;
	headings?: MarkdownHeading[];
}

function resolveWidget(
	instance: WidgetInstanceConfig,
	index: number,
	map: WidgetComponentMap,
): ResolvedWidget | null {
	const definition = map[instance.type];
	if (!definition) return null;
	return {
		...instance,
		component: definition.component,
		resolvedProps: {
			...(definition.props as Record<string, unknown>),
			collapseThreshold: instance.collapseThreshold,
			...instance.props,
		},
		className: resolveWidgetClass(instance),
		resolvedStyle: resolveWidgetStyle(instance, index),
	};
}

function resolveList(
	instances: WidgetInstanceConfig[] | undefined,
	map: WidgetComponentMap,
): ResolvedWidget[] {
	return (instances ?? [])
		.map((instance, index) => resolveWidget(instance, index, map))
		.filter((widget): widget is ResolvedWidget => widget !== null);
}

export function resolveWidgetPlacement(
	name: WidgetPlacementName,
	ctx: SidebarContext,
): ResolvedWidgetPlacement {
	const preset: import("./types").WidgetPlacementConfig =
		widgetPlacementPresets[name];
	const map = getWidgetComponentMap(ctx);
	return {
		desktop: {
			left: resolveList(preset.desktop?.left, map),
			right: resolveList(preset.desktop?.right, map),
			sidebar: resolveList(preset.desktop?.sidebar, map),
		},
		supporting: {
			beforeContent: resolveList(preset.supporting?.beforeContent, map),
		},
		mobile: {
			beforeContent: resolveList(preset.mobile?.beforeContent, map),
			afterContent: resolveList(preset.mobile?.afterContent, map),
		},
	};
}

export interface ResolvedWidgetDefinition<TProps> {
	component: AstroComponentFactory;
	props: TProps;
}

export type WidgetComponentMap = {
	categories: ResolvedWidgetDefinition<CategoriesProps>;
	tags: ResolvedWidgetDefinition<TagsProps>;
	toc: ResolvedWidgetDefinition<TocProps>;
	profile: ResolvedWidgetDefinition<ProfileProps>;
	calendar: ResolvedWidgetDefinition<CalendarProps>;
};

export function getWidgetComponentMap(ctx: SidebarContext): WidgetComponentMap {
	const { categories, posts } = ctx.store;
	const tags: BaseSlug[] = categories.flatMap((category) => category.tags);

	return {
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
	};
}
