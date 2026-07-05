import { siteConfig } from "@/config";
import { BANNER_HEIGHT } from "@/constants/constants";
import { applyLayoutMode, bindLayoutModeEvents } from "@/utils/layout-mode";
import { onPageLifecycle } from "@/utils/page-lifecycle";

const defaultWallpaperMode = siteConfig.wallpaperMode.defaultMode;
const navbarTransparentMode =
	siteConfig.banner?.navbar?.transparentMode || "semi";
const defaultPostListLayout = siteConfig.postListLayout?.defaultMode || "list";
let mainGridClientBound = false;

function getWallpaperMode(): string {
	return localStorage.getItem("wallpaperMode") || defaultWallpaperMode;
}

function forceReflow() {
	void document.body.offsetHeight;
}

function getMainContent(): HTMLElement | null {
	return document.querySelector(".absolute.w-full.z-30.pointer-events-none");
}

function applyInitialPageShell() {
	const wallpaperMode = getWallpaperMode();
	const body = document.body;

	switch (wallpaperMode) {
		case "banner":
			body.classList.add("enable-banner");
			body.classList.remove("wallpaper-transparent", "no-banner-mode");
			break;
		case "fullscreen":
			body.classList.remove("enable-banner");
			body.classList.add("wallpaper-transparent", "no-banner-mode");
			break;
		case "none":
			body.classList.remove("enable-banner", "wallpaper-transparent");
			body.classList.add("no-banner-mode");
			break;
	}

	requestAnimationFrame(() => {
		const mainContent = getMainContent();
		if (mainContent) {
			mainContent.style.top =
				wallpaperMode === "banner" ? `${BANNER_HEIGHT}vh` : "5.5rem";
		}

		const mainGrid = document.getElementById("main-grid");
		if (mainGrid) {
			const savedLayout = localStorage.getItem("postListLayout");
			const currentLayout = savedLayout || defaultPostListLayout;
			mainGrid.setAttribute("data-layout-mode", currentLayout);

			const postListContainer = document.getElementById(
				"post-list-container",
			);
			if (postListContainer) {
				postListContainer.classList.remove("list-mode", "grid-mode");

				if (currentLayout === "grid") {
					postListContainer.classList.add(
						"grid-mode",
						"grid",
						"grid-cols-1",
						"lg:grid-cols-2",
						"gap-6",
					);
					postListContainer.classList.remove("flex", "flex-col");
				} else {
					postListContainer.classList.add(
						"list-mode",
						"flex",
						"flex-col",
					);
					postListContainer.classList.remove(
						"grid",
						"grid-cols-1",
						"lg:grid-cols-2",
						"gap-6",
					);
				}
			}
		}
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
	const mainContent = getMainContent();
	const tocWrapper = document.getElementById("toc-wrapper");

	switch (wallpaperMode) {
		case "banner":
			if (bannerWrapper) bannerWrapper.style.display = "block";
			if (fullscreenWallpaper) fullscreenWallpaper.style.display = "none";
			if (tocWrapper) {
				const scrollTop = document.documentElement.scrollTop;
				const bannerHeight = window.innerHeight * (BANNER_HEIGHT / 100);
				if (scrollTop <= bannerHeight) {
					tocWrapper.classList.add("toc-hide");
				}
			}
			body.classList.remove("wallpaper-transparent", "no-banner-mode");
			forceReflow();
			mainContent?.style.removeProperty("top");
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
			if (bannerWrapper) bannerWrapper.style.display = "none";
			if (fullscreenWallpaper)
				fullscreenWallpaper.style.display = "block";
			tocWrapper?.classList.remove("toc-hide");
			body.classList.remove("enable-banner");
			forceReflow();
			mainContent?.style.removeProperty("top");
			body.classList.add("wallpaper-transparent", "no-banner-mode");
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
			body.classList.remove("enable-banner", "wallpaper-transparent");
			forceReflow();
			mainContent?.style.removeProperty("top");
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
	window.applyWallpaperMode?.();
	requestAnimationFrame(() => applyLayoutMode());
}

function bindMainGridClient() {
	if (mainGridClientBound) return;
	mainGridClientBound = true;

	window.addEventListener("wallpaper-mode-change", () => {
		applyWallpaperMode();
	});

	window.applyWallpaperMode = applyWallpaperMode;
	onPageLifecycle("first-load", syncPageShell);
	onPageLifecycle("content-replace", syncPageShell);
	onPageLifecycle("page-view", syncPageShell);
}

applyInitialPageShell();

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", applyWallpaperMode);
} else {
	applyWallpaperMode();
}

bindMainGridClient();
