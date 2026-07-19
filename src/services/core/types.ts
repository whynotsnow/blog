import type { ImageMetadata } from "astro";
import type { CollectionEntry } from "astro:content";

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

export type PostNavigationLink = {
	title: string;
	url: string;
};

export interface UIMeta {
	slug: string;
	name: string;
	url: string;
}

/**
 * Build-time, body-free post index entry.
 *
 * Raw Markdown, rendered HTML, passwords, and detail-only frontmatter must not
 * cross the ContentStore boundary.
 */
export interface PostIndexEntry {
	id: string;
	postId: number;
	route: PostRoute;

	title: string;
	description: string;
	published: Date;
	updated?: Date;

	category: UIMeta;
	tags: UIMeta[];

	score: number;
	words: number;
	minutes: number;
	excerpt: string;

	pinned: boolean;
	draft: boolean;
	encrypted: boolean;
	cover?: ImageMetadata;

	prev?: PostNavigationLink;
	next?: PostNavigationLink;
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

export type CategoryItem = BaseSlug;
export type TagItem = BaseSlug;

export interface PostCardMetaViewModel {
	category: UIMeta;
	tags: UIMeta[];
	words: number;
	excerpt: string;
	id?: string;
}

/** Browser-serializable post card contract. */
export interface PostCardViewModel {
	id: string;
	slug: string;
	url: string;
	title: string;
	description?: string;
	published: string;
	updated?: string;
	category: UIMeta;
	tags: UIMeta[];
	pinned?: boolean;
	meta: PostCardMetaViewModel;
	hasCoverImage?: boolean;
	image?: ImageMetadata;
}

export interface CategoryEntry {
	category: CategoryItem;
	posts: PostIndexEntry[];
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

export type ContentStats = {
	postCount: number;
	totalWords: number;
	lastActivityAt: Date | null;
};

export interface ContentStore extends CategoryTaxonomy {
	posts: PostIndexEntry[];
	postsById: ReadonlyMap<string, PostIndexEntry>;
	routes: PostRouteIndex;
	stats: ContentStats;
}

export type PostIndexBuildResult = {
	posts: PostIndexEntry[];
	routes: PostRouteIndex;
};

export type PostSort = "score" | "date";
export interface PostQuery {
	sort?: PostSort;
	order?: "asc" | "desc";
}
