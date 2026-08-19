import { pathsEqual, url } from "../utils/url";
import { DARK_MODE, DEFAULT_THEME } from "../constants/constants";

const BANNER_HEIGHT = 35;
const BANNER_HEIGHT_EXTEND = 30;
const BANNER_HEIGHT_HOME = BANNER_HEIGHT + BANNER_HEIGHT_EXTEND;

import { sakuraConfig } from "../config";
import { initSakura } from "../utils/sakura-manager";
import type { PanelId } from "../components/modules/shell-panels/panel-manager";
import { onPageLifecycle } from "../utils/page-lifecycle";
import { initFilterTabs } from "../components/filter-tabs/filter-tabs-client";

const setTimeout = (
	callback: TimerHandler,
	delay?: number,
	...args: unknown[]
) => window.setTimeout(callback, delay, ...args);

const bannerEnabled = !!document.getElementById("banner-wrapper");
let panelToggleDelegationBound = false;

const DEFAULT_MAIN_CONTENT_OFFSET = 88;

function readMainContentOffset() {
	const value = Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			"--main-content-offset",
		),
	);
	return Number.isFinite(value) ? value : DEFAULT_MAIN_CONTENT_OFFSET;
}

let mainContentOffset = readMainContentOffset();

// 导入面板管理器
async function initializePanelManager() {
	try {
		const { panelManager } =
			await import("../components/modules/shell-panels/panel-manager.js");

		if (!panelToggleDelegationBound) {
			panelToggleDelegationBound = true;
			document.addEventListener("click", async (event) => {
				const target = event.target;
				if (!(target instanceof Element)) return;

				const toggle = target.closest<HTMLElement>(
					"#display-settings-switch, #nav-menu-switch",
				);
				if (!toggle) return;

				event.preventDefault();
				if (toggle.id === "display-settings-switch") {
					await panelManager.togglePanel("display-setting");
					return;
				}
				await panelManager.togglePanel("nav-menu-panel");
			});
		}

		function setClickOutsideToClose(panel: string, ignores: string[]) {
			document.addEventListener("click", async (event) => {
				const tDom = event.target;
				if (!(tDom instanceof Node)) return; // Ensure the event target is an HTML Node
				for (const ig of ignores) {
					const ie = document.getElementById(ig);
					if (ie == tDom || ie?.contains(tDom)) {
						return;
					}
				}
				await panelManager.closePanel(panel as PanelId);
			});
		}

		setClickOutsideToClose("display-setting", [
			"display-setting",
			"display-settings-switch",
		]);
		setClickOutsideToClose("nav-menu-panel", [
			"nav-menu-panel",
			"nav-menu-switch",
		]);
		setClickOutsideToClose("search-panel", [
			"search-panel",
			"search-bar",
			"search-switch",
		]);
		setClickOutsideToClose("mobile-toc-panel", [
			"mobile-toc-panel",
			"mobile-toc-switch",
		]);
		setClickOutsideToClose("wallpaper-mode-panel", [
			"wallpaper-mode-panel",
			"wallpaper-mode-switch",
		]);

		return panelManager;
	} catch (error) {
		console.error("Failed to initialize panel manager:", error);
		return null;
	}
}

initializePanelManager();

function initKatexScrollbar() {
	const katexElements = document.querySelectorAll(
		".katex-display:not([data-scrollbar-initialized])",
	) as NodeListOf<HTMLElement>;

	katexElements.forEach((element) => {
		if (!element.parentNode) return;

		const container = document.createElement("div");
		container.className = "katex-display-container scrollbar-thin";
		element.parentNode.insertBefore(container, element);
		container.appendChild(element);
		container.style.overflowX = "auto";

		element.setAttribute("data-scrollbar-initialized", "true");
	});
}

function setupSakura() {
	if (!sakuraConfig || !sakuraConfig.enable) return;
	if (window.sakuraInitialized) return;
	initSakura(sakuraConfig);
	window.sakuraInitialized = true;
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", setupSakura);
} else {
	setupSakura();
}

let fancyboxSelectors: string[] = [];
type FancyboxApi = {
	bind: (selector: string, options?: Record<string, unknown>) => void;
	unbind: (selector: string) => void;
	fromTriggerEl?: (
		triggerEl: HTMLElement,
		options?: Record<string, unknown>,
	) => unknown;
};
let Fancybox: FancyboxApi | undefined;
let fancyboxClickFallbackBound = false;

const albumImagesSelector =
	".custom-md img:not(.image-grid img), #post-cover img, .moment-images img";
