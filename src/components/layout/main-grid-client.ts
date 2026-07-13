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
let navigationProgressStartedAt = 0;
let navigationProgressTimer: number | undefined;
let navigationProgressRun = 0;

const NAVIGATION_PROGRESS_MIN_VISIBLE_MS = 260;

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
	const isPostPage =
		document.body.classList.contains("is-post") ||
		window.location.pathname.startsWith("/posts/");
	const targetsContentStart =
		document.getElementById("swup-container")?.dataset.entryScroll ===
		"content-start";

	mainContent.classList.remove("mobile-main-no-banner", "no-banner-layout");
	mainContent.classList.remove("fullscreen-content");

	if (mode === "fullscreen") {
		const keepsFullscreenBanner =
			isHomePage || (targetsContentStart && !isPostPage);
		if (isMobile && !keepsFullscreenBanner) {
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
		if (isMobile && !isHomePage && !targetsContentStart) {
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
	syncPageInteraction();
}

function syncPageInteraction() {
	const container = document.getElementById("swup-container");
	const fixedNavbar = container?.dataset.navbarBehavior === "fixed-visible";
	document.body.classList.toggle("navbar-fixed-visible", fixedNavbar);
	window.initSemifullScrollDetection?.();
}

function alignPageEntry() {
	const container = document.getElementById("swup-container");
	if (window.location.hash) return;
	const targetsContentStart =
		container?.dataset.entryScroll === "content-start" &&
		getWallpaperMode() === "banner";
	if (!targetsContentStart) return;

	const anchor = container.querySelector<HTMLElement>(
		"[data-page-entry-anchor]",
	);
	if (!anchor) return;

	const clearance = Number.parseFloat(
		window.getComputedStyle(anchor).scrollMarginBlockStart,
	);
	const anchorDocumentTop =
		window.scrollY + anchor.getBoundingClientRect().top;
	const targetScrollTop = Math.max(
		0,
		anchorDocumentTop - (Number.isFinite(clearance) ? clearance : 0),
	);

	const root = document.documentElement;
	const previousScrollBehavior = root.style.scrollBehavior;
	root.style.scrollBehavior = "auto";
	window.scrollTo({ top: targetScrollTop, behavior: "auto" });
	root.style.scrollBehavior = previousScrollBehavior;
}

function settlePageEntry() {
	const mainContent = getMainContent();
	const previousTransition = mainContent?.style.transition ?? "";
	if (mainContent) mainContent.style.transition = "none";

	syncMainContentPosition(getWallpaperMode());
	forceReflow();
	alignPageEntry();

	requestAnimationFrame(() => {
		if (mainContent) mainContent.style.transition = previousTransition;
	});
}

function applyHistoryScrollPolicy(visit?: {
	to?: { url?: string; hash?: string };
	history?: { popstate?: boolean };
	scroll?: { reset: boolean; target?: string | false };
}) {
	if (!visit?.history?.popstate || !visit.scroll || visit.to?.hash) return;

	const pathname = visit.to?.url ?? window.location.pathname;
	const targetsContentStart =
		(pathname.startsWith("/category/") || pathname.startsWith("/posts/")) &&
		getWallpaperMode() === "banner";

	visit.scroll.reset = !targetsContentStart;
	visit.scroll.target = false;
}

function getNavigationProgress() {
	return document.getElementById("navigation-progress");
}

function setNavigationProgress(value: number) {
	getNavigationProgress()?.style.setProperty(
		"--navigation-progress",
		`${value}%`,
	);
}

function startNavigationProgress() {
	const progress = getNavigationProgress();
	if (!progress) return;

	navigationProgressRun += 1;
	navigationProgressStartedAt = performance.now();
	window.clearInterval(navigationProgressTimer);
	progress.dataset.state = "active";
	setNavigationProgress(8);
	requestAnimationFrame(() => setNavigationProgress(24));

	let value = 24;
	navigationProgressTimer = window.setInterval(() => {
		value = Math.min(88, value + Math.max(2, (88 - value) * 0.14));
		setNavigationProgress(value);
	}, 120);
}

function advanceNavigationProgress() {
	const progress = getNavigationProgress();
	if (progress?.dataset.state !== "active") return;
	setNavigationProgress(92);
}

function finishNavigationProgress(onSettled?: () => void) {
	const progress = getNavigationProgress();
	if (!progress || progress.dataset.state !== "active") return;

	const run = navigationProgressRun;
	window.clearInterval(navigationProgressTimer);
	const elapsed = performance.now() - navigationProgressStartedAt;
	const delay = Math.max(0, NAVIGATION_PROGRESS_MIN_VISIBLE_MS - elapsed);

	window.setTimeout(() => {
		if (run !== navigationProgressRun) return;
		setNavigationProgress(100);
		progress.dataset.state = "complete";
		window.setTimeout(() => {
			if (run !== navigationProgressRun) return;
			onSettled?.();
			progress.dataset.state = "idle";
			setNavigationProgress(0);
		}, 180);
	}, delay);
}

function bindMainGridClient() {
	if (mainGridClientBound) return;
	mainGridClientBound = true;
	window.history.scrollRestoration = "manual";
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
	onPageLifecycle("first-load", () => alignPageEntry());
	onPageLifecycle("visit-start", ({ visit }) => {
		applyHistoryScrollPolicy(visit);
		startNavigationProgress();
	});
	onPageLifecycle("content-replace", advanceNavigationProgress);
	onPageLifecycle("visit-end", () => {
		alignPageEntry();
		finishNavigationProgress(settlePageEntry);
	});
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
