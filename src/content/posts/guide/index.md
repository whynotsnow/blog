---
title: 当前博客功能总览
published: 2026-08-10
updated: 2026-08-19
description: 从内容、导航、个性化、媒体和发布输出几个方面说明当前博客已经启用的核心功能。
image: ./cover.webp
author: whynotsnow
lang: zh_CN
tags: [项目说明, Astro, Svelte, 博客系统]
category: 教程
draft: false
pinned: true
priority: 100
recommendScore: 100
comment: true
alias: site-feature-guide
---

这篇文章是当前博客的功能索引。它只记录已经在项目中落地、并且会影响访问者体验或内容维护方式的能力；如果配置里存在但当前站点关闭，本文不会把它当作已启用功能宣传。

## 内容系统

博客文章放在 `src/content/posts`，使用 Astro Content Collection 做构建期校验。每篇文章至少需要 `title` 和 `published`，推荐补齐 `description`、`tags`、`category`、`lang` 和 `updated`，这样列表、Feed、搜索摘要和 SEO 元数据都能获得稳定输入。

当前项目使用统一的内容服务层读取文章索引、详情、分类和标签。页面只消费服务层提供的 URL、摘要和导航数据，避免同一篇文章在不同页面出现不同排序或不同链接。

## 文章浏览

文章列表、分类页、归档页和详情页都围绕同一组文章数据生成。分类页是分类和标签筛选的主要入口，归档页则专注于按时间浏览。文章详情页支持封面、目录、评论、许可证、最后更新时间、代码高亮和 Markdown 扩展语法。

长文章可以使用侧边栏目录或悬浮目录快速跳转。目录数据来自 Markdown 标题结构，普通文章在构建期生成，加密文章在解锁后从正文重新生成。

## 个性化界面

站点启用了明暗主题切换、壁纸和横幅配置、背景模糊与透明度控制，以及桌面端的布局模式入口。横幅图片来自本地资源，并支持轮播。

音乐播放器和 Live2D 看板娘默认挂载。它们属于浏览器端交互模块，不影响文章构建，也不会改变 Markdown 的写作方式。

## 特色页面

当前导航中启用的特色页面包括日记、相册、友链和关于页面。番剧、项目、技能、时间线和设备页面在配置中保留，但当前站点未对访问者开放。

相册从 `public/images/albums` 读取本地或外链图片清单；日记页优先使用配置的 API，未配置时使用静态数据。友链和关于页使用 `src/content/spec` 中的特殊页面内容。

## 发布输出

项目会生成 RSS、Atom、站点地图、文章 Open Graph 入口和分类 JSON 索引。生产构建还会执行内容准备、字体处理、Astro 构建、Pagefind 索引和构建资源校验。

这些输出能力让博客不仅能被浏览器访问，也能被订阅器、搜索引擎和社交分享入口消费。

## 相关说明

- [文章写作与 Frontmatter](/posts/markdown-writing/)
- [Markdown 扩展语法](/posts/markdown-extended/)
- [Mermaid 图表写作](/posts/markdown-mermaid/)
- [加密文章能力](/posts/encrypted-example/)
- [分类与标签组织](/posts/categories-and-tags/)
