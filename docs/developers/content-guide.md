# 内容编写指南

本项目使用 Astro Content Collection 管理文章和特殊页面。

## 内容集合

| 集合 | 路径 | 说明 |
| --- | --- | --- |
| `posts` | `src/content/posts/**/*.md` | 博客文章。 |
| `spec` | `src/content/spec/**/*.md` | 关于、友链等特殊页面。 |

集合 schema 定义在 `src/content.config.ts`。

## 文章 Frontmatter

推荐模板：

```yaml
---
title: 文章标题
published: 2026-01-01
updated: 2026-01-02
description: 简短摘要
image: /images/posts/example.webp
author: whynotsnow
lang: zh_CN
tags: [Astro, Svelte]
category: Frontend
draft: false
pinned: false
priority: 10
recommendScore: 0
comment: true
sourceLink: ""
licenseName: ""
licenseUrl: ""
encrypted: false
password: ""
alias: ""
---
```

必填字段：

- `title`
- `published`

常用可选字段：

- `updated`：内容最后有效更新时间。
- `description`：卡片、Feed 和 SEO 摘要。
- `image`：封面图。
- `tags`：标签列表。
- `category`：单一分类名称。
- `draft`：为 `true` 时生产环境不发布。
- `pinned`、`priority`、`recommendScore`：列表排序和推荐权重。
- `comment`：是否开启评论。
- `alias`：可选文章别名，生成 `/posts/{alias}/` 路径。项目不再支持根级 `permalink` 路径。

兼容旧版本但不建议新文章继续使用的字段：

- `prevTitle`
- `prevSlug`
- `nextTitle`
- `nextSlug`

## 创建文章

```bash
pnpm new-post -- my-post-title
```

脚本会在 `src/content/posts` 下创建 Markdown 文件。

## 分类和标签

分类和标签会通过 `src/utils/url-utils.ts` 归一化为 slug。

规则：

- 每篇文章只设置一个分类。
- 分类名称应保持稳定，重命名会改变分类 URL。
- 标签可以多个，但应避免同义词和大小写差异造成导航碎片。
- 空分类会回落到 `uncategorized`。

首页以 6 篇文章为一个内容区块，当前版本生成推荐阅读、最近更新与技术文章三个引导区块。分类页是完整浏览入口，每页显示 12 篇文章；分类和 Tag 筛选位于分类页主内容顶部，带 Tag 查询时由客户端保持相同分页容量。

## 草稿行为

草稿过滤位于 `src/services/core/source.ts`。

| 环境 | 行为 |
| --- | --- |
| 开发环境 | 包含草稿文章。 |
| 生产环境 | 排除 `draft: true` 的文章。 |

## 内容分离

项目支持本地内容和外部内容仓库两种模式。

相关文档：

- [内容分离](./content-separation.md)
- [内容仓库结构](./content-repository.md)

`scripts/sync-content.js` 的默认行为：

- `ENABLE_CONTENT_SYNC=false`：跳过同步，使用本地内容。
- `ENABLE_CONTENT_SYNC=true`：将 `CONTENT_REPO_URL` 克隆或更新到 `CONTENT_DIR`，再把内容链接或复制到项目目录。

映射关系：

| 内容仓库路径 | 项目路径 |
| --- | --- |
| `posts` | `src/content/posts` |
| `spec` | `src/content/spec` |
| `data` | `src/data` |
| `images` | `public/images` |

## 资源规则

- 全站复用图片放在 `public/images`。
- 横幅、favicon、字体和固定 UI 资源放在 `public/assets` 或已有专用目录。
- 大图优先使用 WebP。
- 文章图片路径应保持稳定，因为卡片、Feed 和 OG 图片可能复用它们。

## Schema 变更检查清单

修改文章 frontmatter 时：

1. 更新 `src/content.config.ts`。
2. 如果 UI 派生模型变化，更新 `src/services/core/types.ts`。
3. 更新 `src/services/core` 中的注入、排序或索引逻辑。
4. 更新本文档。
5. 运行 `pnpm check`。
