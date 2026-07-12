import { sakuraConfig, siteConfig } from "@/config";
import {
	BANNER_HEIGHT_HOME,
	BANNER_HEIGHT_FULLSCREEN,
} from "@/constants/constants";
import { applyLayoutMode, bindLayoutModeEvents } from "@/utils/layout-mode";
import { bindDesktopLayoutPreference } from "@/features/layout-preference/controller";
import { onPageLifecycle } from "@/utils/page-lifecycle";
import { initSakura, stopSakura } from "@/utils/sakura-manager";
import { applyWallpaperVisualSettings } from "@/utils/setting-utils";
import type { WALLPAPER_MODE } from "@/types/config";

const defaultWallpaperMode = siteConfig.wallpaperMode.defaultMode;
const navbarTransparentMode =
	siteConfig.banner?.navbar?.transparentMode || "semi";
let mainGridClientBound = false;

function getWallpaperMode(): WALLPAPER_MODE {
	const stored = localStorage.getItem("wallpaperMode");
	if (
		stored === "banner" ||
		stored === "fullscreen" ||
		stored === "overlay" ||
		stored === "none"
	) {
		return stored;
	}
	return defaultWallpaperMode as WALLPAPER_MODE;
}

function forceReflow() {
	void document.body.offsetHeight;
}

function getMainContent(): HTMLElement | null {
	return document.querySelector(".main-content-layer");
}

function syncMainContentPosition(mode: WALLPAPER_MODE) {
	const mainContent = getMainContent();
	const bannerWrapper = document.getElementById("banner-wrapper");
	if (!mainContent) return;

	const isMobile = window.innerWidth < 1280;
	const isHomePage =
		window.location.pathname === "/" || window.location.pathname === "";

	mainContent.classList.remove("mobile-main-no-banner", "no-banner-layout");
	mainContent.classList.remove("fullscreen-content");

	if (mode === "fullscreen") {
		if (isMobile && !isHomePage) {
			mainContent.classList.add(
				"mobile-main-no-banner",
				"no-banner-layout",
			);
			bannerWrapper?.classList.add("mobile-hide-banner");
			return;
		}

		bannerWrapper?.classList.remove("mobile-hide-banner");
		mainContent.classList.add("fullscreen-content");
		return;
	}

	if (mode === "banner") {
		if (isMobile && !isHomePage) {
			mainContent.classList.add("mobile-main-no-banner");
			bannerWrapper?.classList.add("mobile-hide-banner");
			return;
		}

		bannerWrapper?.classList.remove("mobile-hide-banner");
		return;
	}

	bannerWrapper?.classList.remove("mobile-hide-banner");
	mainContent.classList.add("no-banner-layout");
}

function getStoredBoolean(key: string, fallback: boolean): boolean {
	const stored = localStorage.getItem(key);
	return stored !== null ? stored === "true" : fallback;
}

function applyWavesSetting(
	enabled = getStoredBoolean(
		"wavesEnabled",
		siteConfig.banner?.waves?.enable ?? true,
	),
) {
	document.documentElement.setAttribute(
		"data-waves-enabled",
		String(enabled),
	);
	const waves = document.querySelector(
		'[data-setting-target="banner-waves"]',
	) as HTMLElement | null;
	if (!waves) return;
	waves.style.display = enabled ? "" : "none";
}

function applyBannerTitleSetting(
	enabled = getStoredBoolean(
		"bannerTitleEnabled",
		siteConfig.banner?.homeText?.enable ?? true,
	),
) {
	document.documentElement.setAttribute(
		"data-banner-title-enabled",
		String(enabled),
	);
	const bannerTitle = document.querySelector(
		'[data-setting-target="banner-home-text"]',
	) as HTMLElement | null;
	if (!bannerTitle) return;
	bannerTitle.classList.toggle("hidden", !enabled);
}

function applySakuraSetting(
	enabled = getStoredBoolean("sakuraEnabled", sakuraConfig.enable),
) {
	if (enabled) {
		initSakura({ ...sakuraConfig, enable: true });
	} else {
		stopSakura();
	}
}

function applyInitialPageShell() {
	const wallpaperMode = getWallpaperMode();
	const body = document.body;
	applyWallpaperVisualSettings(wallpaperMode);

	switch (wallpaperMode) {
		case "banner":
			body.classList.add("enable-banner");
			body.classList.remove(
				"wallpaper-transparent",
				"wallpaper-overlay",
				"fullscreen-banner",
				"no-banner-mode",
			);
			break;
		case "fullscreen":
			body.classList.remove(
				"wallpaper-transparent",
				"wallpaper-overlay",
				"no-banner-mode",
			);
			body.classList.add("enable-banner", "fullscreen-banner");
			break;
		case "overlay":
			body.classList.remove("enable-banner");
			body.classList.remove("wallpaper-transparent", "fullscreen-banner");
			body.classList.add("wallpaper-overlay", "no-banner-mode");
			break;
		case "none":
			body.classList.remove(
				"enable-banner",
				"wallpaper-transparent",
				"wallpaper-overlay",
				"fullscreen-banner",
			);
			body.classList.add("no-banner-mode");
			break;
	}

	requestAnimationFrame(() => {
		syncMainContentPosition(wallpaperMode);
		applyLayoutMode();
	});
}