const groupedFancyboxSelector = [
	".moment-images [data-fancybox]",
	".diary-images [data-fancybox]",
	".photo-gallery [data-fancybox]",
	".gallery-masonry [data-fancybox]",
	".image-grid [data-fancybox]",
].join(", ");
const singleFancyboxSelector = [
	"[data-fancybox]",
	":not(.moment-images [data-fancybox])",
	":not(.diary-images [data-fancybox])",
	":not(.photo-gallery [data-fancybox])",
	":not(.gallery-masonry [data-fancybox])",
	":not(.image-grid [data-fancybox])",
].join("");

// 数学公式按需加载
function checkKatex() {
	if (document.querySelector(".katex")) {
		import("katex/dist/katex.css");
	}
}

function getFancyboxConfig() {
	return {
		Thumbs: { autoStart: true, showOnStart: "yes" },
		Toolbar: {
			display: {
				left: ["infobar"],
				middle: [
					"zoomIn",
					"zoomOut",
					"toggle1to1",
					"rotateCCW",
					"rotateCW",
					"flipX",
					"flipY",
				],
				right: ["slideshow", "thumbs", "close"],
			},
		},
		animated: true,
		dragToClose: true,
		keyboard: {
			Escape: "close",
			Delete: "close",
			Backspace: "close",
			PageUp: "next",
			PageDown: "prev",
			ArrowUp: "next",
			ArrowDown: "prev",
			ArrowRight: "next",
			ArrowLeft: "prev",
		},
		fitToView: true,
		preload: 3,
		infinite: true,
		Panzoom: { maxScale: 3, minScale: 1 },
		caption: false,
		Hash: false,
	};
}

async function loadFancybox() {
	if (Fancybox) return;

	const mod = await import("@fancyapps/ui");
	Fancybox = mod.Fancybox;
	window.Fancybox = Fancybox;
	await import("@fancyapps/ui/dist/fancybox/fancybox.css");
}

const sourceFromTrigger = (el: HTMLElement) => {
	const href = el.getAttribute("href");
	if (href && href !== "javascript:void(0)") {
		return href;
	}
	return el.getAttribute("data-src") || href || "";
};

// 图片灯箱按需加载
async function initFancybox() {
	const hasImages =
		document.querySelector(albumImagesSelector) ||
		document.querySelector(groupedFancyboxSelector) ||
		document.querySelector(singleFancyboxSelector);

	if (!hasImages) return;

	await loadFancybox();

	if (fancyboxSelectors.length > 0) {
		return; // 已经初始化，直接返回
	}

	const commonConfig = getFancyboxConfig();

	// 绑定普通文章图片
	Fancybox?.bind(albumImagesSelector, {
		...commonConfig,
		groupAll: true,
		Carousel: {
			transition: "slide",
			preload: 2,
		},
	});
	fancyboxSelectors.push(albumImagesSelector);

	Fancybox?.bind(groupedFancyboxSelector, {
		...commonConfig,
		source: sourceFromTrigger,
	});
	fancyboxSelectors.push(groupedFancyboxSelector);

	// 绑定单独的 fancybox 图片
	Fancybox?.bind(singleFancyboxSelector, {
		...commonConfig,
		source: sourceFromTrigger,
	});
	fancyboxSelectors.push(singleFancyboxSelector);
}

function bindFancyboxClickFallback() {
	if (fancyboxClickFallbackBound) return;
	fancyboxClickFallbackBound = true;

	document.addEventListener(
		"click",
		(event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;

			const trigger = target.closest<HTMLElement>(
				groupedFancyboxSelector,
			);
			if (!trigger) return;

			event.preventDefault();
			event.stopPropagation();

			void (async () => {
				await initFancybox();
				await loadFancybox();

				if (Fancybox?.fromTriggerEl) {
					Fancybox.fromTriggerEl(trigger, {
						...getFancyboxConfig(),
						source: sourceFromTrigger,
					});
				}
			})();
		},
		true,
	);
}

// 清理 Fancybox 实例
function cleanupFancybox() {
	if (!Fancybox) return; // 如果从未加载过，无需清理
	const fancybox = Fancybox;
	fancyboxSelectors.forEach((selector) => {
		fancybox.unbind(selector);
	});
	fancyboxSelectors = [];
}

window.__refreshFancybox = async () => {
	cleanupFancybox();
	await initFancybox();
};

