---
title: 文章写作与 Frontmatter
published: 2026-08-11
updated: 2026-08-19
description: 说明当前博客文章的 Markdown 写法、Frontmatter 字段、路由别名和草稿发布规则。
image: ''
author: whynotsnow
lang: zh_CN
tags: [Markdown, Frontmatter, 写作规范]
category: 教程
draft: false
pinned: false
priority: 90
recommendScore: 70
comment: true
alias: markdown-writing
---

博客文章使用 Markdown 编写，文件放在 `src/content/posts`。普通文章可以是单个 `.md` 文件，也可以使用目录形式，把 `index.md` 和封面、插图放在同一个目录里。

## 推荐模板

```yaml
---
title: 文章标题
published: 2026-08-19
updated: 2026-08-19
description: 一句话说明文章内容
image: /images/posts/example.webp
author: whynotsnow
lang: zh_CN
tags: [Astro, Markdown]
category: 教程
draft: false
pinned: false
priority: 10
recommendScore: 0
comment: true
alias: example-post
---
```

`title` 和 `published` 是必填字段。`description` 会进入文章卡片、Feed 和 SEO 摘要；`updated` 用来表达内容的最后有效更新时间；`lang: zh_CN` 能明确中文内容语言。

## 分类和标签

每篇文章只设置一个 `category`。当前项目已有的规范分类包括 `技术`、`前端`、`随笔`、`生活`、`学习`、`工作`、`教程` 和 `Guides`。新文章优先使用中文分类。

`tags` 可以有多个，但应避免同义词重复。例如同一批文章里不要同时使用 `Markdown`、`markdown` 和 `MD` 指向同一个主题。

## 路由别名

没有设置 `alias` 时，文章文件名就是 canonical slug。设置 `alias` 后，文章只生成 `/posts/{alias}/`，原文件名路径不会再作为正式路径输出。

建议 alias 使用小写英文和连字符，例如：

```yaml
alias: markdown-writing
```

不要在 alias 里写 `/posts/` 前缀、查询参数、hash 或空路径段。

## 草稿和置顶

`draft: true` 的文章在生产环境不会发布，适合未完成内容。正式功能说明文章应使用 `draft: false`，并在内容有效变化时更新 `updated`。

`pinned`、`priority` 和 `recommendScore` 会影响列表和推荐展示。不要为了临时测试把普通文章全部置顶，否则首页和推荐区会失去信息层级。

## 正文结构

正文从简洁导语开始，再使用二级标题组织内容。长文建议使用稳定的标题层级，因为目录、锚点链接和阅读体验都依赖标题结构。

代码块需要写明语言：

```astro
---
const title = "示例";
---

<h1>{title}</h1>
```

这样代码高亮、复制按钮和构建期处理都会更稳定。
