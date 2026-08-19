---
title: Feed、SEO 与分享输出
published: 2026-08-19
updated: 2026-08-19
description: 说明当前博客如何生成 RSS、Atom、站点地图、摘要、分类索引和 Open Graph 相关输出。
image: ''
author: whynotsnow
lang: zh_CN
tags: [RSS, SEO, Open Graph]
category: 教程
draft: false
pinned: false
priority: 62
recommendScore: 40
comment: true
---

博客不仅面向浏览器页面，也会输出给订阅器、搜索引擎和社交分享入口。文章 frontmatter 的质量会直接影响这些输出。

## RSS 和 Atom

项目提供 RSS 和 Atom 输出。订阅器通常会读取标题、发布时间、更新时间、摘要、链接和站点信息。

`description` 是最重要的摘要来源。功能说明文章应写清楚文章解决什么问题，而不是只写“示例文章”或“测试内容”。

## 站点地图

生产构建会生成站点地图，帮助搜索引擎发现文章、分类页和其他公开页面。草稿文章不会进入生产发布结果。

设置 `alias` 会影响文章 canonical URL。alias 一旦发布，后续应谨慎修改，避免外部链接失效。

## Open Graph

项目保留文章 Open Graph 图片入口，并可通过配置控制是否生成图片。当前配置中动态 OG 图片生成未开启，因此文章封面和摘要更需要保持准确。

如果文章有稳定封面，可以在 `image` 中写入路径。没有封面时留空即可，不要随意引用无关图片。

## 分类 JSON 索引

每个分类会生成紧凑的 Tag 索引，供分类页在 `?tag=` 筛选时加载。这个索引依赖文章分类和标签的规范写法。

因此分类和标签不是只影响页面展示，也会影响客户端筛选和 URL 可分享性。

## 内容维护建议

正式文章发布前应检查四件事：标题是否明确，摘要是否能单独成立，分类标签是否规范，更新时间是否反映本次有效变更。

这些字段写得越稳定，页面、订阅、搜索和分享输出就越不容易过期。
