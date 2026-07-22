import { sakuraConfig, siteConfig } from "@/config";
import {
	BANNER_HEIGHT_HOME,
	BANNER_HEIGHT_FULLSCREEN,
} from "@/constants/constants";
import {
	applyPostListViewMode,
	bindPostListViewModeEvents,
} from "@/utils/post-list-view-mode";
import { bindDesktopLayoutPreference } from "@/features/layout-preference/controller";
import { initializePostCardTagFitting } from "@/features/post-list/controller";
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
let pageEntryAnimationFrame: number | undefined;
let pageEntryAnimationCleanup: (() => void) | undefined;
let activeVisitIsHistory = false;
let activeVisitUsesHeightGuard = false;
let previousPageScrollHeight = 0;
let heightGuardReleaseTimer: number | undefined;

const NAVIGATION_PROGRESS_MIN_VISIBLE_MS = 260;
const PAGE_ENTRY_SCROLL_DURATION_MS = 380;

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
		applyPostListViewMode();
	});
}

export function applyWallpaperMode() {
	const wallpaperMode = getWallpaperMode();
	const bannerWrapper = document.getElementById("banner-wrapper");
	const fullscreenWallpaper = document.querySelector(
		"[data-overlay-wallpaper]",
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
	bindPostListViewModeEvents();
	bindDesktopLayoutPreference();
	window.applyWallpaperMode?.();
	applyWallpaperVisualSettings();
	requestAnimationFrame(() => {
		applyPostListViewMode();
		initializePostCardTagFitting();
	});
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

type PageEntryScrollBehavior = "instant" | "smooth";

function usesMainRegionEntry(mode = getWallpaperMode()) {
	return mode === "banner" || mode === "fullscreen";
}

function getPageEntryTarget(): number | null {
	const container = document.getElementById("swup-container");
	if (window.location.hash) return null;
	const targetsContentStart =
		container?.dataset.entryScroll === "content-start" &&
		usesMainRegionEntry();
	if (!targetsContentStart) return null;

	const pageMain = container.querySelector<HTMLElement>(".page-main-content");
	if (!pageMain) return null;

	const clearance = Number.parseFloat(
		window.getComputedStyle(pageMain).scrollMarginBlockStart,
	);
	const mainDocumentTop =
		window.scrollY + pageMain.getBoundingClientRect().top;
	return Math.max(
		0,
		mainDocumentTop - (Number.isFinite(clearance) ? clearance : 0),
	);
}

function getPageHeightGuard() {
	return document.getElementById("page-height-guard");
}

function resetPageHeightGuard() {
	const guard = getPageHeightGuard();
	window.clearTimeout(heightGuardReleaseTimer);
	if (!guard) return;
	guard.style.transition = "none";
	guard.style.height = "0px";
	guard.dataset.state = "idle";
	forceReflow();
	guard.style.removeProperty("transition");
}

function capturePageHeight() {
	resetPageHeightGuard();
	previousPageScrollHeight = document.documentElement.scrollHeight;
}

function stabilizePageHeight() {
	const guard = getPageHeightGuard();
	if (!guard || !activeVisitUsesHeightGuard) return;

	guard.style.transition = "none";
	guard.style.height = "0px";
	guard.dataset.state = "active";
	forceReflow();
	const nextPageScrollHeight = document.documentElement.scrollHeight;
	const compensation = Math.max(
		0,
		previousPageScrollHeight - nextPageScrollHeight,
	);
	guard.style.height = `${compensation}px`;
	forceReflow();
}

function releasePageHeightGuard() {
	const guard = getPageHeightGuard();
	if (!guard || guard.dataset.state === "idle") return;

	guard.style.removeProperty("transition");
	forceReflow();
	guard.dataset.state = "releasing";
	guard.style.height = "0px";
	window.clearTimeout(heightGuardReleaseTimer);
	heightGuardReleaseTimer = window.setTimeout(() => {
		guard.dataset.state = "idle";
	}, 260);
}

function alignPageEntry(behavior: PageEntryScrollBehavior = "instant") {
	const targetScrollTop = getPageEntryTarget();
	if (targetScrollTop === null) return;

	const root = document.documentElement;
	const previousScrollBehavior = root.style.scrollBehavior;
	const prefersReducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	const shouldScrollSmoothly = behavior === "smooth" && !prefersReducedMotion;
	root.style.scrollBehavior = shouldScrollSmoothly ? "smooth" : "auto";
	window.scrollTo({
		top: targetScrollTop,
		behavior: shouldScrollSmoothly ? "smooth" : "auto",
	});
	root.style.scrollBehavior = previousScrollBehavior;
}

function cancelPageEntryAnimation() {
	if (pageEntryAnimationFrame !== undefined) {
		cancelAnimationFrame(pageEntryAnimationFrame);
		pageEntryAnimationFrame = undefined;
	}
	pageEntryAnimationCleanup?.();
	pageEntryAnimationCleanup = undefined;
	releasePageHeightGuard();
}

function animatePageEntry() {
	cancelPageEntryAnimation();
	const mainContent = getMainContent();
	const previousTransition = mainContent?.style.transition ?? "";
	if (mainContent) mainContent.style.transition = "none";
	syncMainContentPosition(getWallpaperMode());
	forceReflow();

	const targetScrollTop = getPageEntryTarget();
	if (mainContent) mainContent.style.transition = previousTransition;
	if (targetScrollTop === null) {
		releasePageHeightGuard();
		return;
	}

	const startScrollTop = window.scrollY;
	const distance = targetScrollTop - startScrollTop;
	const prefersReducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	if (prefersReducedMotion || Math.abs(distance) < 1) {
		alignPageEntry("instant");
		releasePageHeightGuard();
		return;
	}

	const root = document.documentElement;
	const previousScrollBehavior = root.style.scrollBehavior;
	root.style.scrollBehavior = "auto";
	const startedAt = performance.now();
	const interrupt = () => cancelPageEntryAnimation();
	const interruptOnKeydown = (event: KeyboardEvent) => {
		if (
			[
				"ArrowDown",
				"ArrowUp",
				"End",
				"Home",
				"PageDown",
				"PageUp",
				" ",
			].includes(event.key)
		) {
			interrupt();
		}
	};

	window.addEventListener("wheel", interrupt, { passive: true });
	window.addEventListener("touchstart", interrupt, { passive: true });
	window.addEventListener("pointerdown", interrupt, { passive: true });
	window.addEventListener("keydown", interruptOnKeydown);
	pageEntryAnimationCleanup = () => {
		root.style.scrollBehavior = previousScrollBehavior;
		window.removeEventListener("wheel", interrupt);
		window.removeEventListener("touchstart", interrupt);
		window.removeEventListener("pointerdown", interrupt);
		window.removeEventListener("keydown", interruptOnKeydown);
	};

	const tick = (now: number) => {
		const progress = Math.min(
			1,
			(now - startedAt) / PAGE_ENTRY_SCROLL_DURATION_MS,
		);
		const easedProgress = 1 - Math.pow(1 - progress, 4);
		window.scrollTo({
			top: startScrollTop + distance * easedProgress,
			behavior: "auto",
		});

		if (progress < 1) {
			pageEntryAnimationFrame = requestAnimationFrame(tick);
			return;
		}

		const finalTargetScrollTop = getPageEntryTarget();
		if (finalTargetScrollTop !== null) {
			window.scrollTo({ top: finalTargetScrollTop, behavior: "auto" });
		}
		pageEntryAnimationFrame = undefined;
		pageEntryAnimationCleanup?.();
		pageEntryAnimationCleanup = undefined;
		releasePageHeightGuard();
	};

	pageEntryAnimationFrame = requestAnimationFrame(tick);
}

function settlePageEntry(behavior: PageEntryScrollBehavior = "instant") {
	const mainContent = getMainContent();
	const previousTransition = mainContent?.style.transition ?? "";
	if (mainContent) mainContent.style.transition = "none";

	syncMainContentPosition(getWallpaperMode());
	forceReflow();
	alignPageEntry(behavior);

	requestAnimationFrame(() => {
		if (mainContent) mainContent.style.transition = previousTransition;
		if (behavior === "instant") alignPageEntry("instant");
		releasePageHeightGuard();
	});
}

function applyPageEntryScrollPolicy(visit?: {
	to?: { url?: string; hash?: string };
	history?: { popstate?: boolean };
	scroll?: { reset: boolean; target?: string | false };
}) {
	if (!visit?.scroll || visit.to?.hash) return false;

	const pathname = visit.to?.url ?? window.location.pathname;
	const targetsContentStart =
		(pathname.startsWith("/category/") || pathname.startsWith("/posts/")) &&
		usesMainRegionEntry();

	if (targetsContentStart) {
		visit.scroll.reset = false;
		visit.scroll.target = false;
	}

	return targetsContentStart;
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
		cancelPageEntryAnimation();
		activeVisitIsHistory = Boolean(visit?.history?.popstate);
		activeVisitUsesHeightGuard = applyPageEntryScrollPolicy(visit);
		if (activeVisitUsesHeightGuard) capturePageHeight();
		startNavigationProgress();
	});
	onPageLifecycle("content-replace", () => {
		advanceNavigationProgress();
		stabilizePageHeight();
		if (!activeVisitIsHistory) animatePageEntry();
	});
	onPageLifecycle("visit-end", ({ visit }) => {
		if (visit?.history?.popstate) {
			finishNavigationProgress(() => settlePageEntry("instant"));
			return;
		}

		finishNavigationProgress();
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
