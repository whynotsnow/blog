import { render } from "astro:content";
import { getTagUrl, toSlug } from "@/utils/client-utils";
import { getPostUrl, resolveImageUrl } from "@/utils/url-utils";
import { UNCATEGORIZED } from "@constants/constants";
import type { RawPost, ListPost, UIPost, CategoryItem, TagItem } from "./types";
import { calculateRecommendScore } from "./sort";

/**
 * 全局系统级注入
 * - 为每篇文章生成顺序 ID（用于 permalink）
 * - 按发布时间升序排序
 */
export function injectSystemMeta(posts: RawPost[]): RawPost[] {
  const sorted = [...posts].sort((a, b) => a.data.published.getTime() - b.data.published.getTime());

  const idMap = new Map<string, number>();

  sorted.forEach((post, index) => {
    idMap.set(post.id, index + 1);
  });

  // 返回新的数组（不修改原数据）
  return posts.map((post) => ({
    ...post,
    system: {
      postNumber: idMap.get(post.id),
    },
  }));
}

/**
 * 列表页派生数据注入
 * - 阅读时间
 * - 字数
 */
export async function injectListMeta(posts: RawPost[]): Promise<ListPost[]> {
  return Promise.all(
    posts.map(async (post) => {
      const { remarkPluginFrontmatter } = await render(post);

      const score = calculateRecommendScore(post);

      return {
        ...post,
        words: remarkPluginFrontmatter?.words ?? 0,
        excerpt: remarkPluginFrontmatter?.excerpt ?? "",
        minutes: remarkPluginFrontmatter?.minutes ?? 0,
        score,
      };
    }),
  );
}

/* =========================
   Raw → UIPost
========================= */

export function toUIPost(post: ListPost): UIPost {
  const { id, data, filePath, words, excerpt, score, minutes } = post;

  const imageUrl = resolveImageUrl(post);

  const category: CategoryItem = {
    label: data.category?.trim() || UNCATEGORIZED,
    slug: toSlug(data.category || ""),
  };

  const tags: TagItem[] = (data.tags ?? [])
    .map((t: string) => ({
      label: t.trim(),
      slug: toSlug(t),
      url: getTagUrl(t),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const ui: UIPost = {
    id,
    slug: category.slug,
    url: getPostUrl(post),

    title: data.title,
    description: data.description,

    published: data.published,
    updated: data.updated,
    pinned: data.pinned,

    category,
    tags,

    meta: {
      id,
      published: data.published,
      updated: data.updated,
      category,
      tags,
      words,
      excerpt,
    },

    hasCoverImage: Boolean(data.image),
    image: imageUrl,

    filePath,
    source: "client",
  };

  // 开发时可查看所有字段
  if (import.meta.env.DEV) {
    ui._dev = {
      _listPost: post,
      _words: words,
      _score: score,
      _excerpt: excerpt,
      _minutes: minutes,
    };
  }

  return ui;
}
