import type {
  CategoryEntry,
  CategoryMap,
  CategoryTaxonomy,
  ListPost,
  PostNavigatorCategory,
} from "./types";
import { Page } from "astro";
import { PAGE_SIZE } from "@constants/constants";
import { createFallbackCategory, getCategoryByName, getTagUrl } from "@utils/url-utils";
import { toSlug } from "@utils/client-utils";

/* 
  TODO 可考虑拓展为全站的数据格式化来源处理函数
  buildContentIndex(posts)
  {
    postMap,
    tagMap,
    categoryMap,
    categories,
    tags,
  } 
*/
export function buildCategoryTaxonomy(posts: ListPost[]): CategoryTaxonomy {
  const map: CategoryMap = new Map<string, CategoryEntry>();

  for (const post of posts) {
    const name = post.data.category;
    if (!name) continue;

    let category = getCategoryByName(name);
    if (!category) {
      category = createFallbackCategory(name);
    }

    let entry = map.get(category.slug);

    if (!entry) {
      entry = {
        category,
        posts: [],
        tags: new Map(),
      };
      map.set(category.slug, entry);
    }

    entry.posts.push(post);

    // slug 冲突检测
    if (entry.category.name !== category.name) {
      console.warn(
        `[category] slug conflict: "${category.slug}" used by "${entry.category.name}" and "${category.name}"`,
      );
    }

    // 统计 tag
    for (const tagName of post.data.tags ?? []) {
      const key = tagName.trim();

      if (!entry.tags.has(key)) {
        entry.tags.set(key, { name: key, count: 0 });
      }

      entry.tags.get(key)!.count++;
    }
  }

  const categories: PostNavigatorCategory[] = Array.from(map.values())
    .map((entry) => ({
      slug: entry.category.slug,
      name: entry.category.name,
      count: entry.posts.length,
      tags: Array.from(entry.tags.values())
        .map((tag) => ({
          slug: toSlug(tag.name),
          name: tag.name,
          count: tag.count,
          url: getTagUrl(tag.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    categoryMap: map,
    categories,
  };
}

/**
 * 生成分类分页的元数据对象（page）
 * @param allPosts 该分类下的所有原始文章
 * @param slug 分类标识
 * @param currentPage 当前页码（默认 1）
 * @returns 符合 Astro Page 类型的分页元数据对象
 */
export function generateCategoryPage(
  allPosts: ListPost[],
  slug: string,
  currentPage: number = 1,
): Page<ListPost> {
  const lastPageNumber = Math.ceil(allPosts.length / PAGE_SIZE);

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  return {
    data: allPosts.slice(start, end),
    start,
    end: Math.min(end, allPosts.length),
    size: PAGE_SIZE,
    total: allPosts.length,
    currentPage,
    lastPage: lastPageNumber,
    url: {
      current: currentPage === 1 ? `/category/${slug}/` : `/category/${slug}/page/${currentPage}/`,
      first: `/category/${slug}/`,
      last: lastPageNumber > 1 ? `/category/${slug}/page/${lastPageNumber}/` : `/category/${slug}/`,
      prev:
        currentPage > 1
          ? currentPage === 2
            ? `/category/${slug}/`
            : `/category/${slug}/page/${currentPage - 1}/`
          : undefined,
      next: currentPage < lastPageNumber ? `/category/${slug}/page/${currentPage + 1}/` : undefined,
    },
  };
}