const setup = () => {
	onPageLifecycle("link-click", () => {
		// Remove the delay for the first time page load
		document.documentElement.style.setProperty("--content-delay", "0ms");

		// 简化navbar处理逻辑
		if (bannerEnabled) {
			const navbar = document.getElementById("navbar-wrapper");
			if (navbar && document.body.classList.contains("is-home")) {
				const threshold =
					window.innerHeight * (BANNER_HEIGHT / 100) -
					mainContentOffset;
				if (document.documentElement.scrollTop >= threshold) {
					navbar.classList.add("navbar-hidden");
				}
			}
		}
	});

	onPageLifecycle("content-replace", () => {
		mainContentOffset = readMainContentOffset();

		// 初始化新页面的图片、公式、滚动条和TOC
		initFancybox();
		initFilterTabs(true);
		checkKatex();
		initKatexScrollbar();

		// 检查当前页面是否为文章页面（有TOC元素）
		const tocWrapper = document.getElementById("toc-wrapper");
		const isArticlePage = tocWrapper !== null;

		// 只在文章页面重新初始化 TOC 组件
		if (isArticlePage) {
			const tocElement = document.querySelector("table-of-contents");
			if (tocElement?.init) {
				setTimeout(() => {
					tocElement.init?.();
				}, 100);
			}

			// 重新初始化移动端 TOC 组件
			if (typeof window.mobileTOCInit === "function") {
				setTimeout(() => {
					window.mobileTOCInit?.();
				}, 100);
			}
		}

		// 重新初始化semifull模式的滚动检测
		const navbar = document.getElementById("navbar");
		if (navbar) {
			const transparentMode = navbar.getAttribute(
				"data-transparent-mode",
			);
			if (transparentMode === "semifull") {
				// 重新调用初始化函数来重新绑定滚动事件
				if (typeof window.initSemifullScrollDetection === "function") {
					window.initSemifullScrollDetection();
				}
			}
		}
	});

	onPageLifecycle(
		"visit-start",
		({ visit }: { visit?: { to?: { url?: string } } }) => {
			// 清理上一页的 Fancybox
			cleanupFancybox();

			// 处理 Banner class 和显示状态
			const bodyElement = document.querySelector("body");
			const isHomePage = pathsEqual(
				visit?.to?.url || window.location.pathname,
				url("/"),
			);
			if (bodyElement) {
				if (isHomePage) {
					bodyElement.classList.add("is-home");
				} else {
					bodyElement.classList.remove("is-home");
				}
			}

			// Control banner text visibility based on page
			const bannerTextOverlay = document.querySelector(
				".banner-text-overlay",
			);
			if (bannerTextOverlay) {
				if (isHomePage) {
					bannerTextOverlay.classList.remove("hidden");
				} else {
					bannerTextOverlay.classList.add("hidden");
				}
			}

			// Control navbar transparency based on page
			const navbar = document.getElementById("navbar");
			if (navbar) {
				navbar.setAttribute("data-is-home", isHomePage.toString());
				// 重新初始化semifull模式的滚动检测
				const transparentMode = navbar.getAttribute(
					"data-transparent-mode",
				);
				if (transparentMode === "semifull") {
					// 重新调用初始化函数来重新绑定滚动事件
					if (
						typeof window.initSemifullScrollDetection === "function"
					) {
						window.initSemifullScrollDetection();
					}
				}
			}

			// Hide the TOC while scrolling back to top
			const toc = document.getElementById("toc-wrapper");
			if (toc) {
				toc.classList.add("toc-not-ready");
			}
		},
	);

	onPageLifecycle("page-view", () => {
		const ownsPageEntryScroll =
			document.getElementById("swup-container")?.dataset.entryScroll ===
			"content-start";
		if (!ownsPageEntryScroll) {
			window.scrollTo({
				top: 0,
				behavior: "instant",
			});
		}

		// 同步主题状态 - 解决从首页进入文章页面时代码块渲染问题
		const storedTheme = localStorage.getItem("theme") || DEFAULT_THEME;
		const isDark = storedTheme === DARK_MODE;
		const expectedTheme = isDark ? "github-dark" : "github-light";

		const currentTheme =
			document.documentElement.getAttribute("data-theme");
		const hasDarkClass =
			document.documentElement.classList.contains("dark");

		// 如果主题不匹配，使用批量更新减少重绘
		if (currentTheme !== expectedTheme || hasDarkClass !== isDark) {
			// 使用 requestAnimationFrame 批量更新，减少重绘
			requestAnimationFrame(() => {
				// 同步 data-theme 属性
				if (currentTheme !== expectedTheme) {
					document.documentElement.setAttribute(
						"data-theme",
						expectedTheme,
					);
				}
				// 同步 dark class
				if (hasDarkClass !== isDark) {
					if (isDark) {
						document.documentElement.classList.add("dark");
					} else {
						document.documentElement.classList.remove("dark");
					}
				}
			});
		}
	});

	onPageLifecycle("visit-end", () => {
		setTimeout(() => {
			// Just make the transition looks better
			const toc = document.getElementById("toc-wrapper");
			if (toc) {
				toc.classList.remove("toc-not-ready");
			}
		}, 200);
	});
};

