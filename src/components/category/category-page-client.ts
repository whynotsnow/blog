import { onMount } from "svelte";
import { derived, writable, type Readable, type Writable } from "svelte/store";
import type { ClientPostCard } from "@/services/category-page";
import type { UIPagination } from "@components/post/types";

export type CategoryPaginationState = {
	isTagMode: boolean;
	tag: string;
	page: number;
	tagPage: number;
};

export type CategoryIndexLoadState = "idle" | "loading" | "ready" | "error";

export type CategoryPaginationOptions = {
	tagIndexUrl: string;
	validTagSlugs: readonly string[];
	pageSize: number;
};

export type CategoryPaginationResult = {
	state: Writable<CategoryPaginationState>;
	page: Readable<UIPagination<ClientPostCard>>;
	loadState: Readable<CategoryIndexLoadState>;
	retry: () => Promise<void>;
};

type Fetcher = typeof fetch;
type FetchPriority = "auto" | "low";

export type CategoryIndexPrefetchConditions = {
	isVisible: boolean;
	isOnline: boolean;
	saveData: boolean;
	effectiveType?: string;
};

type NetworkInformationLike = {
	saveData?: boolean;
	effectiveType?: string;
};

const MAX_CACHED_CATEGORY_INDEXES = 3;
const tagIndexCache = new Map<string, Promise<ClientPostCard[]>>();

function touchCategoryTagIndexCache(
	indexUrl: string,
	request: Promise<ClientPostCard[]>,
): void {
	// Category Tag 索引按 URL 做小型 LRU，避免多个分类页切换时长期保留所有 JSON。
	tagIndexCache.delete(indexUrl);
	tagIndexCache.set(indexUrl, request);

	while (tagIndexCache.size > MAX_CACHED_CATEGORY_INDEXES) {
		const oldestIndexUrl = tagIndexCache.keys().next().value;
		if (typeof oldestIndexUrl !== "string") return;
		tagIndexCache.delete(oldestIndexUrl);
	}
}

function getNetworkInformation(): NetworkInformationLike | undefined {
	return (
		navigator as Navigator & {
			connection?: NetworkInformationLike;
		}
	).connection;
}

export function shouldPrefetchCategoryTagIndex({
	isVisible,
	isOnline,
	saveData,
	effectiveType,
}: CategoryIndexPrefetchConditions): boolean {
	return (
		isVisible &&
		isOnline &&
		!saveData &&
		effectiveType !== "slow-2g" &&
		effectiveType !== "2g"
	);
}

export function parseCategoryUrl(href: string): CategoryPaginationState {
	const currentUrl = new URL(href);
	const tag = currentUrl.searchParams.get("tag")?.trim() ?? "";
	const rawTagPage = Number(currentUrl.searchParams.get("tagPage") ?? 1);
	const pageMatch = currentUrl.pathname.match(/\/page\/(\d+)/);

	return {
		tag,
		isTagMode: Boolean(tag),
		page: pageMatch ? Number(pageMatch[1]) : 1,
		tagPage:
			Number.isFinite(rawTagPage) && rawTagPage >= 1
				? Math.floor(rawTagPage)
				: 1,
	};
}

export function buildPage<T>(
	data: T[],
	currentPage: number,
	pageSize: number,
): UIPagination<T> {
	const total = data.length;
	const lastPage = Math.max(1, Math.ceil(total / pageSize));
	const safePage = Math.min(Math.max(1, currentPage), lastPage);
	const start = (safePage - 1) * pageSize;

	return {
		data: data.slice(start, start + pageSize),
		start,
		end: Math.min(start + pageSize, total),
		size: pageSize,
		total,
		currentPage: safePage,
		lastPage,
	};
}

export function loadCategoryTagIndex(
	indexUrl: string,
	fetcher: Fetcher = fetch,
	priority: FetchPriority = "auto",
): Promise<ClientPostCard[]> {
	const cached = tagIndexCache.get(indexUrl);
	if (cached) {
		touchCategoryTagIndexCache(indexUrl, cached);
		return cached;
	}

	const requestInit: RequestInit & { priority?: FetchPriority } = {
		headers: { Accept: "application/json" },
	};
	if (priority === "low") requestInit.priority = "low";

	const request = fetcher(indexUrl, requestInit)
		.then(async (response) => {
			if (!response.ok) {
				throw new Error(
					`Category tag index request failed: ${response.status}`,
				);
			}

			const data: unknown = await response.json();
			if (!Array.isArray(data)) {
				throw new Error("Category tag index response is not an array");
			}

			return data as ClientPostCard[];
		})
		.catch((error: unknown) => {
			// 只清除当前失败的同一个 Promise，避免新请求被旧失败回调误删。
			if (tagIndexCache.get(indexUrl) === request) {
				tagIndexCache.delete(indexUrl);
			}
			throw error;
		});

	touchCategoryTagIndexCache(indexUrl, request);
	return request;
}

