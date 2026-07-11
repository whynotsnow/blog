import "overlayscrollbars/overlayscrollbars.css";
// import {
//  OverlayScrollbars,
//  // ScrollbarsHidingPlugin,
//  // SizeObserverPlugin,
//  // ClickScrollPlugin
// } from 'overlayscrollbars';
// import {getHue, getStoredTheme, setHue, setTheme} from "../utils/setting-utils";
import { pathsEqual, url } from "../utils/url-utils";
import {
	// BANNER_HEIGHT,
	// BANNER_HEIGHT_HOME,
	// BANNER_HEIGHT_EXTEND,
	// MAIN_PANEL_OVERLAPS_BANNER_HEIGHT,
	DARK_MODE,
	DEFAULT_THEME,
} from "../constants/constants";

const BANNER_HEIGHT = 35;
const BANNER_HEIGHT_EXTEND = 30;
const BANNER_HEIGHT_HOME = BANNER_HEIGHT + BANNER_HEIGHT_EXTEND;

// const MAIN_PANEL_OVERLAPS_BANNER_HEIGHT = 3.5;
import { siteConfig } from "../config";
import { widgetConfigs } from "../config";
import { initSakura } from "../utils/sakura-manager";
import type { PanelId } from "../utils/panel-manager";
import { onPageLifecycle } from "../utils/page-lifecycle";

// const setTimeout = window.setTimeout;
const setTimeout = (
	callback: TimerHandler,
	delay?: number,
	...args: unknown[]
) => window.setTimeout(callback, delay, ...args);

/* Preload fonts */
// (async function() {
//  try {
//      await Promise.all([
//          document.fonts.load("400 1em Roboto"),
//          document.fonts.load("700 1em Roboto"),
//      ]);
//      document.body.classList.remove("hidden");
//  } catch (error) {
//      console.log("Failed to load fonts:", error);
//  }
// })();

/* TODO This is a temporary solution for style flicker issue when the transition is activated */
/* issue link: https://github.com/withastro/astro/issues/8711, the solution get from here too */
/* update: fixed in Astro 3.2.4 */
/*
function disableAnimation() {
    const css = document.createElement('style')
    css.appendChild(
        document.createTextNode(
            `*{
              -webkit-transition:none!important;
              -moz-transition:none!important;
              -o-transition:none!important;
              -ms-transition:none!important;
              transition:none!important
              }`
        )
    )
    document.head.appendChild(css)

    return () => {
        // Force restyle
        ;(() => window.getComputedStyle(document.body))()
        // Wait for next tick before removing
        setTimeout(() => {
            document.head.removeChild(css)
        }, 1)
    }
}
*/

const bannerEnabled = !!document.getElementById("banner-wrapper");
let panelToggleDelegationBound = false;