export function applyWallpaperMode() {
	const wallpaperMode = getWallpaperMode();
	const bannerWrapper = document.getElementById("banner-wrapper");
	const fullscreenWallpaper = document.querySelector(
		"[data-fullscreen-wallpaper]",
	) as HTMLElement | null;
	const navbar = document.getElementById("navbar");
	const body = document.body;
	const tocWrapper = document.getElementById("toc-wrapper");
	applyWallpaperVisualSettings(wallpaperMode);
	syncMainContentPosition(wallpaperMode);

	switch (wallpaperMode) {
		case "banner":
			if (bannerWrapper) bannerWrapper.style.display = "block";
			if (fullscreenWallpaper) fullscreenWallpaper.style.display = "none";
			if (tocWrapper) {
				const scrollTop = document.documentElement.scrollTop;
				const bannerHeight =
					window.innerHeight * (BANNER_HEIGHT_HOME / 100);
				if (scrollTop <= bannerHeight) {
					tocWrapper.classList.add("toc-hide");
				}
			}
			body.classList.remove(
				"wallpaper-transparent",
				"wallpaper-overlay",
				"fullscreen-banner",
				"no-banner-mode",
			);
			forceReflow();
			body.classList.add("enable-banner");
			if (navbar) {
				navbar.removeAttribute("data-dynamic-transparent");
				navbar.setAttribute(
					"data-transparent-mode",
					navbarTransparentMode,
				);
				if (
					navbarTransparentMode === "semifull" &&
					window.initSemifullScrollDetection
				) {
					window.initSemifullScrollDetection();
				}
			}
			forceReflow();
			break;

		case "fullscreen":
			if (bannerWrapper) bannerWrapper.style.display = "block";
			if (fullscreenWallpaper) fullscreenWallpaper.style.display = "none";
			if (tocWrapper) {
				const scrollTop = document.documentElement.scrollTop;
				const bannerHeight =
					window.innerHeight * (BANNER_HEIGHT_FULLSCREEN / 100);
				if (scrollTop <= bannerHeight) {
					tocWrapper.classList.add("toc-hide");
				}
			}
			body.classList.remove(
				"wallpaper-transparent",
				"wallpaper-overlay",
				"no-banner-mode",
			);
			forceReflow();
			body.classList.add("enable-banner", "fullscreen-banner");
			if (navbar) {
				navbar.removeAttribute("data-dynamic-transparent");
				navbar.setAttribute(
					"data-transparent-mode",
					navbarTransparentMode,
				);
				if (
					navbarTransparentMode === "semifull" &&
					window.initSemifullScrollDetection
				) {
					window.initSemifullScrollDetection();
				}
			}
			forceReflow();
			break;

		case "overlay":
			if (bannerWrapper) bannerWrapper.style.display = "none";
			if (fullscreenWallpaper)
				fullscreenWallpaper.style.display = "block";
			tocWrapper?.classList.remove("toc-hide");
			body.classList.remove("enable-banner");
			body.classList.remove("wallpaper-transparent", "fullscreen-banner");
			forceReflow();
			body.classList.add("wallpaper-overlay", "no-banner-mode");
			if (navbar) {
				navbar.setAttribute("data-dynamic-transparent", "semi");
				navbar.removeAttribute("data-transparent-mode");
			}
			forceReflow();
			break;

		case "none":
			if (bannerWrapper) bannerWrapper.style.display = "none";
			if (fullscreenWallpaper) fullscreenWallpaper.style.display = "none";
			tocWrapper?.classList.remove("toc-hide");
			body.classList.remove(
				"enable-banner",
				"wallpaper-transparent",
				"wallpaper-overlay",
				"fullscreen-banner",
			);
			forceReflow();
			body.classList.add("no-banner-mode");
			if (navbar) {
				navbar.setAttribute("data-dynamic-transparent", "none");
				navbar.removeAttribute("data-transparent-mode");
			}
			forceReflow();
			break;
	}
}

function syncPageShell() {
	bindLayoutModeEvents();
	bindDesktopLayoutPreference();
	window.applyWallpaperMode?.();
	applyWallpaperVisualSettings();
	requestAnimationFrame(() => applyLayoutMode());
	applyWavesSetting();
	applyBannerTitleSetting();
	applySakuraSetting();
}

function bindMainGridClient() {
	if (mainGridClientBound) return;
	mainGridClientBound = true;
	bindDesktopLayoutPreference();

	window.addEventListener("wallpaper-mode-change", () => {
		applyWallpaperMode();
		applyWallpaperVisualSettings();
	});
	window.addEventListener("overlay-settings-change", () => {
		applyWallpaperVisualSettings("overlay");
	});
	window.addEventListener("fullscreen-settings-change", () => {
		applyWallpaperVisualSettings("fullscreen");
	});
	window.addEventListener("waves-toggle", (event) => {
		const enabled = (event as CustomEvent<{ enabled?: boolean }>).detail
			?.enabled;
		applyWavesSetting(typeof enabled === "boolean" ? enabled : undefined);
	});
	window.addEventListener("banner-title-toggle", (event) => {
		const enabled = (event as CustomEvent<{ enabled?: boolean }>).detail
			?.enabled;
		applyBannerTitleSetting(
			typeof enabled === "boolean" ? enabled : undefined,
		);
	});
	window.addEventListener("sakura-toggle", (event) => {
		const enabled = (event as CustomEvent<{ enabled?: boolean }>).detail
			?.enabled;
		applySakuraSetting(typeof enabled === "boolean" ? enabled : undefined);
	});

	window.applyWallpaperMode = applyWallpaperMode;
	onPageLifecycle("first-load", syncPageShell);
	onPageLifecycle("content-replace", syncPageShell);
	onPageLifecycle("page-view", syncPageShell);
}

applyInitialPageShell();

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		applyWallpaperMode();
		applyWallpaperVisualSettings();
		applyWavesSetting();
		applyBannerTitleSetting();
		applySakuraSetting();
	});
} else {
	applyWallpaperMode();
	applyWallpaperVisualSettings();
	applyWavesSetting();
	applyBannerTitleSetting();
	applySakuraSetting();
}

bindMainGridClient();
