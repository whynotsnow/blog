import { DARK_MODE, DEFAULT_THEME, LIGHT_MODE } from "@constants/constants";
import { sakuraConfig, siteConfig, wallConfig } from "@/config";
import type { LIGHT_DARK_MODE, WALL_MODE } from "@/types/config";

export function getDefaultHue(): number {
	const fallback = "250";
	const configCarrier = document.getElementById("config-carrier");
	// 在Swup页面切换时，config-carrier可能不存在，使用默认值
	if (!configCarrier) {
		return Number.parseInt(fallback);
	}
	return Number.parseInt(configCarrier.dataset.hue || fallback);
}

export function getHue(): number {
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored) : getDefaultHue();
}

export function setHue(hue: number): void {
	localStorage.setItem("hue", String(hue));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(hue));
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE): void {
	// 获取当前主题状态的完整信息
	const currentIsDark = document.documentElement.classList.contains("dark");
	const currentTheme = document.documentElement.getAttribute("data-theme");

	// 计算目标主题状态
	let targetIsDark = false; // 初始化默认值
	switch (theme) {
		case LIGHT_MODE:
			targetIsDark = false;
			break;
		case DARK_MODE:
			targetIsDark = true;
			break;
		default:
			// 处理默认情况，使用当前主题状态
			targetIsDark = currentIsDark;
			break;
	}

	// 检测是否真的需要主题切换：
	// 1. dark类状态是否改变
	// 2. expressiveCode主题是否需要更新
	const needsThemeChange = currentIsDark !== targetIsDark;
	const expectedTheme = targetIsDark ? "github-dark" : "github-light";
	const needsCodeThemeUpdate = currentTheme !== expectedTheme;

	// 如果既不需要主题切换也不需要代码主题更新，直接返回
	if (!needsThemeChange && !needsCodeThemeUpdate) {
		return;
	}

	// 定义实际执行主题切换的函数
	const performThemeChange = () => {
		// 应用主题变化
		if (needsThemeChange) {
			if (targetIsDark) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
		}

		// Set the theme for Expressive Code based on current mode
		// 只在必要时更新 data-theme 属性以减少重绘
		if (needsCodeThemeUpdate) {
			const expressiveTheme = targetIsDark
				? "github-dark"
				: "github-light";
			document.documentElement.setAttribute(
				"data-theme",
				expressiveTheme,
			);
		}
	};

	// 检查浏览器是否支持 View Transitions API
	if (
		needsThemeChange &&
		document.startViewTransition &&
		!window.matchMedia("(prefers-reduced-motion: reduce)").matches
	) {
		// 添加标记类，表示正在使用 View Transitions
		document.documentElement.classList.add(
			"is-theme-transitioning",
			"use-view-transition",
		);

		// 使用 View Transitions API 实现平滑过渡
		const transition = document.startViewTransition(() => {
			performThemeChange();
		});

		// 在过渡完成后移除标记类（使用 finished promise 确保完全同步）
		transition.finished
			.then(() => {
				// 使用 microtask 确保在下一个事件循环前完成清理
				queueMicrotask(() => {
					document.documentElement.classList.remove(
						"is-theme-transitioning",
						"use-view-transition",
					);
				});
			})
			.catch(() => {
				// 如果过渡被中断，也要清理状态
				document.documentElement.classList.remove(
					"is-theme-transitioning",
					"use-view-transition",
				);
			});
	} else {
		// 不支持 View Transitions API 或用户偏好减少动画，使用传统方式
		// 只在需要主题切换时添加过渡保护
		if (needsThemeChange) {
			document.documentElement.classList.add("is-theme-transitioning");
		}

		performThemeChange();

		// 使用 requestAnimationFrame 确保在下一帧移除过渡保护类
		if (needsThemeChange) {
			requestAnimationFrame(() => {
				document.documentElement.classList.remove(
					"is-theme-transitioning",
				);
			});
		}
	}
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	localStorage.setItem("theme", theme);
	applyThemeToDocument(theme);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	return (localStorage.getItem("theme") as LIGHT_DARK_MODE) || DEFAULT_THEME;
}

export function getStoredWallpaperMode(): WALL_MODE {
	return (
		(localStorage.getItem("wallpaperMode") as WALL_MODE) ||
		siteConfig.wallpaperMode.defaultMode
	);
}

export function setWallpaperMode(mode: WALL_MODE): void {
	localStorage.setItem("wallpaperMode", mode);
	// 触发自定义事件通知其他组件壁纸模式已改变
	window.dispatchEvent(
		new CustomEvent("wallpaper-mode-change", { detail: { mode } }),
	);
}

function getNumberConfigDefault(
	value: number | undefined,
	fallback: number,
): number {
	return typeof value === "number" ? value : fallback;
}

function getBooleanConfigDefault(
	value: boolean | undefined,
	fallback: boolean,
): boolean {
	return typeof value === "boolean" ? value : fallback;
}

