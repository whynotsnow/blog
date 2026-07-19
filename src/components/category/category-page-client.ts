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

const tagIndexCache = new Map<string, Promise<ClientPostCard[]>>();

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
): Promise<ClientPostCard[]> {
	const cached = tagIndexCache.get(indexUrl);
	if (cached) return cached;

	const request = fetcher(indexUrl, {
		headers: { Accept: "application/json" },
	})
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
			tagIndexCache.delete(indexUrl);
			throw error;
		});

	tagIndexCache.set(indexUrl, request);
	return request;
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
			if (version !== syncVersion) return;
			posts.set(loadedPosts);
			loadState.set("ready");
		} catch {
			if (version !== syncVersion) return;
			posts.set([]);
			loadState.set("error");
		}
	}

	onMount(() => {
		void syncFromUrl();
		const sync = () => void syncFromUrl();
		window.addEventListener("popstate", sync);
		return () => window.removeEventListener("popstate", sync);
	});

	return {
		state,
		page,
		loadState,
		retry: () => syncFromUrl(true),
	};
}
