# 内容编写指南

本项目使用 Astro Content Collection 管理文章和特殊页面。

## 内容集合

| 集合 | 路径 | 说明 |
| --- | --- | --- |
| `posts` | `src/content/posts/**/*.md` | 博客文章。 |
| `spec` | `src/content/spec/**/*.md` | 关于、友链等特殊页面。 |
| `notifications` | `src/content/notifications/**/*.md` | Activity Center 网站通知。 |

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
- `description`：卡片、Feed 和 SEO 摘要。Feed 不输出 Markdown 全文；为空时依次回落到构建期 `excerpt` 和标题。
- `image`：封面图。
- `tags`：标签列表。
- `category`：单一分类名称。
- `draft`：为 `true` 时生产环境不发布。
- `pinned`、`priority`、`recommendScore`：列表排序和推荐权重。
- `comment`：是否开启评论。
- `alias`：可选文章别名，作为文章唯一的 canonical slug。项目不再支持根级 `permalink` 路径。

### 文章路由与 alias

文章路由在 Astro 构建时由 `src/services/core/post-routes.ts` 统一生成和校验，UI 只消费 service 提供的 `url`、`canonicalUrl` 与导航链接。

- 未设置 `alias` 时，文章文件名是 canonical slug，生成 `/posts/{文件名}/`。
- 设置 `alias` 时，只生成 `/posts/{alias}/`；原文件名路径不再生成，也不提供 redirect。
- `alias` 可以省略首尾 `/` 和可选的 `posts/` 前缀，构建时会执行 Unicode NFC 规范化。
- `alias` 不能包含 query、hash、反斜杠、控制字符、空路径段、`.`、`..` 或非法 percent encoding。
- alias 与其他 alias、任意文章文件名发生解码后、NFC 且大小写无关的冲突时，构建会一次性报告所有冲突并终止。

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

分类和标签由 `src/services/core/taxonomy.ts` 归一化为 slug，共享 URL 拼接由浏览器安全的 `src/utils/url.ts` 提供。

分类新增、展示资产、重命名、合并、删除和未来数据库迁移边界详见 [分类管理](./category-management.md)。

规则：

- 每篇文章只设置一个分类。
- 分类规范定义位于 `src/config/category-slugs.ts`。已知分类会统一为规范 `name` 与 `slug`；例如“技术”和兼容输入 `Technology` 都归入“技术/tech”；当前博客项目说明类文章归入“博客技术/blog-tech”。
- 新文章应直接使用规范分类名。alias 只用于兼容输入，不会生成第二个分类 URL。
- 标签可以多个，但应避免同义词和大小写差异造成导航碎片。
- 空分类会回落到 `uncategorized`。

首页生成最近更新、推荐阅读与文章分类三个引导区块。最近更新与推荐阅读各展示 3 篇文章；文章分类复用分类 Hub card 视图模型，按分类导航顺序最多展示前 6 个分类，但不展示每类最近文章列表，并通过 `/category/` 进入完整分类发现页。分类页是完整浏览入口，每页显示 12 篇文章；分类和 Tag 筛选位于分类页主内容顶部，带 Tag 查询时由客户端保持相同分页容量。

分类根路径 `/category/{slug}/` 是唯一的第一页，也是分类和标签浏览的主入口。文章卡片、文章详情和分类导航中的分类链接都指向该路径；文章 Tag 链接指向所属分类下的 `?tag={tagSlug}` 筛选，例如 `/category/tech/?tag=astro`。归档页只保留按时间浏览，不再承接分类或 Tag 的主要入口。

静态分页从 `/category/{slug}/page/2/` 开始；不会生成 `/page/1/`，也不提供 redirect。分页的 first 链接以及第 2 页的 prev 链接始终指向分类根路径。每个分类会生成一份 `/api/categories/{slug}.json/` 紧凑 Tag 索引；普通分类页只携带当前页文章，浏览器仅在进入合法 `?tag=` 模式时加载索引，并在同一页面生命周期内复用请求。

## 草稿行为

草稿过滤位于 `src/services/core/source.ts`。

| 环境 | 行为 |
| --- | --- |
| 开发环境 | 包含草稿文章。 |
| 生产环境 | 排除 `draft: true` 的文章。 |

## 测试内容与开发 Overlay

E2E 测试不应依赖当前生产文章的分类、标题、slug 或 tag 数量。测试/开发专用文章放在 `tests/content/posts`，用于测试模式和开发 overlay。

规则：

