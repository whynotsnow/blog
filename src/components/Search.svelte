<script lang="ts">
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import { navigateToPage } from "@utils/navigation-utils";
	import { panelManager } from "@utils/panel-manager";
	import { url } from "@utils/url";
	import { onMount, onDestroy } from "svelte";
	import type { SearchResult } from "@/global";

	let keywordDesktop = $state("");
	let keywordMobile = $state("");
	let result: SearchResult[] = $state([]);
	let pagefindLoaded = false;
	let initialized = $state(false);
	let isDesktopSearchExpanded = $state(false);
	let debounceTimer: NodeJS.Timeout;
	let windowJustFocused = false;
	let focusTimer: NodeJS.Timeout;
	let blurTimer: NodeJS.Timeout;

	const fakeResult: SearchResult[] = [
		{
			url: url("/"),
			meta: {
				title: "This Is a Fake Search Result",
			},
			excerpt:
				"Because the search cannot work in the <mark>dev</mark> environment.",
		},
		{
			url: url("/"),
			meta: {
				title: "If You Want to Test the Search",
			},
			excerpt:
				"Try running <mark>npm build && npm preview</mark> instead.",
		},
	];

	const escapeHtml = (html: string): string =>
		html.replace(
			/[&<>"']/g,
			(char) =>
				({
					"&": "&amp;",
					"<": "&lt;",
					">": "&gt;",
					'"': "&quot;",
					"'": "&#39;",
				})[char] ?? char,
		);

	const sanitizeExcerpt = (html: string): string => {
		if (
			typeof DOMParser === "undefined" ||
			typeof document === "undefined"
		) {
			return escapeHtml(html);
		}

		const doc = new DOMParser().parseFromString(html, "text/html");
		const allowed = new Set(["MARK"]);
		const walker = document.createTreeWalker(
			doc.body,
			NodeFilter.SHOW_ELEMENT,
		);
		const toRemove: Element[] = [];

		while (walker.nextNode()) {
			const el = walker.currentNode as Element;
			if (!allowed.has(el.tagName)) {
				toRemove.push(el);
				continue;
			}

			for (const attr of Array.from(el.attributes)) {
				el.removeAttribute(attr.name);
			}
		}

		for (const el of toRemove) {
			el.replaceWith(...Array.from(el.childNodes));
		}

		return doc.body.innerHTML;
	};

	const togglePanel = async () => {
		await panelManager.togglePanel("search-panel");
	};

	const syncNavbarSearchState = (): void => {
		const navbar = document.getElementById("navbar");
		if (isDesktopSearchExpanded) {
			navbar?.classList.add("is-searching");
		} else {
			navbar?.classList.remove("is-searching");
		}
	};

	const scheduleSearch = (): void => {
		if (!initialized) return;
		const keyword = keywordDesktop || keywordMobile;
		const isDesktop = !!keywordDesktop || isDesktopSearchExpanded;

		clearTimeout(debounceTimer);
		if (keyword) {
			debounceTimer = setTimeout(() => {
				search(keyword, isDesktop);
			}, 300);
		} else {
			result = [];
			setPanelVisibility(false, isDesktop);
		}
	};

	const toggleDesktopSearch = () => {
		// 如果窗口刚获得焦点，不自动展开搜索框
		if (windowJustFocused) {
			return;
		}
		isDesktopSearchExpanded = !isDesktopSearchExpanded;
		syncNavbarSearchState();
		if (isDesktopSearchExpanded) {
			setTimeout(() => {
				const input = document.getElementById(
					"search-input-desktop",
				) as HTMLInputElement;
				input?.focus();
			}, 0);
		}
	};

	const collapseDesktopSearch = () => {
		if (!keywordDesktop) {
			isDesktopSearchExpanded = false;
			syncNavbarSearchState();
		}
	};

	const handleBlur = () => {
		// 延迟处理以允许搜索结果的点击事件先于折叠逻辑执行
		blurTimer = setTimeout(() => {
			isDesktopSearchExpanded = false;
			syncNavbarSearchState();
			// 仅隐藏面板并折叠，保留搜索关键词和结果以便下次展开时查看
			setPanelVisibility(false, true);
		}, 200);
	};

	const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
		const panel = document.getElementById("search-panel");
		if (!panel || !isDesktop) return;
		if (show) {
			void panelManager.closeAllPanelsExcept("search-panel");
			panel.classList.remove("float-panel-closed");
		} else {
			panel.classList.add("float-panel-closed");
		}
	};

	const closeSearchPanel = (): void => {
		const panel = document.getElementById("search-panel");
		if (panel) {
			panel.classList.add("float-panel-closed");
		}
		// 清空搜索关键词和结果
		keywordDesktop = "";
		keywordMobile = "";
		result = [];
	};

	const handleResultClick = (event: Event, url: string): void => {
		event.preventDefault();
		closeSearchPanel();
		navigateToPage(url);
	};

	const search = async (
		keyword: string,
		isDesktop: boolean,
	): Promise<void> => {
		if (!keyword) {
			setPanelVisibility(false, isDesktop);
			result = [];
			return;
		}
		if (!initialized) {
			return;
		}
		try {
			let searchResults: SearchResult[] = [];
			if (import.meta.env.PROD && pagefindLoaded && window.pagefind) {
				const response = await window.pagefind.search(keyword);
				searchResults = await Promise.all(
					response.results.map((item) => item.data()),
				);
			} else if (import.meta.env.DEV) {
				searchResults = fakeResult;
			} else {
				searchResults = [];
				console.error(
					"Pagefind is not available in production environment.",
				);
			}
			result = searchResults;
			setPanelVisibility(result.length > 0, isDesktop);
		} catch (error) {
			console.error("Search error:", error);
			result = [];
			setPanelVisibility(false, isDesktop);
		}
	};

	onMount(() => {
		const initializeSearch = () => {
			initialized = true;
			pagefindLoaded =
				typeof window !== "undefined" &&
				!!window.pagefind &&
				typeof window.pagefind.search === "function";
			console.log("Pagefind status on init:", pagefindLoaded);
		};
		if (import.meta.env.DEV) {
			console.log(
				"Pagefind is not available in development mode. Using mock data.",
			);
			initializeSearch();
		} else {
			document.addEventListener("pagefindready", () => {
				console.log("Pagefind ready event received.");
				initializeSearch();
			});
			document.addEventListener("pagefindloaderror", () => {
				console.warn(
					"Pagefind load error event received. Search functionality will be limited.",
				);
				initializeSearch(); // Initialize with pagefindLoaded as false
			});
			// Fallback in case events are not caught or pagefind is already loaded by the time this script runs
			setTimeout(() => {
				if (!initialized) {
					console.log("Fallback: Initializing search after timeout.");
					initializeSearch();
				}
			}, 2000); // Adjust timeout as needed
		}

		// 监听窗口焦点事件，防止切换窗口时自动展开搜索框
		const handleFocus = () => {
			windowJustFocused = true;
			clearTimeout(focusTimer);
			focusTimer = setTimeout(() => {
				windowJustFocused = false;
			}, 500); // 500ms 后才允许 mouseenter 触发展开
		};

		window.addEventListener("focus", handleFocus);

		return () => {
			window.removeEventListener("focus", handleFocus);
		};
	});

	onDestroy(() => {
		if (typeof document !== "undefined") {
			const navbar = document.getElementById("navbar");
			navbar?.classList.remove("is-searching");
		}
		clearTimeout(debounceTimer);
		clearTimeout(focusTimer);
	});
