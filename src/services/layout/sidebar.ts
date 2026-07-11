import type { SiteConfig } from "@/types/config";
import type { WidgetManager } from "@/utils/widget-manager";

export type SidebarLayoutViewModel = {
	defaultPostListLayout: "list" | "grid";
	desktopShowSidebar: boolean;
	desktopShowLeftSidebar: boolean;
	desktopShowRightSidebar: boolean;
	mobileShowSidebar: boolean;
	tabletShowSidebar: boolean;
	hasMobileDrawerComponents: boolean;
	hasRightSidebarComponents: boolean;
	gridCols: string;
	leftSidebarClass: string;
	rightSidebarClass: string;
	mainContentClass: string;
};

function compactClass(value: string) {
	return value.trim().replace(/\s+/g, " ");
}

export function buildSidebarLayoutViewModel(
	config: SiteConfig,
	manager: WidgetManager,
): SidebarLayoutViewModel {
	const hasLeftSidebarComponents =
		manager.getComponentsByPosition("top", "left", "desktop").length > 0 ||
		manager.getComponentsByPosition("sticky", "left", "desktop").length > 0;

	const hasRightSidebarComponents =
		manager.getComponentsByPosition("top", "right", "desktop").length > 0 ||
		manager.getComponentsByPosition("sticky", "right", "desktop").length >
			0;

	const hasMobileDrawerComponents =
		manager.getComponentsByPosition("top", "drawer", "mobile").length > 0 ||
		manager.getComponentsByPosition("sticky", "drawer", "mobile").length >
			0;

	const hasTabletLeftSidebarComponents =
		manager.getComponentsByPosition("top", "left", "tablet").length > 0 ||
		manager.getComponentsByPosition("sticky", "left", "tablet").length > 0;

	const desktopShowLeftSidebar = hasLeftSidebarComponents;
	const desktopShowRightSidebar = hasRightSidebarComponents;
	const desktopShowSidebar =
		desktopShowLeftSidebar || desktopShowRightSidebar;
	const mobileShowSidebar = hasMobileDrawerComponents;
	const tabletShowSidebar = hasTabletLeftSidebarComponents;
	const defaultPostListLayout = config.postListLayout?.defaultMode || "list";

	let desktopGridCols = "lg:grid-cols-1";
	if (desktopShowLeftSidebar && desktopShowRightSidebar) {
		desktopGridCols = "lg:grid-cols-[17.5rem_1fr_17.5rem]";
	} else if (desktopShowLeftSidebar) {
		desktopGridCols = "lg:grid-cols-[17.5rem_1fr]";
	} else if (desktopShowRightSidebar) {
		desktopGridCols = "lg:grid-cols-[1fr_17.5rem]";
	}

	const gridCols = compactClass(`
		grid-cols-1
		md:grid-cols-[1fr_17.5rem]
		${desktopGridCols}
	`);

	const rightSidebarClass = compactClass(`
		hidden
		md:block md:mb-4 md:max-w-[17.5rem]
		${
			desktopShowRightSidebar
				? `lg:block lg:mb-4 lg:row-start-1 lg:row-end-2 lg:max-w-[17.5rem] ${
						desktopShowLeftSidebar
							? "lg:col-start-3 lg:col-end-4"
							: "lg:col-start-2 lg:col-end-3"
					} lg:col-span-1`
				: "lg:hidden"
		}
		${defaultPostListLayout === "grid" ? "hidden-in-grid-mode" : ""}
	`);

	const leftSidebarClass = compactClass(`
		block
		md:hidden
		${
			desktopShowLeftSidebar
				? "lg:block lg:mb-4 lg:row-start-1 lg:row-end-2 lg:max-w-[17.5rem] lg:col-span-1"
				: "lg:hidden"
		}
	`);

	let desktopMainPos = "lg:col-span-1";
	if (desktopShowLeftSidebar && desktopShowRightSidebar) {
		desktopMainPos = "lg:col-start-2 lg:col-end-3";
	} else if (desktopShowLeftSidebar) {
		desktopMainPos = "lg:col-start-2 lg:col-end-3";
	} else if (desktopShowRightSidebar) {
		desktopMainPos = "lg:col-start-1 lg:col-end-2";
	}

	const mainContentClass = compactClass(`
		transition-swup-fade overflow-hidden w-full
		col-span-1 row-start-1 row-end-2
		md:col-start-1 md:col-end-2
		${desktopShowSidebar ? desktopMainPos : "lg:col-span-1"}
	`);

	return {
		defaultPostListLayout,
		desktopShowSidebar,
		desktopShowLeftSidebar,
		desktopShowRightSidebar,
		mobileShowSidebar,
		tabletShowSidebar,
		hasMobileDrawerComponents,
		hasRightSidebarComponents,
		gridCols,
		leftSidebarClass,
		rightSidebarClass,
		mainContentClass,
	};
}
