import { GetStaticPathsResult } from "astro";
import { injectListMeta, injectSystemMeta, toUIPost } from "./core/inject";
import { sortByScore } from "./core/sort";
import { getAllPosts, getAllPostsRaw } from "./core/source";
import { buildCategoryTaxonomy, generateCategoryPage } from "./core/category-pagination";
import { CategoryEntry } from "./core/types";

export async function getCategoryStaticPaths() {
  const listPosts = await getAllPosts();

  const { categoryMap, categories } = buildCategoryTaxonomy(listPosts);

  const paths: GetStaticPathsResult = [];

  for (const [slug, entry] of categoryMap) {
    const sorted = sortByScore(entry.posts);

    const page = generateCategoryPage(sorted, slug, 1);

    const uiPosts = page.data.map(toUIPost);
    const categoryAllPosts = categoryMap.get(slug) as CategoryEntry;

    paths.push({
      params: { slug },
      props: {
        posts: uiPosts,
        categoryAllPosts,
        page,
        categorySlug: slug,
        categories,
      },
    });
  }

  return paths;
}