bindFancyboxClickFallback();
initFancybox();
initFilterTabs();
checkKatex();
setup();

const backToTopBtn = document.getElementById("back-to-top-btn");
const toc = document.getElementById("toc-wrapper");
const navbar = document.getElementById("navbar-wrapper");

// 节流函数
function throttle<T extends (...args: unknown[]) => void>(
	func: T,
	limit: number,
) {
	let inThrottle: boolean;
	return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
		if (!inThrottle) {
			func.apply(this, args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

function scrollFunction() {
	const scrollTop = document.documentElement.scrollTop;
	const bannerHeight = window.innerHeight * (BANNER_HEIGHT / 100);

	// 尝试获取内容区域的起始位置
	const contentWrapper = document.getElementById("content-wrapper");
	let showBackToTopThreshold = bannerHeight + 100; // 默认回退值

	if (contentWrapper) {
		const rect = contentWrapper.getBoundingClientRect();
		// 当 content-wrapper 的顶部接近视口顶部时显示
		// rect.top 是相对于视口的，当它小于视口高度的一半时，说明已经滚动到了内容区
		// 或者更简单：scrollTop > contentWrapper.offsetTop
		// 由于 offsetTop 是相对于 offsetParent 的，可能需要累加
		// 这里我们使用 getBoundingClientRect + scrollTop 来获取绝对位置
		const absoluteTop = rect.top + scrollTop;
		// 只有当滚动超过内容区域起始位置一定距离后才显示
		showBackToTopThreshold = absoluteTop + window.innerHeight / 4;
	}

	// 批量处理DOM操作
	requestAnimationFrame(() => {
		if (backToTopBtn) {
			// 使用动态计算的阈值
			if (scrollTop > showBackToTopThreshold) {
				backToTopBtn.classList.remove("hide");
			} else {
				backToTopBtn.classList.add("hide");
			}
		}

		if (bannerEnabled && toc) {
			const isBannerMode =
				document.body.classList.contains("enable-banner");
			if (isBannerMode) {
				if (scrollTop > bannerHeight) {
					toc.classList.remove("toc-hide");
				} else {
					toc.classList.add("toc-hide");
				}
			} else {
				// In Fullscreen or None mode, always show TOC
				toc.classList.remove("toc-hide");
			}
		}

		if (
			bannerEnabled &&
			navbar &&
			!document.body.classList.contains("navbar-fixed-visible")
		) {
			const currentBannerHeight = BANNER_HEIGHT_HOME;

			const threshold =
				window.innerHeight * (currentBannerHeight / 100) -
				mainContentOffset;
			if (scrollTop >= threshold) {
				navbar.classList.add("navbar-hidden");
			} else {
				navbar.classList.remove("navbar-hidden");
			}
		} else if (navbar) {
			navbar.classList.remove("navbar-hidden");
		}
	});
}

// 使用节流优化滚动性能
window.onscroll = throttle(scrollFunction, 16); // 约60fps

window.onresize = () => {
	mainContentOffset = readMainContentOffset();

	// calculate the --banner-height-extend, which needs to be a multiple of 4 to avoid blurry text
	let offset = Math.floor(window.innerHeight * (BANNER_HEIGHT_EXTEND / 100));
	offset = offset - (offset % 4);
	document.documentElement.style.setProperty(
		"--banner-height-extend",
		`${offset}px`,
	);
};

// 页面加载完成后初始化面板管理器
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", async () => {
		// 初始化面板管理器
		try {
			await import("../components/modules/shell-panels/panel-manager.js");
			console.log("Panel manager initialized");
		} catch (error) {
			console.error("Failed to initialize panel manager:", error);
		}
	});
} else {
	// 页面已经加载完成，立即初始化面板管理器
	(async () => {
		try {
			await import("../components/modules/shell-panels/panel-manager.js");
			console.log("Panel manager initialized");
		} catch (error) {
			console.error("Failed to initialize panel manager:", error);
		}
	})();
}