- 默认未设置 `BLOG_CONTENT_MODE` 时，站点读取 `src/content/posts`。
- `BLOG_CONTENT_MODE=test` 时，站点只读取 `tests/content/posts`，用于 Playwright 和其他稳定测试。
- `BLOG_CONTENT_MODE=development` 时，站点读取 `src/.content-dev/posts`。该目录由 `pnpm dev-content:prepare` 生成并忽略提交，内容是生产入口和 `tests/content/posts` 的合成结果。
- 其他 `BLOG_CONTENT_MODE` 值会直接报错，避免拼写错误静默回落。
- Playwright 配置会在启动测试 dev server 时显式设置 `BLOG_CONTENT_MODE=test`，本地和 CI 使用同一套测试内容。
- 测试内容不能用于正式内容运营，也不应进入生产构建、RSS、SEO、搜索索引或正式分类统计。
- 普通 `pnpm dev` 默认先运行 `pnpm content:prepare` 和 `pnpm dev-content:prepare`，再以 `BLOG_CONTENT_MODE=development` 启动 Astro，因此开发环境会展示生产内容与测试内容的合成结果。
- 需要只查看生产内容时，使用 `pnpm dev:prod-content`。
- 需要验证合成内容能完整静态构建时，使用 `pnpm build:dev-content`。该命令只用于本地或显式验证，不替代生产 build。
- `pnpm generate-posts -- batch 5` 默认写入 `tests/content/posts`；`clear` 默认也只清理测试内容目录。写入或清理生产内容目录必须显式传入 `--target=content`，生产目录清理还需要 `--confirm-content-clear`。
- 历史测试文章只选择性恢复为 fixture 素材。不要把 `cc6c2bfeab08f0f3de8f017c6ce49157346a3330` 之前的全部测试文章恢复到生产内容目录。

`tests/content/posts` 只放独立测试/开发文章，不放生产文章副本。测试文章应使用独立分类、文件名和 alias，例如 `测试内容/test-content` 与 `fixture-*` 路由前缀。分类差异不能避免文章详情路由冲突，因为文章详情页是 `/posts/{canonicalSlug}/`，不按分类嵌套。

development overlay 是冲突发现机制，不是冲突修复机制。`pnpm dev-content:prepare` 发现以下情况会失败，并给出冲突类型、来源和调整建议：

- 生产内容和测试内容写入同一个 overlay 相对路径。
- 默认 slug、canonical slug、alias 或 alias 与默认 slug 互撞。
- 大小写、percent decode、Unicode NFC 归一化后等价的文章路由。
- 分类名称不同但 slug 相同。

tag 重名、标题重名和 draft 状态差异默认允许。需要稳定验证分类页、Tag 分页、文章详情、TOC、Activity Center 或 Floating Tools 时，应更新 `tests/content/posts` 和 `tests/support/content-fixtures.ts`，而不是把测试文章混入生产内容目录。

## Mermaid 图表

Mermaid 图表用于表达文章中的静态流程、状态、时序和简单比例关系。站点默认使用 `mermaid@11.17.2`，运行时文件固定发布为 `public/assets/js/mermaid-11.17.2.min.js`，并以 `securityLevel: "strict"` 渲染图表；不要依赖 Mermaid 的 HTML label、click 回调或外链交互能力。需要可点击操作或复杂交互时，应使用专门的页面组件，而不是把 Mermaid 当作交互容器。

生产构建会用 Playwright renderer 在 Markdown 渲染阶段生成初始 SVG，并把结果缓存到本地构建缓存目录。HTML 中会保留 `data-mermaid-code` 作为主题重渲染和失败 fallback 输入，但首屏可见内容应直接是 SVG；开发环境默认仍走客户端渲染 fallback，避免 HMR 时频繁启动浏览器渲染器。需要在本地开发时强制验证构建期 SVG，可设置 `BLOG_MERMAID_PRERENDER=1`；需要临时关闭生产预渲染时可设置 `BLOG_MERMAID_PRERENDER=false`，但正式发布不应关闭。

升级 Mermaid 时必须同步更新 `package.json`、`pnpm-lock.yaml`、`public/assets/js/mermaid-*.min.js`、`src/plugins/rehype-mermaid.ts`、`src/plugins/mermaid-prerender.ts` 和 Mermaid E2E 断言。不要恢复 CDN fallback，也不要引用 `/node_modules/` 路径作为生产运行时。

## 加密文章目录

