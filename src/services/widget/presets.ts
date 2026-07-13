import type { WidgetPlacementConfig, WidgetPlacementName } from "./types";

const widget = (
	id: string,
	type: Parameters<typeof typedWidget>[1],
	position: "flow" | "sticky",
	extra: Partial<ReturnType<typeof typedWidget>> = {},
) => typedWidget(id, type, position, extra);

function typedWidget(
	id: string,
	type: import("./registry").WidgetType,
	position: "flow" | "sticky",
	extra: Partial<import("./types").WidgetInstanceConfig> = {},
): import("./types").WidgetInstanceConfig {
	return { id, type, position, class: "onload-animation", ...extra };
}

export const widgetPlacementPresets = {
	default: {
		desktop: {
			left: [
				widget("desktop-categories", "categories", "flow", {
					animationDelay: 150,
					collapseThreshold: 5,
				}),
				widget("desktop-tags", "tags", "sticky", {
					animationDelay: 250,
					collapseThreshold: 20,
				}),
				widget("desktop-calendar", "calendar", "flow", {
					animationDelay: 250,
				}),
			],
			right: [
				widget("desktop-profile", "profile", "sticky"),
				widget("desktop-site-stats", "site-stats", "flow", {
					animationDelay: 200,
				}),
			],
		},
		tablet: {
			sidebar: [
				widget("tablet-categories", "categories", "flow", {
					collapseThreshold: 5,
				}),
				widget("tablet-tags", "tags", "sticky", {
					collapseThreshold: 20,
				}),
				widget("tablet-calendar", "calendar", "flow"),
			],
		},
		mobile: {
			beforeContent: [widget("mobile-profile", "profile", "flow")],
		},
	},
	post: {
		desktop: {
			sidebar: [widget("post-desktop-profile", "profile", "sticky")],
		},
		tablet: {
			sidebar: [
				widget("post-tablet-categories", "categories", "flow", {
					collapseThreshold: 5,
				}),
				widget("post-tablet-tags", "tags", "sticky", {
					collapseThreshold: 20,
				}),
			],
		},
		mobile: {
			beforeContent: [widget("post-mobile-profile", "profile", "flow")],
		},
	},
} satisfies Record<WidgetPlacementName, WidgetPlacementConfig>;
