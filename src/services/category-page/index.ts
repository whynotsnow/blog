import type { GetStaticPaths } from "astro";
import { PAGE_SIZE } from "@/constants/constants";
import { getAllPosts, getAllPostsRaw } from "@/services/core/source";
import { injectSystemMeta, injectListMeta, toUIPost } from "@/services/core/inject";
import { sortByScore } from "@/services/core/sort";
import { buildCategoryTaxonomy } from "../core/category-pagination";
import { CategoryEntry } from "../core/types";

export const getCategoryPaginatedStaticPaths: GetStaticPaths = async ({ paginate }) => {
  // 一次性构建全部数据
  const listPosts = await getAllPosts();
  const { categoryMap, categories } = buildCategoryTaxonomy(listPosts);

  // 为每个分类生成分页路径
  return Array.from(categoryMap.entries()).flatMap(([slug, entry]) => {
    const sorted = sortByScore(entry.posts);
    const categoryAllPosts = categoryMap.get(slug) as CategoryEntry;
    return paginate(sorted, {
      pageSize: PAGE_SIZE,
      params: { slug },
      props: {
        categorySlug: slug,
        categories,
        categoryAllPosts,
      },
    });
  });
};
