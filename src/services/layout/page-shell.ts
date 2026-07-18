import { siteConfig } from "@/config";
import { BANNER_HEIGHT_EXTEND } from "@/constants/constants";
import { defaultFavicons } from "@/constants/icon";
import type { Favicon } from "@/types/config";
import { pathsEqual, url } from "@/utils/url-utils";

export const LAYOUT_BANNER_HEIGHT = 35;
export const LAYOUT_BANNER_HEIGHT_EXTEND = 30;
export const LAYOUT_BANNER_HEIGHT_HOME =
	LAYOUT_BANNER_HEIGHT + LAYOUT_BANNER_HEIGHT_EXTEND;

export interface LayoutPageShellInput {
	title?: string;
	description?: string;
	banner?: string;
	lang?: string;
	postSlug?: string;
	canonicalUrl?: string;
	pathname: string;
	site?: URL;
}

export interface LayoutPageShellModel {
	banner: string;
	bodyFontFamily: string;
	configHue: number;
	canonicalUrl: string;
	description?: string;
	enableBanner: boolean;
	favicons: Favicon[];
	isHomePage: boolean;
	ogImageUrl?: string;
	pageTitle: string;
	shouldShowTopHighlight: boolean;
	siteLang: string;
	bannerOffset: string;
}

export function getDefaultBanner(): string {
	const src = siteConfig.banner.src;
	if (typeof src === "string") {
		return src;
	}
	if (Array.isArray(src)) {
		return src[0] || "";
	}
	if (src && typeof src === "object") {
		const desktopSrc = src.desktop;
		const mobileSrc = src.mobile;
		if (typeof desktopSrc === "string") {
			return desktopSrc;
		}
		if (Array.isArray(desktopSrc) && desktopSrc.length > 0) {
			return desktopSrc[0];
		}
		if (typeof mobileSrc === "string") {
			return mobileSrc;
		}
		if (Array.isArray(mobileSrc) && mobileSrc.length > 0) {
			return mobileSrc[0];
		}
	}
	return "";
}

function buildPageTitle(title?: string) {
	if (title) {
		return `${title} - ${siteConfig.title}`;
	}
	return siteConfig.subtitle
		? `${siteConfig.title} - ${siteConfig.subtitle}`
		: siteConfig.title;
}

function buildOgImageUrl(postSlug: string | undefined, site: URL | undefined) {
	if (!siteConfig.generateOgImages || !postSlug || !site) return undefined;
	return new URL(`/og/${postSlug}.png`, site).toString();
}

function buildCanonicalUrl(input: LayoutPageShellInput): string {
	const canonicalPath = input.canonicalUrl ?? input.pathname;
	return input.site
		? new URL(canonicalPath, input.site).toString()
		: canonicalPath;
}

function buildSiteLang(lang?: string) {
	return (lang || siteConfig.lang).replace("_", "-");
}

function buildBodyFontFamily() {
	if (!siteConfig.font) return "";

	const fonts: string[] = [];
	if (siteConfig.font.asciiFont?.fontFamily) {
		const asciiFont = siteConfig.font.asciiFont.fontFamily;
		fonts.push(asciiFont.includes(" ") ? `"${asciiFont}"` : asciiFont);
	}
	if (siteConfig.font.cjkFont?.fontFamily) {
		const cjkFont = siteConfig.font.cjkFont.fontFamily;
		fonts.push(cjkFont.includes(" ") ? `"${cjkFont}"` : cjkFont);
	}
	fonts.push(
		"system-ui",
		"-apple-system",
		"BlinkMacSystemFont",
		"'Segoe UI'",
		"Roboto",
		"Oxygen",
		"Ubuntu",
		"Cantarell",
		"'Open Sans'",
		"'Helvetica Neue'",
		"sans-serif",
	);

	return fonts.join(", ");
}

function getBannerOffset() {
	const bannerOffsetByPosition = {
		top: `${BANNER_HEIGHT_EXTEND}vh`,
		center: `${BANNER_HEIGHT_EXTEND / 2}vh`,
		bottom: "0",
	};
	return bannerOffsetByPosition[siteConfig.banner.position || "center"];
}

export function buildLayoutPageShellModel(
	input: LayoutPageShellInput,
): LayoutPageShellModel {
	const navbarTransparentMode =
		siteConfig.banner?.navbar?.transparentMode || "semi";

	return {
		banner: getDefaultBanner(),
		bodyFontFamily: buildBodyFontFamily(),
		canonicalUrl: buildCanonicalUrl(input),
		configHue: siteConfig.themeColor.hue,
		description: input.description,
		enableBanner: !!siteConfig.banner.src,
		favicons:
			siteConfig.favicon.length > 0
				? siteConfig.favicon
				: defaultFavicons,
		isHomePage: pathsEqual(input.pathname, url("/")),
		ogImageUrl: buildOgImageUrl(input.postSlug, input.site),
		pageTitle: buildPageTitle(input.title),
		shouldShowTopHighlight:
			navbarTransparentMode === "full" ||
			navbarTransparentMode === "semifull",
		siteLang: buildSiteLang(input.lang),
		bannerOffset: getBannerOffset(),
	};
}