// 导入面板管理器
async function initializePanelManager() {
	try {
		const { panelManager } = await import("../utils/panel-manager.js");

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
				// let _panelDom = document.getElementById(panel);
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

// function _loadTheme() {
//  const theme = getStoredTheme()
//  setTheme(theme)
// }

// function _loadHue() {
//  setHue(getHue())
// }

function initCustomScrollbar() {
	// 完全禁用OverlayScrollbars的body初始化，避免导致页面重新加载
	// 只处理katex元素的滚动条
	const katexElements = document.querySelectorAll(
		".katex-display:not([data-scrollbar-initialized])",
	) as NodeListOf<HTMLElement>;

	katexElements.forEach((element) => {
		if (!element.parentNode) return;

		const container = document.createElement("div");
		container.className = "katex-display-container";
		element.parentNode.insertBefore(container, element);
		container.appendChild(element);

		// 使用简单的CSS滚动条而不是OverlayScrollbars
		container.style.cssText = `
            overflow-x: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(0,0,0,0.3) transparent;
        `;

		// 为webkit浏览器添加自定义滚动条样式
		const style = document.createElement("style");
		style.textContent = `
            .katex-display-container::-webkit-scrollbar {
                height: 6px;
            }
            .katex-display-container::-webkit-scrollbar-track {
                background: transparent;
            }
            .katex-display-container::-webkit-scrollbar-thumb {
                background: rgba(0,0,0,0.3);
                border-radius: 3px;
            }
            .katex-display-container::-webkit-scrollbar-thumb:hover {
                background: rgba(0,0,0,0.5);
            }
        `;

		if (!document.head.querySelector("style[data-katex-scrollbar]")) {
			style.setAttribute("data-katex-scrollbar", "true");
			document.head.appendChild(style);
		}

		element.setAttribute("data-scrollbar-initialized", "true");
	});
}

function showBanner() {
	// 使用requestAnimationFrame优化DOM操作
	requestAnimationFrame(() => {
		// Handle single image banner (desktop)
		const banner = document.getElementById("banner");
		if (banner) {
			banner.classList.remove("opacity-0", "scale-105");
		}

		// Handle mobile single image banner - 使用与电脑端相同的逻辑
		const mobileBanner = document.querySelector(
			'.block.md\\:hidden[alt="Mobile banner image of the blog"]',
		);
		if (mobileBanner && !document.getElementById("banner-carousel")) {
			// 移动端使用与电脑端相同的初始化逻辑
			mobileBanner.classList.remove("opacity-0", "scale-105");
			mobileBanner.classList.add("opacity-100");
		}

		// Handle carousel banner - 立即初始化，移除延迟
		const carousel = document.getElementById("banner-carousel");
		if (carousel) {
			// 立即初始化轮播，移除延迟以改善流畅性
			initCarousel();
		}
	});
}

function initCarousel() {
	const carouselItems = document.querySelectorAll(".carousel-item");
	// 根据屏幕尺寸过滤有效的轮播项
	const isMobile = window.innerWidth < 768; // md breakpoint
	const validItems = Array.from(carouselItems).filter((item) => {
		if (isMobile) {
			// 移动端：只显示有mobile图片的项目
			return item.querySelector(".block.md\\:hidden");
		} else {
			// 桌面端/平板端：只显示有desktop图片的项目
			return item.querySelector(".hidden.md\\:block");
		}
	});

	if (validItems.length > 1 && siteConfig.banner.carousel?.enable) {
		let currentIndex = 0;
		const interval = siteConfig.banner.carousel?.interval || 6;
		let carouselInterval: ReturnType<typeof setInterval> | undefined;
		let isPaused = false;

		// 移动端触摸手势支持
		let startX = 0;
		let startY = 0;
		let isSwiping = false;

		const carousel = document.getElementById("banner-carousel");

		// 切换图片的函数 - 基于有效项目
		function switchToSlide(index: number) {
			// 隐藏当前图片
			const currentItem = validItems[currentIndex];
			currentItem.classList.remove("opacity-100", "scale-100");
			currentItem.classList.add("opacity-0", "scale-110");

			// 更新索引
			currentIndex = index;

			// 显示新图片
			const nextItem = validItems[currentIndex];
			nextItem.classList.add("opacity-100", "scale-100");
			nextItem.classList.remove("opacity-0", "scale-110");
		}

		// 初始化：隐藏所有图片，只显示第一张有效图片
		carouselItems.forEach((item) => {
			item.classList.add("opacity-0", "scale-110");
			item.classList.remove("opacity-100", "scale-100");
		});

		// 显示第一张有效图片
		if (validItems.length > 0) {
			validItems[0].classList.add("opacity-100", "scale-100");
			validItems[0].classList.remove("opacity-0", "scale-110");
		}

		// 移动端触摸事件
		if (carousel && "ontouchstart" in window) {
			carousel.addEventListener(
				"touchstart",
				(e) => {
					startX = e.touches[0].clientX;
					startY = e.touches[0].clientY;
					isSwiping = false;
					isPaused = true;
					clearInterval(carouselInterval);
				},
				{ passive: true },
			);

			carousel.addEventListener(
				"touchmove",
				(e) => {
					if (!startX || !startY) return;

					const diffX = Math.abs(e.touches[0].clientX - startX);
					const diffY = Math.abs(e.touches[0].clientY - startY);

					// 判断是否为水平滑动
					if (diffX > diffY && diffX > 30) {
						isSwiping = true;
						e.preventDefault();
					}
				},
				{ passive: false },
			);

			carousel.addEventListener(
				"touchend",
				(e) => {
					if (!startX || !startY || !isSwiping) {
						isPaused = false;
						startCarousel();
						return;
					}

					const endX = e.changedTouches[0].clientX;
					const diffX = startX - endX;

					// 滑动距离超过50px才切换
					if (Math.abs(diffX) > 50) {
						if (diffX > 0) {
							// 向左滑动，显示下一张
							const nextIndex =
								(currentIndex + 1) % validItems.length;
							switchToSlide(nextIndex);
						} else {
							// 向右滑动，显示上一张
							const prevIndex =
								(currentIndex - 1 + validItems.length) %
								validItems.length;
							switchToSlide(prevIndex);
						}
					}

					startX = 0;
					startY = 0;
					isSwiping = false;
					isPaused = false;
					// 重新开始自动轮播
					startCarousel();
				},
				{ passive: true },
			);
		}

		// 开始轮播的函数
		function startCarousel() {
			clearInterval(carouselInterval);
			carouselInterval = setInterval(() => {
				if (!isPaused) {
					const nextIndex = (currentIndex + 1) % validItems.length;
					switchToSlide(nextIndex);
				}
			}, interval * 1000);
		}

		// 鼠标悬停暂停（桌面端）
		if (carousel) {
			carousel.addEventListener("mouseenter", () => {
				isPaused = true;
				clearInterval(carouselInterval);
			});
			carousel.addEventListener("mouseleave", () => {
				isPaused = false;
				startCarousel();
			});
		}

		// 开始自动轮播
		startCarousel();
	}
}

function setupSakura() {
	const sakuraConfig = widgetConfigs.sakura;
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
};
let Fancybox: FancyboxApi | undefined;

// 数学公式按需加载
function checkKatex() {
	if (document.querySelector(".katex")) {
		import("katex/dist/katex.css");
	}
}

// 图片灯箱按需加载
async function initFancybox() {
	const albumImagesSelector =
		".custom-md img, #post-cover img, .moment-images img";
	const albumLinksSelector = ".moment-images a[data-fancybox]";
	const singleFancyboxSelector = "[data-fancybox]:not(.moment-images a)";

	const hasImages =
		document.querySelector(albumImagesSelector) ||
		document.querySelector(albumLinksSelector) ||
		document.querySelector(singleFancyboxSelector);

	if (!hasImages) return;

	if (!Fancybox) {
		const mod = await import("@fancyapps/ui");
		Fancybox = mod.Fancybox;
		await import("@fancyapps/ui/dist/fancybox/fancybox.css");
	}

	if (fancyboxSelectors.length > 0) {
		return; // 已经初始化，直接返回
	}

	const commonConfig = {
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
	};

	// 绑定相册/文章图片
	Fancybox.bind(albumImagesSelector, {
		...commonConfig,
		groupAll: true,
		Carousel: {
			transition: "slide",
			preload: 2,
		},
	});
	fancyboxSelectors.push(albumImagesSelector);

	Fancybox.bind(albumLinksSelector, {
		...commonConfig,
		source: (el: HTMLElement) => {
			return el.getAttribute("data-src") || el.getAttribute("href");
		},
	});
	fancyboxSelectors.push(albumLinksSelector);

	// 绑定单独的 fancybox 图片
	Fancybox.bind(singleFancyboxSelector, commonConfig);
	fancyboxSelectors.push(singleFancyboxSelector);
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

const setup = () => {
	onPageLifecycle("link-click", () => {
		// Remove the delay for the first time page load
		document.documentElement.style.setProperty("--content-delay", "0ms");

		// 简化navbar处理逻辑
		if (bannerEnabled) {
			const navbar = document.getElementById("navbar-wrapper");
			if (navbar && document.body.classList.contains("is-home")) {
				const threshold =
					window.innerHeight * (BANNER_HEIGHT / 100) - 88;
				if (document.documentElement.scrollTop >= threshold) {
					navbar.classList.add("navbar-hidden");
				}
			}
		}
	});

	onPageLifecycle("content-replace", () => {
		// 初始化新页面的图片、公式、滚动条和TOC
		initFancybox();
		checkKatex();
		initCustomScrollbar();

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

			// Control mobile banner visibility based on page with improved staging animation
			const bannerWrapper = document.getElementById("banner-wrapper");
			const mainContentWrapper = document.querySelector(
				".absolute.w-full.z-30",
			);

			if (bannerWrapper && mainContentWrapper) {
				if (isHomePage) {
					// 首页：延迟移除隐藏类，让banner和内容优雅地出现
					setTimeout(() => {
						bannerWrapper.classList.remove("mobile-hide-banner");
					}, 100);
					setTimeout(() => {
						mainContentWrapper.classList.remove(
							"mobile-main-no-banner",
						);
					}, 150);
				} else {
					// 非首页：分阶段隐藏，先隐藏banner，再移动内容
					bannerWrapper.classList.add("mobile-hide-banner");
					// 延迟移动内容，让banner先完全消失
					setTimeout(() => {
						mainContentWrapper.classList.add(
							"mobile-main-no-banner",
						);
					}, 100);
				}
			}

			// increase the page height during page transition to prevent the scrolling animation from jumping
			const heightExtend = document.getElementById("page-height-extend");
			if (heightExtend) {
				heightExtend.classList.remove("hidden");
			}

			// Hide the TOC while scrolling back to top
			const toc = document.getElementById("toc-wrapper");
			if (toc) {
				toc.classList.add("toc-not-ready");
			}
		},
	);

	onPageLifecycle("page-view", () => {
		// hide the temp high element when the transition is done
		const heightExtend = document.getElementById("page-height-extend");
		if (heightExtend) {
			heightExtend.classList.remove("hidden");
		}

		// 确保页面滚动到顶部，特别是移动端banner关闭时
		window.scrollTo({
			top: 0,
			behavior: "instant",
		});

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

		// 检查当前页面是否为文章页面，如果是则触发自定义事件用于初始化评论系统
		setTimeout(() => {
			if (document.getElementById("tcomment")) {
				// 触发自定义事件，通知评论系统页面已完全加载
				const pageLoadedEvent = new CustomEvent("mizuki:page:loaded", {
					detail: {
						path: window.location.pathname,
						timestamp: Date.now(),
					},
				});
				document.dispatchEvent(pageLoadedEvent);
				console.log(
					"Layout: 触发 mizuki:page:loaded 事件，路径:",
					window.location.pathname,
				);
			}
		}, 300);
	});

	onPageLifecycle("visit-end", () => {
		setTimeout(() => {
			const heightExtend = document.getElementById("page-height-extend");
			if (heightExtend) {
				heightExtend.classList.add("hidden");
			}

			// Just make the transition looks better
			const toc = document.getElementById("toc-wrapper");
			if (toc) {
				toc.classList.remove("toc-not-ready");
			}
		}, 200);
	});
};

initFancybox();
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

		if (bannerEnabled && navbar) {
			const currentBannerHeight = BANNER_HEIGHT_HOME;

			const threshold =
				window.innerHeight * (currentBannerHeight / 100) - 88;
			if (scrollTop >= threshold) {
				navbar.classList.add("navbar-hidden");
			} else {
				navbar.classList.remove("navbar-hidden");
			}
		}
	});
}

// 使用节流优化滚动性能
window.onscroll = throttle(scrollFunction, 16); // 约60fps

window.onresize = () => {
	// calculate the --banner-height-extend, which needs to be a multiple of 4 to avoid blurry text
	let offset = Math.floor(window.innerHeight * (BANNER_HEIGHT_EXTEND / 100));
	offset = offset - (offset % 4);
	document.documentElement.style.setProperty(
		"--banner-height-extend",
		`${offset}px`,
	);
};

// 页面加载完成后初始化banner和轮播图
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", async () => {
		showBanner();
		// 初始化面板管理器
		try {
			await import("../utils/panel-manager.js");
			console.log("Panel manager initialized");
		} catch (error) {
			console.error("Failed to initialize panel manager:", error);
		}
	});
} else {
	showBanner();
	// 页面已经加载完成，立即初始化面板管理器
	(async () => {
		try {
			await import("../utils/panel-manager.js");
			console.log("Panel manager initialized");
		} catch (error) {
			console.error("Failed to initialize panel manager:", error);
		}
	})();
}