</script>

<!-- search bar for desktop view (collapsed by default) -->
<div class="hidden lg:block relative w-11 h-11 shrink-0">
	<div
		id="search-bar"
		class="flex transition-all items-center h-11 rounded-(--navbar-control-radius) absolute right-0 top-0 shrink-0
            {isDesktopSearchExpanded
			? 'search-bar-bg'
			: 'btn-plain active:scale-90'}
            {isDesktopSearchExpanded ? 'w-48' : 'w-11'}"
		role="button"
		tabindex="0"
		aria-label="Search"
		onmouseenter={() => {
			if (!isDesktopSearchExpanded) toggleDesktopSearch();
		}}
		onmouseleave={collapseDesktopSearch}
		onclick={() => {
			const input = document.getElementById(
				"search-input-desktop",
			) as HTMLInputElement;
			input?.focus();
		}}
	>
		<LocalIcon
			name="material-symbols:search"
			class="absolute text-[1.25rem] pointer-events-none {isDesktopSearchExpanded
				? 'left-3'
				: 'left-1/2 -translate-x-1/2'} transition top-1/2 -translate-y-1/2 {isDesktopSearchExpanded
				? 'search-icon-color'
				: ''}"
		/>
		<input
			id="search-input-desktop"
			placeholder={i18n(I18nKey.search)}
			bind:value={keywordDesktop}
			oninput={() => setTimeout(scheduleSearch)}
			onfocus={() => {
				clearTimeout(blurTimer);
				if (!isDesktopSearchExpanded) toggleDesktopSearch();
				search(keywordDesktop, true);
			}}
			onblur={handleBlur}
			class="transition-all pl-10 text-sm bg-transparent outline-0
                h-full {isDesktopSearchExpanded
				? 'w-36'
				: 'w-0'} search-input-color"
		/>
	</div>
