import { getCollection } from "astro:content";
import type { ListPost, RawPost } from "./types";
import { injectListMeta, injectSystemMeta } from "./inject";
import { sortByScore } from "./sort";

export async function getAllPostsRaw(): Promise<RawPost[]> {
  return getCollection("posts", ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });
}

export async function getAllPosts(): Promise<ListPost[]> {
  const rawPosts = await getAllPostsRaw();

  const withSystemMeta = injectSystemMeta(rawPosts);
  const listPosts = await injectListMeta(withSystemMeta);

  return sortByScore(listPosts);
}
