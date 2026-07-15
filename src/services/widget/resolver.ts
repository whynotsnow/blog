import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { BaseSlug, ContentStore } from "../core/types";
import type { Props as CategoriesProps } from "@components/taxonomy/CategoriesPanel.astro";
import type { Props as TagsProps } from "@components/taxonomy/TagsPanel.astro";
import type { Props as ProfileProps } from "@components/profile/ProfileCard.astro";
import { widgetComponentRegistry } from "./registry";
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
	profile: ResolvedWidgetDefinition<ProfileProps>;
};

export function getWidgetComponentMap(ctx: SidebarContext): WidgetComponentMap {
	const { categories } = ctx.store;
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

		profile: {
			component: widgetComponentRegistry.profile,
			props: {},
		},
	};
}
