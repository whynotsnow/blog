import type { Writable, Readable } from "svelte/store";

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

export interface CategoryItem extends BaseSlug {}

export interface TagItem extends BaseSlug {}

export interface UIPost {
	// 基础标识
	id: string;
	slug: string; // 分类的slug
	url: string;

	// 文本内容
	title: string;
	description?: string;

	// 时间
	published: Date; // ISO string（Client 友好）
	updated?: Date;

	// 分类 & 标签
	category: CategoryItem;

	tags: TagItem[];
	pinned?: boolean;
	// 统计信息（PostMetadataView）
	meta: UIPostMeta;

	// UI 控制
	hasCoverImage?: boolean; // 给 PostCard / ImageWrapper 用
	image?: ImageMetadata;

	filePath?: string;
	source?: "ssg" | "client";
}

export interface UIPostMeta {
	published: Date; // ISO
	updated?: Date;

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

	page: number; // 正常分页
	tagPage: number; // tag分页
}

export interface CategoryPaginationResult {
	state: Writable<CategoryPaginationState>;
	page: Readable<UIPagination<UIPost>>;
	filteredPosts: Readable<UIPost[]>;
}
