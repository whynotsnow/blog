import { onMount } from "svelte";
import { writable, derived } from "svelte/store";
import { toSlug } from "@/utils/client-utils";
import {
  UIPagination,
  CategoryPaginationOptions,
  CategoryPaginationResult,
  CategoryPaginationState,
} from "./types";

function parseUrl() {
  const url = new URL(window.location.href);

  const tag = url.searchParams.get("tag") || "";
  const tagPage = Number(url.searchParams.get("tagPage") ?? 1);

  const pageMatch = url.pathname.match(/\/page\/(\d+)/);
  const page = pageMatch ? Number(pageMatch[1]) : 1;

  return {
    tag,
    isTagMode: !!tag,
    page,
    tagPage,
  };
}

function buildPage<T>(data: T[], currentPage: number, pageSize: number): UIPagination<T> {
  const total = data.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  return {
    data: data.slice(start, end),
    start,
    end,
    size: pageSize,
    total,
    currentPage,
    lastPage,
  };
}

export function useCategoryPagination(
  options: CategoryPaginationOptions,
): CategoryPaginationResult {
  const { posts, pageSize } = options;

  const state = writable<CategoryPaginationState>({
    isTagMode: false,
    tag: "",
    page: 1,
    tagPage: 1,
  });

  const filteredPosts = derived(state, ($state) => {
    if (!$state.isTagMode || !$state.tag) return posts;
    return posts.filter((post) => post.tags?.some((t) => toSlug(t.slug) === $state.tag));
  });

  const page = derived([filteredPosts, state], ([$filtered, $state]) => {
    const currentPage = $state.isTagMode ? $state.tagPage : $state.page;

    return buildPage($filtered, currentPage, pageSize);
  });

  onMount(() => {
    const { tag, isTagMode, page, tagPage } = parseUrl();
    state.set({ tag, isTagMode, page, tagPage });
  });
  return {
    state,
    page,
    filteredPosts,
  };
}
