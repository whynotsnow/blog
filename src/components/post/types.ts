import type { Writable, Readable } from "svelte/store";
import type { UIPost } from "@/services/core/types";

export type { UIPost } from "@/services/core/types";

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
export interface BaseSlug {
	name: string;
	slug: string;
	url?: string;
}

export type CategoryItem = BaseSlug;

export type TagItem = BaseSlug;

export interface CategoryPaginationOptions {
	posts: UIPost[];
	pageSize: number;
}

export interface CategoryPaginationState {
	isTagMode: boolean;
	tag: string;

	page: number; // 正常分页
	tagPage: number; // tag分页
}

export interface CategoryPaginationResult {
	state: Writable<CategoryPaginationState>;
	page: Readable<UIPagination<UIPost>>;
	filteredPosts: Readable<UIPost[]>;
}
