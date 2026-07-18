import type { CollectionEntry } from "astro:content";

//基础类型
export type RawPost = CollectionEntry<"posts">;

export type PostRouteSource = {
	id: string;
	filePath?: string;
	alias?: string;
};

export type PostRoute = {
	postId: string;
	defaultSlug: string;
	canonicalSlug: string;
	canonicalUrl: string;
	usesAlias: boolean;
};

export type PostRouteIndex = {
	byId: ReadonlyMap<string, PostRoute>;
	bySlug: ReadonlyMap<string, PostRoute>;
};

/* List 页面数据结构 */
export type ListPost = RawPost & {
	meta: PostMeta;
};

// meta是所有派生的post状态信息
export interface PostMeta {
	postId: number;
	score: number;

	words: number;
	minutes: number;
	excerpt: string;

	prevSlug?: string;
	prevTitle?: string;
	nextSlug?: string;
	nextTitle?: string;
}
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
	slug: string;
	name: string;
	count: number;
	url?: string;
}

export interface UIMeta {
	slug: string;
	name: string;
	url: string;
}

export type CategoryItem = BaseSlug;

export type TagItem = BaseSlug;

export interface UIPostMeta {
	published: Date;
	updated?: Date;

	category: UIMeta;

	tags: UIMeta[];

	words: number;
	excerpt: string;

	/** 用于 PostMetadataView 的控制 */
	id?: string;
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
	published: Date;
	updated?: Date;

	// 分类 & 标签
	category: UIMeta;

	tags: UIMeta[];
	pinned?: boolean;
	// 统计信息（PostMetadataView）
	meta: UIPostMeta;

	// UI 控制
	hasCoverImage?: boolean; // 给 PostCard / ImageWrapper 用
	image?: ImageMetadata;

	filePath?: string;

	source?: "ssg" | "client";

	_dev?: {
		_listPost: ListPost;
		_words: number;
		_excerpt: string;
		_minutes: number;
		_score: number;
		_views?: number;
	};
}

export interface CategoryEntry {
	category: CategoryItem;
	posts: ListPost[];
	tags: Map<string, TagItem>;
}

export type CategoryMap = Map<string, CategoryEntry>;

export type PostNavigatorCategory = {
	slug: string;
	name: string;
	count: number;
	url?: string;
	tags: TagItem[];
};
export interface CategoryTaxonomy {
	categoryMap: CategoryMap;
	categories: PostNavigatorCategory[];
}

export interface ContentStore extends CategoryTaxonomy {
	posts: ListPost[];
	routes: PostRouteIndex;
}

export type PostSort = "score" | "date";
export interface PostQuery {
	sort?: PostSort;
	order?: "asc" | "desc";
}
