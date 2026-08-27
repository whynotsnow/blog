---
title: 相册与日记页面
published: 2026-08-18
updated: 2026-08-19
description: 说明当前博客已启用的相册和日记页面，以及本地图片、显式图片清单和静态日记数据的维护方式。
image: ''
author: whynotsnow
lang: zh_CN
tags: [功能说明, 维护说明, 相册, 日记]
category: 博客技术
draft: false
pinned: false
priority: 66
recommendScore: 45
comment: true
---

当前站点启用了相册和日记两个生活向页面。它们不是普通文章列表，而是各自有独立的数据来源和展示组件。

## 相册数据

本地相册放在：

```text
public/images/albums/{albumId}/
```

每个相册目录需要 `info.json` 描述标题、日期、地点、标签和布局。本地图片模式的封面优先使用 `cover.webp`，没有时回退到 `cover.jpg`；显式图片清单模式则使用 `cover` 字段引用远程 URL 或站内 `/images/...` 路径。

## 本地图片

普通图片可以使用 `jpg`、`jpeg`、`png`、`gif`、`webp`、`svg`、`avif`、`bmp`、`tiff` 和 `tif`。如果同名图片同时存在普通格式和 WebP，扫描器会优先使用 WebP。

图片文件名可以用下划线携带标签，例如：

```text
snow_mountain_night.webp
```

## 项目相册

当前项目已按资源主题整理出三个项目相册：

- `ProjectDevices`：收录设备页面使用的路由器和移动设备图片，默认隐藏。
- `ProjectDiary`：收录日记页面使用的生活记录图片，默认隐藏。
- `ProjectMarkdownGallery`：收录 Markdown 图片网格文章中的代表性演示图片，公开展示。

这些相册使用显式图片清单引用站内公开资源，不复制或移动原始业务路径，因此设备页、日记页和文章中的图片引用保持稳定。后续新增图片时，如果主题明确，应优先补充到对应主题相册；只有无法归类的公共资源才需要新建综合相册。

## 显式图片清单

显式图片清单在 `info.json` 中设置 `mode: "external"`，并提供 `cover` 和 `photos` 数组。每张照片至少需要 `src`，可选 `thumbnail`、`alt`、`title`、`description`、`tags`、`date` 和 `location`。

这种模式既可以复用已有图床或对象存储，也可以引用站内 `/images/...` 路径。项目资源相册优先使用站内路径，避免相同图片在仓库中重复存储。

## 日记页面

日记页面当前已启用。配置 `diaryApiUrl` 为空时，页面使用静态数据；配置 API 后，可以接入外部动态来源。

日记内容适合轻量记录，不需要像文章一样设置复杂 frontmatter。正式教程、项目说明和长期维护内容仍建议写成普通文章。

## 维护建议

相册和日记都属于高频更新内容。新增资源时应控制图片体积、补齐描述文本，并避免把私人信息、未授权图片或临时测试素材放进公开目录。
