<script lang="ts">
	import LocalIcon from "@/components/ui/LocalIcon.svelte";
	import { onMount } from "svelte";
	import { slide } from "svelte/transition";
	import I18nKey from "../i18n/i18nKey";
	import { i18n } from "../i18n/translation";
	import { navigateToPage } from "../utils/navigation-utils";
	import { panelManager } from "../utils/panel-manager.js";
	import { buildTocGraph, getTocBranchIndexes } from "./post-toc/toc-graph";
	import {
		TocActiveTracker,
		onPostTocRefresh,
		resolveTocRuntimeState,
		scrollToHeading as scrollToPostHeading,
		type TocItem,
	} from "./post-toc/toc-runtime";
	import { resolveTocBranchView } from "./post-toc/toc-view";

	let tocItems: TocItem[] = [];
	let postItems: Array<{
		title: string;
		url: string;
		category?: string;
		pinned?: boolean;
	}> = [];
	let activeId = "";
	let isHomePage = false;
	let swupReady = false;
	let activeIndex = -1;

	let tocHeadings: HTMLElement[] = [];
	const activeTracker = new TocActiveTracker();

	$: tocGraph = buildTocGraph(tocItems);
	$: tocBranchView = resolveTocBranchView(tocGraph, activeIndex, {
		rootsOnly: activeIndex < 0,
	});
	$: rootTocItems = tocGraph.rootIndexes.map((index) => ({
		item: tocItems[index],
		index,
	}));

	const getExpandedTocItems = (rootIndex: number) =>
		getTocBranchIndexes(tocGraph, rootIndex)
			.filter((index) => index !== rootIndex)
			.map((index) => ({
				item: tocItems[index],
				index,
			}));

	const togglePanel = async () => {
		await panelManager.togglePanel("mobile-toc-panel");
	};

	const setPanelVisibility = async (show: boolean): Promise<void> => {
		await panelManager.togglePanel("mobile-toc-panel", show);
	};

	const generateTOC = (runtimeRoot?: Element) => {
		const state = resolveTocRuntimeState(runtimeRoot);
		tocItems = state.items;
		tocHeadings = state.headings;
		activeTracker.setState(tocItems, tocHeadings);
		activeIndex = -1;
	};

	const generatePostList = () => {
		// 查找所有文章卡片
		const postCards = document.querySelectorAll(".card-base");
		const items: Array<{
			title: string;
			url: string;
			category?: string;
			pinned?: boolean;
		}> = [];

		postCards.forEach((card) => {
			// 查找标题链接
			const titleLink = card.querySelector(
				'a[href*="/posts/"].transition.group',
			);
			// 查找分类链接
			const categoryLink = card.querySelector(
				'a[href*="/categories/"].link-lg',
			);
			// 查找置顶图标
			const pinnedIcon = titleLink?.querySelector(
				'[data-local-icon="mdi:pin"]',
			);

			if (titleLink) {
				const href = titleLink.getAttribute("href");
				const title =
					titleLink.textContent?.replace(/\s+/g, " ").trim() || "";
				const category = categoryLink?.textContent?.trim() || "";
				const pinned = !!pinnedIcon;

				if (href && title) {
					items.push({ title, url: href, category, pinned });
				}
			}
		});

		postItems = items;
	};

	const checkIsHomePage = () => {
		const pathname = window.location.pathname;
		// 检查是否为首页或首页的分页页面
		// 分页格式：/, /2/, /3/, 等等
		isHomePage =
			pathname === "/" || pathname === "" || /^\/\d+\/?$/.test(pathname);
	};

	const scrollToHeading = (id: string) => {
		scrollToPostHeading(id, { close: () => setPanelVisibility(false) });
	};

	const navigateToPost = (url: string) => {
		// 关闭面板
		setPanelVisibility(false);

		// 使用统一的导航工具函数，实现无刷新跳转
		navigateToPage(url);
	};

	const updateActiveHeading = () => {
		activeIndex = activeTracker.update();
		activeId = activeTracker.nodes[activeIndex]?.id ?? "";
	};

	const handleResize = () => {
		activeTracker.measure();
		updateActiveHeading();
	};

	let swupListenersRegistered = false;
	let swupPageViewHandler: (() => void) | null = null;
	let popstateHandler: (() => void) | null = null;

	const setupSwupListeners = () => {
		if (
			typeof window !== "undefined" &&
			window.swup &&
			!swupListenersRegistered
		) {
			const swup = window.swup;

			// 只监听页面视图事件，避免重复触发
			swupPageViewHandler = () => {
				// 延迟执行，确保页面已完全加载
				setTimeout(() => {
					init();
				}, 200);
			};
			swup.hooks.on("page:view", swupPageViewHandler);

			swupListenersRegistered = true;
		} else if (!swupListenersRegistered) {
			// 降级处理：监听普通页面切换事件
			popstateHandler = () => {
				setTimeout(init, 200);
			};
			window.addEventListener("popstate", popstateHandler);
			swupListenersRegistered = true;
		}
	};

	const checkSwupAvailability = () => {
		if (typeof window !== "undefined") {
			// 检查Swup是否已加载
			swupReady = !!window.swup;

			// 如果Swup还未加载，监听其加载事件
			if (!swupReady) {
				const checkSwup = () => {
					if (window.swup) {
						swupReady = true;
						document.removeEventListener("swup:enable", checkSwup);
						// Swup加载完成后设置监听器
						setupSwupListeners();
					}
				};

				// 监听Swup启用事件
				document.addEventListener("swup:enable", checkSwup);

				// 设置超时检查
				setTimeout(() => {
					if (window.swup) {
						swupReady = true;
						document.removeEventListener("swup:enable", checkSwup);
						// Swup加载完成后设置监听器
						setupSwupListeners();
					}
				}, 1000);
			} else {
				// Swup已经加载，直接设置监听器
				setupSwupListeners();
			}
		}
	};

	const init = (runtimeRoot?: Element) => {
		checkIsHomePage();
		checkSwupAvailability();
		if (isHomePage) {
			generatePostList();
		} else {
			generateTOC(runtimeRoot);
			updateActiveHeading();
		}
	};

	onMount(() => {
		// 延迟初始化，确保页面内容已加载
		setTimeout(init, 100);
		const removeTocRefreshListener = onPostTocRefresh(({ root }) => {
			init(root);
		});

		// 监听滚动事件作为备用
		window.addEventListener("scroll", updateActiveHeading);
		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("scroll", updateActiveHeading);
			window.removeEventListener("resize", handleResize);

			// 清理Swup事件监听器
			if (
				typeof window !== "undefined" &&
				window.swup &&
				swupPageViewHandler
			) {
				window.swup.hooks.off("page:view", swupPageViewHandler);
			}

			// 清理popstate事件监听器
			if (popstateHandler) {
				window.removeEventListener("popstate", popstateHandler);
			}
			removeTocRefreshListener();
			swupListenersRegistered = false;
			swupPageViewHandler = null;
			popstateHandler = null;
		};
	});

	// 导出初始化函数供外部调用
	if (typeof window !== "undefined") {
		window.mobileTOCInit = init;
	}