export function scheduleCategoryTagIndexPrefetch(indexUrl: string): () => void {
	let idleCallbackId: number | undefined;
	let fallbackTimerId: number | undefined;
	let disposed = false;

	const prefetch = () => {
		if (disposed) return;
		const connection = getNetworkInformation();
		// 预取只服务无 Tag 的初始页，且尊重可见性、离线状态和 Save-Data。
		if (
			!shouldPrefetchCategoryTagIndex({
				isVisible: document.visibilityState === "visible",
				isOnline: navigator.onLine,
				saveData: connection?.saveData === true,
				effectiveType: connection?.effectiveType,
			})
		) {
			return;
		}

		void loadCategoryTagIndex(indexUrl, fetch, "low").catch(
			() => undefined,
		);
	};

	const scheduleWhenIdle = () => {
		if (disposed) return;
		const idleWindow = window as Window & {
			requestIdleCallback?: Window["requestIdleCallback"];
		};
		if (idleWindow.requestIdleCallback) {
			idleCallbackId = idleWindow.requestIdleCallback(prefetch, {
				timeout: 4000,
			});
			return;
		}

		fallbackTimerId = window.setTimeout(prefetch, 1500);
	};

	if (document.readyState === "complete") {
		scheduleWhenIdle();
	} else {
		window.addEventListener("load", scheduleWhenIdle, { once: true });
	}

	return () => {
		disposed = true;
		window.removeEventListener("load", scheduleWhenIdle);
		if (idleCallbackId !== undefined) {
			window.cancelIdleCallback(idleCallbackId);
		}
		if (fallbackTimerId !== undefined) {
			window.clearTimeout(fallbackTimerId);
		}
	};
}

export function clearCategoryTagIndexCache(): void {
	tagIndexCache.clear();
}

export function useCategoryPagination(
	options: CategoryPaginationOptions,
): CategoryPaginationResult {
	const validTagSlugs = new Set(options.validTagSlugs);
	const state = writable<CategoryPaginationState>({
		isTagMode: false,
		tag: "",
		page: 1,
		tagPage: 1,
	});
	const posts = writable<ClientPostCard[]>([]);
	const loadState = writable<CategoryIndexLoadState>("idle");
	let syncVersion = 0;

	const filteredPosts = derived([posts, state], ([$posts, $state]) =>
		$state.isTagMode && validTagSlugs.has($state.tag)
			? $posts.filter((post) =>
					post.tags.some((tag) => tag.slug === $state.tag),
				)
			: [],
	);
	const page = derived([filteredPosts, state], ([$posts, $state]) =>
		buildPage($posts, $state.tagPage, options.pageSize),
	);

	async function syncFromUrl(forceReload = false): Promise<void> {
		const nextState = parseCategoryUrl(window.location.href);
		const version = ++syncVersion;
		state.set(nextState);

		if (!nextState.isTagMode) {
			loadState.set("idle");
			return;
		}

		if (!validTagSlugs.has(nextState.tag)) {
			posts.set([]);
			loadState.set("ready");
			return;
		}

		if (forceReload) tagIndexCache.delete(options.tagIndexUrl);
		loadState.set("loading");

		try {
			const loadedPosts = await loadCategoryTagIndex(options.tagIndexUrl);
			// URL 已变化时丢弃旧响应，避免慢请求覆盖新的 Tag 分页状态。
			if (version !== syncVersion) return;
			posts.set(loadedPosts);
			loadState.set("ready");
		} catch {
			// 错误态同样受版本保护，旧请求失败不应影响当前页面。
			if (version !== syncVersion) return;
			posts.set([]);
			loadState.set("error");
		}
	}

	onMount(() => {
		const initialState = parseCategoryUrl(window.location.href);
		void syncFromUrl();
		const cancelPrefetch = initialState.isTagMode
			? () => undefined
			: scheduleCategoryTagIndexPrefetch(options.tagIndexUrl);
		const sync = () => void syncFromUrl();
		window.addEventListener("popstate", sync);
		return () => {
			cancelPrefetch();
			window.removeEventListener("popstate", sync);
		};
	});

	return {
		state,
		page,
		loadState,
		retry: () => syncFromUrl(true),
	};
}
