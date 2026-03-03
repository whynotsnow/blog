import { toSlug } from "@utils/client-utils";
import { buildCategoryTaxonomy } from "./core/category-pagination";
import { getAllPosts } from "./core/source";
import type { ListPost } from "./core/types";

export type ArchivePageData = {
  posts: ArchivePost[];
  tags: string[];
  categories: string[];
};

export type ArchivePost = {
  id: string;
  url?: string;
  data: {
    title: string;
    tags: string[];
    category?: string;
    published: Date;
    alias?: string;
    permalink?: string;
  };
};

export function toArchivePost(post: ListPost): ArchivePost {
  const tags: string[] = (post.data.tags ?? []).map((t: string) => toSlug(t));
  return {
    id: post.id,
    url: `/posts/${post.id}/`, // url 预计算
    data: {
      title: post.data.title,
      tags,
      category: toSlug(post.data.category),
      published: post.data.published,
      alias: post.data.alias,
      permalink: post.data.permalink,
    },
  };
}

export async function buildArchivePageData(): Promise<ArchivePageData> {
  // 从 core 获取统一数据源

  const listPosts = await getAllPosts();

  //  构建分类领域模型
  const { categories } = buildCategoryTaxonomy(listPosts);

  //  提取 category 名称列表（给组件）
  const categoryNames = categories.map((c) => c.slug);

  //  提取全站 tag（去重）
  const tagSet = new Set<string>();

  for (const category of categories) {
    for (const tag of category.tags) {
      tagSet.add(tag.name);
    }
  }

  const tags = Array.from(tagSet).sort((a, b) => a.localeCompare(b));

  const posts = listPosts.map(toArchivePost);

  return {
    posts,
    tags,
    categories: categoryNames,
  };
}