</script>

<!-- TOC toggle button for mobile -->
<button
	on:click={togglePanel}
	aria-label="Table of Contents"
	id="mobile-toc-switch"
	class="btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90 lg:hidden! theme-switch-btn"
>
	<LocalIcon
		name="material-symbols:format-list-bulleted"
		class="text-[1.25rem]"
	/>
</button>

<!-- Mobile TOC Panel -->
<div
	id="mobile-toc-panel"
	class="float-panel float-panel-closed mobile-toc-panel scrollbar-thin absolute md:w-[20rem] w-[calc(100vw-2rem)]
		top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-4"
>
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-bold text-(--primary)">
			{isHomePage
				? i18n(I18nKey.postList)
				: i18n(I18nKey.tableOfContents)}
		</h3>
		<button
			on:click={togglePanel}
			aria-label="Close TOC"
			class="btn-plain rounded-lg h-8 w-8 active:scale-90 theme-switch-btn"
		>
			<LocalIcon name="material-symbols:close" class="text-[1rem]" />
		</button>
	</div>

	{#if isHomePage}
		{#if postItems.length === 0}
			<div class="text-center py-8 text-black/50 dark:text-white/50">
				<LocalIcon
					name="material-symbols:article-outline"
					class="text-2xl mb-2"
				/>
				<p>暂无文章</p>
			</div>
		{:else}
			<div class="post-content">
				{#each postItems as post (post.url)}
					<button
						on:click={() => navigateToPost(post.url)}
						class="post-item"
					>
						<div class="post-title">
							{#if post.pinned}
								<LocalIcon name="mdi:pin" class="pinned-icon" />
							{/if}
							{post.title}
						</div>
						{#if post.category}
							<div class="post-category">{post.category}</div>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	{:else if tocItems.length === 0}
		<div class="text-center py-8 text-black/50 dark:text-white/50">
			<p>{i18n(I18nKey.tocEmpty)}</p>
		</div>
	{:else}
		<div class="toc-content">
			{#each rootTocItems as { item, index } (item.id)}
				<button
					on:click={() => scrollToHeading(item.id)}
					class="toc-item level-{item.depth} {activeId === item.id
						? 'active'
						: ''}"
					class:active={activeId === item.id}
				>
					{#if item.badgeKind === "text"}
						<span class="badge">{item.badge}</span>
					{:else if item.badgeKind === "square"}
						<span class="dot-square"></span>
					{:else}
						<span class="dot-small"></span>
					{/if}
					<span class="toc-text">{item.text}</span>
				</button>
				{#if tocBranchView.activeRootIndex === index}
					<div
						class="toc-expanded-region"
						transition:slide={{ duration: 260 }}
					>
						{#each getExpandedTocItems(index) as { item: child } (child.id)}
							<button
								on:click={() => scrollToHeading(child.id)}
								class="toc-item level-{child.depth} {activeId ===
								child.id
									? 'active'
									: ''}"
								class:active={activeId === child.id}
							>
								{#if child.badgeKind === "text"}
									<span class="badge">{child.badge}</span>
								{:else if child.badgeKind === "square"}
									<span class="dot-square"></span>
								{:else}
									<span class="dot-small"></span>
								{/if}
								<span class="toc-text">{child.text}</span>
							</button>
						{/each}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.mobile-toc-panel {
		max-height: calc(100vh - 120px);
		overflow-y: auto;
		background: var(--card-bg);
		border: 1px solid var(--line-color);
		backdrop-filter: blur(10px);
	}

	/* 确保主题切换按钮的背景色即时更新 */
	:global(.theme-switch-btn)::before {
		transition:
			transform 75ms ease-out,
			background-color 0ms !important;
	}

	.toc-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.post-content {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.toc-expanded-region {
		overflow: hidden;
	}

	.toc-item {
		display: flex;
		align-items: center;
		width: 100%;
		text-align: left;
		padding: 8px 12px;
		border-radius: 8px;
		transition: all 0.2s ease;
		border: none;
		background: transparent;
		cursor: pointer;
		color: rgba(0, 0, 0, 0.75);
		font-size: 0.9rem;
		line-height: 1.4;
	}

	:global(.dark) .toc-item {
		color: rgba(255, 255, 255, 0.75);
	}

	.toc-item:hover {
		background: var(--btn-plain-bg-hover);
		color: var(--primary);
	}

	.toc-item.active {
		background: var(--btn-plain-bg-active);
		color: var(--primary);
		font-weight: 600;
		border-left: 3px solid var(--primary);
		padding-left: 9px;
	}

	/* 不同级别的标题缩进 */
	.toc-item.level-1 {
		padding-left: 12px;
		font-weight: 600;
		font-size: 1rem;
		gap: 8px;
	}

	.toc-item.level-2 {
		padding-left: 28px;
		gap: 6px;
	}

	.toc-item.level-3 {
		padding-left: 36px;
		font-size: 0.85rem;
		gap: 6px;
	}

	.toc-item.level-4 {
		padding-left: 44px;
		font-size: 0.8rem;
		gap: 6px;
	}

	.toc-item.level-5,
	.toc-item.level-6 {
		padding-left: 52px;
		font-size: 0.75rem;
		color: rgba(0, 0, 0, 0.5);
		gap: 6px;
	}

	:global(.dark) .toc-item.level-5,
	:global(.dark) .toc-item.level-6 {
		color: rgba(255, 255, 255, 0.5);
	}

	.toc-item.level-1.active {
		padding-left: 9px;
	}

	.toc-item.level-2.active {
		padding-left: 25px;
	}

	.toc-item.level-3.active {
		padding-left: 33px;
	}

	.toc-item.level-4.active {
		padding-left: 41px;
	}

	.toc-item.level-5.active,
	.toc-item.level-6.active {
		padding-left: 49px;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		padding: 0 4px;
		border-radius: 6px;
		background: var(--toc-badge-bg);
		color: var(--btn-content);
		font-size: 0.8rem;
		font-weight: 600;
		flex-shrink: 0;
		line-height: 1;
	}

	.dot-square {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 2px;
		background: var(--toc-badge-bg);
		flex-shrink: 0;
	}

	.dot-small {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 2px;
		background: rgba(0, 0, 0, 0.05);
		flex-shrink: 0;
	}

	:global(.dark) .dot-small {
		background: rgba(255, 255, 255, 0.1);
	}

	.toc-text {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.post-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 12px;
		border-radius: 8px;
		transition: all 0.2s ease;
		border: none;
		background: transparent;
		cursor: pointer;
		border: 1px solid var(--line-color);
	}

	.post-item:hover {
		background: var(--btn-plain-bg-hover);
		border-color: var(--primary);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.post-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: rgba(0, 0, 0, 0.75);
		margin-bottom: 4px;
		line-height: 1.4;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.dark) .post-title {
		color: rgba(255, 255, 255, 0.75);
	}

	.post-category {
		font-size: 0.75rem;
		color: rgba(0, 0, 0, 0.5);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.dark) .post-category {
		color: rgba(255, 255, 255, 0.5);
	}

	:global(.pinned-icon) {
		display: inline;
		color: var(--primary);
		font-size: 1.25rem;
		margin-right: 0.5rem;
		transform: translateY(-0.125rem);
		vertical-align: middle;
	}

	.post-item:hover .post-title {
		color: var(--primary);
	}

	.post-item:hover .post-category {
		color: rgba(0, 0, 0, 0.75);
	}

	:global(.dark) .post-item:hover .post-category {
		color: rgba(255, 255, 255, 0.75);
	}
</style>
