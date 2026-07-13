import { onMount } from "svelte";
import { derived, writable } from "svelte/store";
import type {
	CategoryPaginationOptions,
	CategoryPaginationResult,
	CategoryPaginationState,
	UIPagination,
	UIPost,
} from "@components/post/types";

function parseUrl(): CategoryPaginationState {
	const url = new URL(window.location.href);
	const tag = url.searchParams.get("tag") || "";
	const tagPage = Number(url.searchParams.get("tagPage") ?? 1);
	const pageMatch = url.pathname.match(/\/page\/(\d+)/);
	return {
		tag,
		isTagMode: Boolean(tag),
		page: pageMatch ? Number(pageMatch[1]) : 1,
		tagPage,
	};
}

function buildPage<T>(
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

export function useCategoryPagination(
	options: CategoryPaginationOptions,
): CategoryPaginationResult {
	const state = writable<CategoryPaginationState>({
		isTagMode: false,
		tag: "",
		page: 1,
		tagPage: 1,
	});
	const filteredPosts = derived(state, ($state) =>
		!$state.isTagMode || !$state.tag
			? options.posts
			: options.posts.filter((post) =>
					post.tags?.some((tag) => tag.slug === $state.tag),
				),
	);
	const page = derived([filteredPosts, state], ([$posts, $state]) =>
		buildPage<UIPost>(
			$posts,
			$state.isTagMode ? $state.tagPage : $state.page,
			options.pageSize,
		),
	);

	onMount(() => {
		const sync = () => state.set(parseUrl());
		sync();
		window.addEventListener("popstate", sync);
		return () => window.removeEventListener("popstate", sync);
	});

	return { state, page, filteredPosts };
}
