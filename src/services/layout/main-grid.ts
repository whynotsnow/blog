import { getBannerImages, type BannerImages } from "@/services/banner";
import type { SiteConfig } from "@/types/config";
import { resolvePageLayout } from "./resolver";
import type { PageLayoutPolicyName, ResolvedPageLayout } from "./types";

export type MainGridLayoutViewModel = {
	bannerImages: BannerImages;
	pageLayout: ResolvedPageLayout;
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
		mobileNonHomeClass: string;
		noBannerLayoutClass: string;
		transparentClass: string;
	};
};

export type BuildMainGridLayoutViewModelOptions = {
	config: SiteConfig;
	layoutPolicy: PageLayoutPolicyName;
	pathname: string;
};

export async function buildMainGridLayoutViewModel({
	config,
	layoutPolicy,
	pathname,
}: BuildMainGridLayoutViewModelOptions): Promise<MainGridLayoutViewModel> {
	const tocMode = config.toc.mode || "float";
	const isHomePage = pathname === "/" || pathname === "";
	const mobileNonHomeClass = !isHomePage ? "mobile-hide-banner" : "";
	const transparentClass =
		config.wallpaperMode.defaultMode === "fullscreen"
			? "wallpaper-transparent"
			: "";
	return {
		bannerImages: await getBannerImages(config),
		pageLayout: resolvePageLayout(layoutPolicy),
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