普通文章的目录（TOC）来自 Astro 在构建期提供的 `headings`，桌面目录、移动端目录和 Floating TOC 共享同一份静态 TOC 数据。

当文章设置 `encrypted: true` 且配置 `password` 时，构建输出不会暴露静态目录数据，避免未解锁前泄露受保护内容的标题结构。用户输入正确密码后，客户端会从解密后的正文 root 显式生成 runtime TOC，并通过统一刷新事件同步桌面、移动端和 Floating TOC；普通文章不依赖全页面 DOM 扫描生成目录。

## 内容分离

项目支持本地内容和外部内容仓库两种模式。

相关文档：

- [内容分离](./content-separation.md)
- [内容仓库结构](./content-repository.md)

`pnpm content:prepare` 的默认行为：

- `ENABLE_CONTENT_SYNC=false` 或未设置：使用本地内容，不执行 Git。
- `ENABLE_CONTENT_SYNC=true`：必须同时提供 `CONTENT_REPO_URL` 和完整 `CONTENT_REPO_COMMIT_SHA`。
- 外部 checkout 在 staging 中完成 fetch、SHA 与目录校验，成功后通过 `CONTENT_DIR/current` 一次切换；失败不会回退到本地内容，而是终止命令和构建。
- `posts`、`spec`、`data`、`images` 四个目录必须同时存在，不支持混合本地与外部来源。

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

## 相册资源

相册页面以 `public/images/albums/{albumId}/info.json` 为入口。本地图片模式会读取同目录图片；显式图片清单模式会读取 `photos[].src` 指向的远程 URL 或站内 `/images/...` 路径。`info.json` 的常用字段包括：

- `title`、`description`、`date`、`location`、`tags`：用于相册列表、详情页和筛选。
- `hidden`：为 `true` 时构建时跳过该相册。
- `layout`：支持 `masonry` 和 `grid`，未配置时使用 `grid`。
- `columns`：保留给相册网格布局使用，未配置时为 `3`。
- `password`：可选，相册详情照片区会加密，未解锁前不输出照片 HTML。
- `passwordHint`：可选，保留给密码提示文案；当前通用密码组件仍显示站点级默认提示。

本地相册优先使用 `cover.webp` 作为封面，缺失时回退到 `cover.jpg`；两个封面文件都不会进入照片列表。普通图片支持 `jpg`、`jpeg`、`png`、`gif`、`webp`、`svg`、`avif`、`bmp`、`tiff`、`tif`。当同目录同时存在同名 `jpg`/`jpeg`/`png` 与 `webp` 时，扫描器会优先把照片 URL 指向 WebP。文件名可用下划线携带标签，例如 `name_tag.webp` 或 `name_tag1_tag2.webp`。

显式图片清单相册在 `info.json` 中设置 `mode: "external"`，并提供 `cover` 和 `photos` 数组。`cover` 与 `photos[].src` 既可以是远程 URL，也可以是站内 public 路径。`photos` 中每项至少需要 `src`，可选 `thumbnail`、`alt`、`title`、`description`、`tags`、`date`、`location`、`width`、`height`。显式图片清单相册同样支持 `password` 和 `passwordHint`。项目资源相册优先使用站内路径引用已有图片，避免复制同一份资源。

## 网站通知

网站通知使用 `src/content/notifications/*.md`。Frontmatter 控制列表摘要、状态、等级、可见范围和交互策略，正文 Markdown 会在 Activity Center 弹窗中展示。

示例：

```yaml
---
title: 站点施工提示
summary: 部分功能仍在完善中。
status: info
level: normal
dismissible: false
requiresAck: false
visibility:
  scope: all
---
```

通知文件名是稳定 ID，例如 `site-building-2026-07.md` 对应 `site-building-2026-07`。`important` 和 `urgent` 未读通知会在每个浏览器会话中自动展开一次 Activity Center；`critical` 未确认通知会在每个浏览器会话中自动打开一次弹窗，默认需要点击“我知道了”确认且不可忽略。`pinned: true` 表示置顶并自动打开详情，当前只支持一条置顶通知。正文应保持短小明确；需要长篇说明时使用 `action` 链接到文章或特殊页面。

## Schema 变更检查清单

修改文章 frontmatter 时：

1. 更新 `src/content.config.ts`。
2. 如果 UI 派生模型变化，更新 `src/services/core/types.ts`。
3. 更新 `src/services/core` 中的注入、排序或索引逻辑。
4. 更新本文档。
5. 运行 `pnpm check`。
