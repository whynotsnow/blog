---
title: 相册与日记页面
published: 2026-08-18
updated: 2026-08-19
description: 说明当前博客已启用的相册和日记页面，以及本地图片、外链相册和静态日记数据的维护方式。
image: ''
author: whynotsnow
lang: zh_CN
tags: [相册, 日记, 媒体]
category: 教程
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

每个相册目录需要 `info.json` 描述标题、日期、地点、标签和布局。封面优先使用 `cover.webp`，没有时回退到 `cover.jpg`。

## 本地图片

普通图片可以使用 `jpg`、`jpeg`、`png`、`gif`、`webp`、`svg`、`avif`、`bmp`、`tiff` 和 `tif`。如果同名图片同时存在普通格式和 WebP，扫描器会优先使用 WebP。

图片文件名可以用下划线携带标签，例如：

```text
snow_mountain_night.webp
```

## 外链相册

外链相册在 `info.json` 中设置 `mode: "external"`，并提供 `cover` 和 `photos` 数组。每张照片至少需要 `src`，可选 `thumbnail`、`alt`、`title`、`description`、`tags`、`date` 和 `location`。

外链相册适合复用已有图床或对象存储，但要注意外链稳定性和访问速度。

## 日记页面

日记页面当前已启用。配置 `diaryApiUrl` 为空时，页面使用静态数据；配置 API 后，可以接入外部动态来源。

日记内容适合轻量记录，不需要像文章一样设置复杂 frontmatter。正式教程、项目说明和长期维护内容仍建议写成普通文章。

## 维护建议

相册和日记都属于高频更新内容。新增资源时应控制图片体积、补齐描述文本，并避免把私人信息、未授权图片或临时测试素材放进公开目录。
