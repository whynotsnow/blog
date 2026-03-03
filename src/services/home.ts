import { PAGE_SIZE } from "@constants/constants";
import { getAllPosts } from "./core/source";
import { toUIPost } from "./core/inject";
import type { ListPost, PostNavigatorCategory, UIPost } from "./core/types";
import { buildCategoryTaxonomy } from "./core/category-pagination";

export async function getHomePosts(): Promise<ListPost[]> {
  const listPosts = await getAllPosts();
  return listPosts;
}

export async function getHomeList(): Promise<{
  posts: UIPost[];
  categories: PostNavigatorCategory[];
}> {
  const listPosts = await getHomePosts();
  const { categories } = buildCategoryTaxonomy(listPosts);

  const uiPosts = await Promise.all(listPosts.map(toUIPost));

  const sliced = uiPosts.slice(0, PAGE_SIZE);
  return { posts: sliced, categories };
}
