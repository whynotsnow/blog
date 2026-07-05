import { getBannerImages, type BannerImages } from "@/services/banner";
import type { SiteConfig } from "@/types/config";
import type { WidgetManager } from "@/utils/widget-manager";
import { BANNER_HEIGHT } from "@/constants/constants";
import {
	buildSidebarLayoutViewModel,
	type SidebarLayoutViewModel,
} from "./sidebar";

export type MainGridLayoutViewModel = {
	bannerImages: BannerImages;
	sidebarLayout: SidebarLayoutViewModel;
	toc: {
		mode: "float" | "sidebar";
		enable: boolean;
		isFloat: boolean;
		isSidebar: boolean;
		hideSidebarOnLoad: boolean;
	};
	banner: {
		hasCredit: boolean;
		hasCreditLink: boolean;
		isHomePage: boolean;
		showHomeText: boolean | undefined;
		mobileNonHomeClass: string;
		credit: SiteConfig["banner"]["credit"];
	};
	mainPanel: {
		top: string;
		mobileNonHomeClass: string;
		noBannerLayoutClass: string;
		transparentClass: string;
	};
};

export type BuildMainGridLayoutViewModelOptions = {
	config: SiteConfig;
	widgetManager: WidgetManager;
	pathname: string;
};

export async function buildMainGridLayoutViewModel({
	config,
	widgetManager,
	pathname,
}: BuildMainGridLayoutViewModelOptions): Promise<MainGridLayoutViewModel> {
	const tocMode = config.toc.mode || "float";
	const isHomePage = pathname === "/" || pathname === "";
	const mobileNonHomeClass = !isHomePage ? "mobile-hide-banner" : "";
	const transparentClass =
		config.wallpaperMode.defaultMode === "fullscreen"
			? "wallpaper-transparent"
			: "";
	const mainPanelTop =
		config.wallpaperMode.defaultMode === "banner"
			? `${BANNER_HEIGHT}vh`
			: "5.5rem";

	return {
		bannerImages: await getBannerImages(config),
		sidebarLayout: buildSidebarLayoutViewModel(config, widgetManager),
		toc: {
			mode: tocMode,
			enable: config.toc.enable,
			isFloat: tocMode === "float",
			isSidebar: tocMode === "sidebar",
			hideSidebarOnLoad: config.wallpaperMode.defaultMode === "banner",
		},
		banner: {
			hasCredit: config.banner.credit.enable,
			hasCreditLink: !!config.banner.credit.url,
			isHomePage,
			showHomeText: config.banner.homeText?.enable && isHomePage,
			mobileNonHomeClass,
			credit: config.banner.credit,
		},
		mainPanel: {
			top: mainPanelTop,
			mobileNonHomeClass: mobileNonHomeClass
				? "mobile-main-no-banner"
				: "",
			noBannerLayoutClass:
				config.wallpaperMode.defaultMode === "none"
					? "no-banner-layout"
					: "",
			transparentClass,
		},
	};
}
