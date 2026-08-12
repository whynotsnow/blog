<script lang="ts">
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import { navigateToPage } from "@utils/navigation-utils";
	import { panelManager } from "@utils/panel-manager";
	import { url } from "@utils/url";
	import { onMount, onDestroy } from "svelte";
	import type { PagefindInstance, SearchResult } from "@/global";

	let keywordDesktop = $state("");
	let keywordMobile = $state("");
	let result: SearchResult[] = $state([]);
	let searchMessage = $state("");
	let searchStatus = $state<
		| "idle"
		| "loading"
		| "ready"
		| "searching"
		| "empty"
		| "unavailable"
		| "error"
	>("idle");
	let pagefind: PagefindInstance | null = null;
	let isDesktopSearchExpanded = $state(false);
	let debounceTimer: NodeJS.Timeout;
	let windowJustFocused = false;
	let focusTimer: NodeJS.Timeout;
	let blurTimer: NodeJS.Timeout;

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

	const loadPagefind = async (): Promise<PagefindInstance | null> => {
		if (import.meta.env.DEV) {
			return null;
		}

		if (window.pagefind?.search) {
			return window.pagefind;
		}

		window.__pagefindLoadPromise ??= (async () => {
			const pagefindModule = (await import(
				/* @vite-ignore */ url("/pagefind/pagefind.js")
			)) as PagefindInstance;
			await pagefindModule.options?.({
				excerptLength: 20,
			});
			window.pagefind = pagefindModule;
			return pagefindModule;
		})();

		return window.__pagefindLoadPromise;
	};

	const ensureSearchReady = async (): Promise<boolean> => {
		if (pagefind?.search) return true;

		searchStatus = "loading";
		try {
			pagefind = await loadPagefind();
			if (pagefind?.search) {
				searchStatus = "ready";
				searchMessage = "";
				return true;
			}
			searchStatus = "unavailable";
			searchMessage = import.meta.env.DEV
				? "搜索索引只在生产构建后可用，请使用 `pnpm build` 后预览。"
				: "搜索索引暂不可用，请稍后再试。";
			return false;
		} catch (error) {
			window.__pagefindLoadPromise = undefined;
			searchStatus = "error";
			searchMessage = "搜索索引加载失败，请稍后再试。";
			console.error("Failed to load Pagefind:", error);
			return false;
		}
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

	const scheduleSearch = (isDesktop: boolean): void => {
		const keyword = keywordDesktop || keywordMobile;

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

	const focusDesktopSearchInput = (): void => {
		const input = document.getElementById(
			"search-input-desktop",
		) as HTMLInputElement | null;
		input?.focus();
	};

	const toggleDesktopSearch = () => {
		// 如果窗口刚获得焦点，不自动展开搜索框
		if (windowJustFocused) {
			return;
		}
		isDesktopSearchExpanded = !isDesktopSearchExpanded;
		syncNavbarSearchState();
		if (isDesktopSearchExpanded) {
			setTimeout(focusDesktopSearchInput, 0);
		}
	};

	const collapseDesktopSearch = () => {
		if (!keywordDesktop) {
			isDesktopSearchExpanded = false;
			syncNavbarSearchState();
		}
	};

	const handleSearchBarKeydown = (event: KeyboardEvent): void => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		focusDesktopSearchInput();
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
		searchStatus = pagefind?.search ? "ready" : "idle";
		searchMessage = "";
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

		setPanelVisibility(true, isDesktop);
		const ready = await ensureSearchReady();
		if (!ready || !pagefind) {
			result = [];
			return;
		}

		try {
			searchStatus = "searching";
			const response = await pagefind.search(keyword);
			const searchResults = await Promise.all(
				response.results.map((item) => item.data()),
			);
			result = searchResults;
			searchStatus = result.length > 0 ? "ready" : "empty";
			searchMessage =
				result.length > 0 ? "" : `没有找到与“${keyword}”匹配的内容。`;
			setPanelVisibility(true, isDesktop);
		} catch (error) {
			console.error("Search error:", error);
			result = [];
			searchStatus = "error";
			searchMessage = "搜索失败，请稍后再试。";
			setPanelVisibility(true, isDesktop);
		}
	};

	onMount(() => {
		void ensureSearchReady();

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
		clearTimeout(blurTimer);
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
		onkeydown={handleSearchBarKeydown}
		onmouseenter={() => {
			if (!isDesktopSearchExpanded) toggleDesktopSearch();
		}}
		onmouseleave={collapseDesktopSearch}
		onclick={focusDesktopSearchInput}
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
			oninput={() => setTimeout(() => scheduleSearch(true))}
			onfocus={() => {
				clearTimeout(blurTimer);
				if (!isDesktopSearchExpanded) toggleDesktopSearch();
				search(keywordDesktop, true);
			}}
			onblur={handleBlur}
			class="search-input transition-all pl-10 bg-transparent outline-0
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
			oninput={() => setTimeout(() => scheduleSearch(false))}
			class="search-input pl-10 absolute inset-0 bg-transparent outline-0
               focus:w-60 search-input-color"
		/>
	</div>
	<!-- search results -->
	{#if searchStatus === "loading" || searchStatus === "searching" || searchMessage}
		<div class="search-state px-3 py-3 text-50">
			{#if searchStatus === "loading"}
				正在加载搜索索引...
			{:else if searchStatus === "searching"}
				正在搜索...
			{:else}
				{searchMessage}
			{/if}
		</div>
	{/if}
	{#each result as item, index (`${item.url}-${index}`)}
		<a
			href={item.url}
			onclick={(e) => handleResultClick(e, item.url)}
			class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
       rounded-xl search-result px-3 py-2 hover:bg-(--btn-plain-bg-hover) active:bg-(--btn-plain-bg-active)"
		>
			<div
				class="transition text-90 inline-flex font-bold group-hover:text-(--primary)"
			>
				{item.meta.title}<LocalIcon
					name="fa7-solid:chevron-right"
					class="transition text-[0.75rem] translate-x-1 my-auto text-(--primary)"
				/>
			</div>
			<div class="search-result__excerpt transition text-50">
				<!-- HTML is sanitized by sanitizeExcerpt; only attribute-free <mark> tags are preserved. -->
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html sanitizeExcerpt(item.excerpt)}
			</div>
		</a>
	{/each}
</div>

<style>
	input:focus {
		outline: 0;
	}
	:global(.search-panel) {
		max-height: calc(100vh - 100px);
		overflow-y: auto;
	}

	.search-input,
	.search-result__excerpt,
	.search-state {
		font-size: var(--text-ui-size);
	}

	.search-result {
		font-size: var(--text-section-title-size);
	}

	.search-bar-bg {
		background-color: rgb(0 0 0 / 4%);
	}

	.search-bar-bg:hover,
	.search-bar-bg:focus-within {
		background-color: rgb(0 0 0 / 6%);
	}

	:global(.dark) .search-bar-bg {
		background-color: rgb(255 255 255 / 5%);
	}

	:global(.dark) .search-bar-bg:hover,
	:global(.dark) .search-bar-bg:focus-within {
		background-color: rgb(255 255 255 / 10%);
	}

	:global(.search-icon-color) {
		color: rgb(0 0 0 / 30%);
	}

	:global(.dark .search-icon-color) {
		color: rgb(255 255 255 / 30%);
	}

	.search-input-color {
		color: rgb(0 0 0 / 50%);
	}

	:global(.dark) .search-input-color {
		color: rgb(255 255 255 / 50%);
	}
</style>