export function getDefaultWallOpacity(): number {
	return getNumberConfigDefault(wallConfig.effects?.opacity, 0.8);
}

export function getStoredWallOpacity(): number {
	const stored = localStorage.getItem("wallOpacity");
	return stored ? Number(stored) : getDefaultWallOpacity();
}

export function setWallOpacity(value: number): void {
	localStorage.setItem("wallOpacity", String(value));
	const wallpaper = document.querySelector(
		"[data-wallpaper]",
	) as HTMLElement | null;
	if (wallpaper) {
		wallpaper.style.setProperty("--wallpaper-opacity", String(value));
	}
	window.dispatchEvent(new CustomEvent("wall-settings-change"));
}

export function getDefaultWallBlur(): number {
	return getNumberConfigDefault(wallConfig.effects?.blur, 1.5);
}

export function getStoredWallBlur(): number {
	const stored = localStorage.getItem("wallBlur");
	return stored ? Number(stored) : getDefaultWallBlur();
}

export function setWallBlur(value: number): void {
	localStorage.setItem("wallBlur", String(value));
	const wallpaper = document.querySelector(
		"[data-wallpaper]",
	) as HTMLElement | null;
	if (wallpaper) {
		wallpaper.style.setProperty("--wallpaper-blur", `${value}px`);
	}
	window.dispatchEvent(new CustomEvent("wall-settings-change"));
}

export function getDefaultWallCardOpacity(): number {
	return getNumberConfigDefault(wallConfig.effects?.cardOpacity, 0.8);
}

export function getStoredWallCardOpacity(): number {
	const stored = localStorage.getItem("wallCardOpacity");
	return stored ? Number(stored) : getDefaultWallCardOpacity();
}

export function setWallCardOpacity(value: number): void {
	localStorage.setItem("wallCardOpacity", String(value));
	document.documentElement.style.setProperty(
		"--card-transparent-opacity",
		String(value),
	);
	window.dispatchEvent(new CustomEvent("wall-settings-change"));
}

export function applyWallpaperVisualSettings(mode?: WALL_MODE): void {
	const currentMode = mode || getStoredWallpaperMode();
	const wallpaper = document.querySelector(
		"[data-wallpaper]",
	) as HTMLElement | null;
	const root = document.documentElement;

	if (!wallpaper) {
		return;
	}

	if (currentMode === "full-wall") {
		wallpaper.style.setProperty(
			"--wallpaper-opacity",
			String(getStoredWallOpacity()),
		);
		wallpaper.style.setProperty(
			"--wallpaper-blur",
			`${getStoredWallBlur()}px`,
		);
		root.style.setProperty(
			"--card-transparent-opacity",
			String(getStoredWallCardOpacity()),
		);
		return;
	}

	wallpaper.style.removeProperty("--wallpaper-opacity");
	wallpaper.style.removeProperty("--wallpaper-blur");
	root.style.removeProperty("--card-transparent-opacity");
}

export function getDefaultWavesEnabled(): boolean {
	return getBooleanConfigDefault(siteConfig.banner.waves?.enable, true);
}

export function getStoredWavesEnabled(): boolean {
	const stored = localStorage.getItem("wavesEnabled");
	return stored !== null ? stored === "true" : getDefaultWavesEnabled();
}

export function setWavesEnabled(enabled: boolean): void {
	localStorage.setItem("wavesEnabled", String(enabled));
	document.documentElement.setAttribute(
		"data-waves-enabled",
		String(enabled),
	);
	window.dispatchEvent(
		new CustomEvent("waves-toggle", { detail: { enabled } }),
	);
}

export function getDefaultBannerTitleEnabled(): boolean {
	return getBooleanConfigDefault(siteConfig.banner.homeText?.enable, true);
}

export function getStoredBannerTitleEnabled(): boolean {
	const stored = localStorage.getItem("bannerTitleEnabled");
	return stored !== null ? stored === "true" : getDefaultBannerTitleEnabled();
}

export function setBannerTitleEnabled(enabled: boolean): void {
	localStorage.setItem("bannerTitleEnabled", String(enabled));
	document.documentElement.setAttribute(
		"data-banner-title-enabled",
		String(enabled),
	);
	window.dispatchEvent(
		new CustomEvent("banner-title-toggle", { detail: { enabled } }),
	);
}

export function getDefaultSakuraEnabled(): boolean {
	return getBooleanConfigDefault(sakuraConfig.enable, false);
}

export function getStoredSakuraEnabled(): boolean {
	const stored = localStorage.getItem("sakuraEnabled");
	return stored !== null ? stored === "true" : getDefaultSakuraEnabled();
}

export function setSakuraEnabled(enabled: boolean): void {
	localStorage.setItem("sakuraEnabled", String(enabled));
	window.dispatchEvent(
		new CustomEvent("sakura-toggle", { detail: { enabled } }),
	);
}
