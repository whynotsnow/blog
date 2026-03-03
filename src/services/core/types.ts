import type { CollectionEntry } from "astro:content";

/* =========================
   基础类型
========================= */

export type RawPost = CollectionEntry<"posts">;

export type NavItem = {
  id: string;
  title: string;
};

export type CategoryMeta = {
  name: string;
  slug: string;
  isFallback?: boolean;
};

/* =========================
   List 页面数据结构
========================= */

export type ListPost = RawPost & {
  words: number;
  excerpt: string;
  score: number;
  minutes: number;
  views?: number;
};

/* =========================
   Detail 页面数据结构
========================= */

export type PostDetail = ListPost & {
  navigator: {
    prev?: NavItem;
    next?: NavItem;
  };
  related: NavItem[];
};

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

export interface PostMeta {
  published: Date;
  updated?: Date;

  category: CategoryItem;

  tags: TagItem[];

  words?: number;
  excerpt?: string;

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
  category: CategoryItem;

  tags: TagItem[];
  pinned?: boolean;
  // 统计信息（PostMetadataView）
  meta: PostMeta;

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

export interface CategoryInfo {
  name: string;
  slug: string;
}

export interface CategoryEntry {
  category: CategoryInfo;
  posts: ListPost[];
  tags: Map<string, { name: string; count: number }>;
}

export type CategoryMap = Map<string, CategoryEntry>;

export type PostNavigatorCategory = {
  slug: string;
  name: string;
  count: number;
  tags: {
    slug: string;
    name: string;
    count: number;
    url: string;
  }[];
};

export interface CategoryTaxonomy {
  categoryMap: CategoryMap;
  categories: PostNavigatorCategory[];
}
