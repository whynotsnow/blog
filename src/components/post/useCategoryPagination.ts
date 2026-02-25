import { onMount } from "svelte";
import { writable, derived, type Writable, type Readable } from "svelte/store";
import { toSlug } from "@/utils/client-utils";

export interface UIPagination<T> {
	data: T[];
	start: number;
	end: number;
	size: number;
	total: number;
	currentPage: number;
	lastPage: number;
	url?: {
		current?: string;
		first?: string;
		last?: string;
		prev?: string;
		next?: string;
	};
}
interface BaseSlug {
	label: string;
	slug: string;
}

export interface CategoryItem extends BaseSlug {}

// 标签类型（带 URL）
export interface TagItem extends BaseSlug {
	url: string; // 标签特有字段
}

export interface UIPost {
	// 基础标识
	id: string;
	slug: string; // 分类的slug
	url: string;

	// 文本内容
	title: string;
	description?: string;

	// 时间
	published: string; // ISO string（Client 友好）
	updated?: string;

	// 分类 & 标签
	category: CategoryItem;

	tags: TagItem[];
	pinned?: boolean;
	// 统计信息（PostMetadataView）
	meta: PostMeta;

	// UI 控制
	hasCoverImage?: boolean; // 给 PostCard / ImageWrapper 用
	image?: string;

	/**
	 * TODO:
	 * coverImage?: {
	 *   src: string;
	 *   alt?: string;
	 * }
	 */
	source?: "ssg" | "client";
}

export interface PostMeta {
	published: string; // ISO
	updated?: string;

	category: CategoryItem;

	tags: TagItem[];

	words?: number;
	excerpt?: string;

	/** 用于 PostMetadataView 的控制 */
	id?: string;
}

export interface CategoryPaginationOptions {
	posts: UIPost[];
	pageSize: number;
}

export interface CategoryPaginationState {
	isTagMode: boolean;
	tag: string;
	page: number;
}

export interface CategoryPaginationResult {
	state: Writable<CategoryPaginationState>;
	page: Readable<UIPagination<UIPost>>;
	filteredPosts: Readable<UIPost[]>;
	// tagIndex: Readable<UIPost[]>;
}

function parseUrl() {
	const url = new URL(window.location.href);

	const tag = url.searchParams.get("tag") || "";
	const tagPage = Number(url.searchParams.get("tagPage") ?? 1);

	const pageMatch = url.pathname.match(/\/page\/(\d+)/);
	const page = pageMatch ? Number(pageMatch[1]) : 1;

	return {
		tag,
		isTagMode: !!tag,
		page: tag ? tagPage : page,
	};
}

function buildPage<T>(
	data: T[],
	currentPage: number,
	pageSize: number,
): UIPagination<T> {
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
	});

	const filteredPosts = derived(state, ($state) => {
		if (!$state.isTagMode || !$state.tag) return posts;

		return posts.filter((post) =>
			post.tags?.some((t) => toSlug(t.slug) === $state.tag),
		);
	});

	const page = derived([filteredPosts, state], ([$filtered, $state]) =>
		buildPage($filtered, $state.page, pageSize),
	);

	onMount(() => {
		const { tag, isTagMode, page } = parseUrl();
		state.set({ tag, isTagMode, page });
	});
	return {
		state,
		page,
		filteredPosts,
	};
}
