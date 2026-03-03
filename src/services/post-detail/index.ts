import type { GetStaticPaths, GetStaticPathsItem } from "astro";
import { render } from "astro:content";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { removeFileExtension, resolveSharePosterImages } from "@/utils/url-utils";
import { hasCustomPermalink, initPostIdMap } from "@/utils/permalink-utils";
import { formatDateToYYYYMMDD } from "@/utils/date-utils";
import { permalinkConfig, siteConfig, profileConfig } from "@/config";
import type { ListPost } from "../core/types";
import type { BlogPostingJsonLd, PostDetailPageProps } from "./types";
import { getAllPosts } from "../core/source";

/**
 * 构建单篇文章页面数据
 */
async function buildPostDetailPageData(entry: ListPost): Promise<PostDetailPageProps> {
  const { Content, headings } = await render(entry);
  const { posterCoverUrl, posterAvatarUrl } = await resolveSharePosterImages(entry);

  const isEncrypted = !!entry.data.encrypted && !!entry.data.password;
  dayjs.extend(utc);
  const lastModified = dayjs(entry.data.updated || entry.data.published)
    .utc()
    .format("YYYY-MM-DDTHH:mm:ss");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: entry.data.title,
    description: entry.data.description || entry.data.title,
    keywords: entry.data.tags,
    author: {
      "@type": "Person",
      name: profileConfig.name,
    },
    datePublished: formatDateToYYYYMMDD(entry.data.published),
    inLanguage: entry.data.lang
      ? entry.data.lang.replace("_", "-")
      : siteConfig.lang.replace("_", "-"),
  } satisfies BlogPostingJsonLd;

  return {
    entry,
    Content,
    headings,
    isEncrypted,
    lastModified,
    jsonLd,
    posterCoverUrl,
    posterAvatarUrl,
  };
}

/**
 * 统一构建 posts/[...slug] 的静态路径
 */
export const buildPostDetailStaticPaths: GetStaticPaths = async () => {
  const listPosts = await getAllPosts();

  // 初始化文章 ID 映射（用于 %post_id% 占位符） TODO 可能和injectSystemMeta存在重复
  initPostIdMap(listPosts);

  const paths: GetStaticPathsItem[] = [];

  for (const entry of listPosts) {
    const defaultSlug = removeFileExtension(entry.id);

    const pageData = await buildPostDetailPageData(entry);

    /**
     * 无论是否启用 permalink，
     * 都保留默认 slug 路径用于兼容
     */
    paths.push({
      params: { slug: defaultSlug },
      props: pageData,
    });

    /**
     * 处理 alias（仅在未启用全局 permalink 时）
     */
    if (!permalinkConfig.enable && entry.data.alias) {
      let alias = entry.data.alias.replace(/^\/+/, "").replace(/\/+$/, "");

      if (alias.startsWith("posts/")) {
        alias = alias.replace(/^posts\//, "");
      }

      paths.push({
        params: { slug: alias },
        props: pageData,
      });
    }

    /**
     * 如果有 custom permalink，
     * 仍然保留默认 slug（根目录由其它路由处理）
     */
    if (hasCustomPermalink(entry)) {
      continue;
    }
  }

  return paths;
};