</div>

<!-- toggle btn for phone/tablet view -->
<button
	onclick={togglePanel}
	aria-label="Search Panel"
	id="search-switch"
	class="btn-plain scale-animation lg:hidden! rounded-(--navbar-control-radius) w-11 h-11 active:scale-90"
>
	<LocalIcon name="material-symbols:search" class="text-[1.25rem]" />
</button>

<!-- search panel -->
<div
	id="search-panel"
	class="float-panel float-panel-closed ds-surface-raised absolute md:w-120 top-20 left-4 md:left-[unset] right-4 z-50 search-panel shadow-2xl rounded-2xl p-2"
>
	<!-- search bar inside panel for phone/tablet -->
	<div
		id="search-bar-inside"
		class="flex relative lg:hidden transition-all items-center h-11 rounded-xl search-bar-bg"
	>
		<LocalIcon
			name="material-symbols:search"
			class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto search-icon-color"
		/>
		<input
			placeholder={i18n(I18nKey.search)}
			bind:value={keywordMobile}
			oninput={() => setTimeout(scheduleSearch)}
			class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               focus:w-60 search-input-color"
		/>
	</div>
	<!-- search results -->
	{#each result as item (item.url)}
		<a
			href={item.url}
			onclick={(e) => handleResultClick(e, item.url)}
			class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
       rounded-xl text-lg px-3 py-2 hover:bg-(--btn-plain-bg-hover) active:bg-(--btn-plain-bg-active)"
		>
			<div
				class="transition text-90 inline-flex font-bold group-hover:text-(--primary)"
			>
				{item.meta.title}<LocalIcon
					name="fa7-solid:chevron-right"
					class="transition text-[0.75rem] translate-x-1 my-auto text-(--primary)"
				/>
			</div>
			<div class="transition text-sm text-50">
				<!-- HTML is sanitized by sanitizeExcerpt; only attribute-free <mark> tags are preserved. -->
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html sanitizeExcerpt(item.excerpt)}
			</div>
		</a>
	{/each}
</div>

<style>
	@reference "../styles/main.css";

	input:focus {
		outline: 0;
	}
	:global(.search-panel) {
		max-height: calc(100vh - 100px);
		overflow-y: auto;
	}
	.search-bar-bg {
		@apply bg-black/4 hover:bg-black/6 focus-within:bg-black/6 dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10;
	}
	.search-icon-color {
		@apply text-black/30 dark:text-white/30;
	}
	.search-input-color {
		@apply text-black/50 dark:text-white/50;
	}
</style>
