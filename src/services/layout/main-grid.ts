import { getBannerImages, type BannerImages } from "@/services/banner";
import type { SiteConfig } from "@/types/config";
import { getFooterViewModel, type FooterViewModel } from "@/services/footer";
import { resolvePageLayout } from "./resolver";
import type {
	PageInteractionPolicy,
	PageLayoutPolicyName,
	ResolvedPageLayout,
} from "./types";

export type MainGridLayoutViewModel = {
	bannerImages: BannerImages;
	pageLayout: ResolvedPageLayout;
	interaction: PageInteractionPolicy;
	footer: FooterViewModel;
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
	const isCategoryPage = pathname.startsWith("/category/");
	const isPostPage = pathname.startsWith("/posts/");
	const keepsBannerOnContentPage =
		layoutPolicy === "listing" || layoutPolicy === "post";
	const mobileNonHomeClass =
		!isHomePage && !keepsBannerOnContentPage ? "mobile-hide-banner" : "";
	const transparentClass =
		config.wallpaperMode.defaultMode === "fullscreen"
			? "wallpaper-transparent"
			: "";
	const [bannerImages, footer] = await Promise.all([
		getBannerImages(config),
		getFooterViewModel(),
	]);

	return {
		bannerImages,
		footer,
		pageLayout: resolvePageLayout(layoutPolicy),
		interaction: {
			navbar: isHomePage ? "banner-aware" : "fixed-visible",
			entryScroll: isCategoryPage || isPostPage ? "content-start" : "top",
		},
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
