import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { WidgetType } from "./registry";

export type WidgetPosition = "flow" | "sticky";

export type WidgetInstanceConfig = {
	id: string;
	type: WidgetType;
	position: WidgetPosition;
	class?: string;
	style?: string;
	animationDelay?: number;
	collapseThreshold?: number;
	props?: Record<string, unknown>;
};

export type WidgetPlacementConfig = {
	desktop?: {
		left?: WidgetInstanceConfig[];
		right?: WidgetInstanceConfig[];
		sidebar?: WidgetInstanceConfig[];
	};
	tablet?: { sidebar?: WidgetInstanceConfig[] };
	mobile?: {
		beforeContent?: WidgetInstanceConfig[];
		afterContent?: WidgetInstanceConfig[];
	};
};

export type WidgetPlacementName = "default" | "home" | "category" | "post";

export type ResolvedWidget = WidgetInstanceConfig & {
	component: AstroComponentFactory;
	resolvedProps: Record<string, unknown>;
	className: string;
	resolvedStyle?: string;
};

export type ResolvedWidgetPlacement = {
	desktop: {
		left: ResolvedWidget[];
		right: ResolvedWidget[];
		sidebar: ResolvedWidget[];
	};
	tablet: { sidebar: ResolvedWidget[] };
	mobile: { beforeContent: ResolvedWidget[]; afterContent: ResolvedWidget[] };
};
