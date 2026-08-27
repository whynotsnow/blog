---
title: 在文章中嵌入视频
published: 2026-08-14
updated: 2026-08-19
description: 说明如何在 Markdown 文章中嵌入 YouTube、Bilibili 等外部视频，并保持页面可读性。
image: ''
author: whynotsnow
lang: zh_CN
tags: [写作规范, Markdown, 视频, 媒体]
category: 博客技术
draft: false
pinned: false
priority: 60
recommendScore: 45
comment: true
alias: embedded-video
---

文章正文可以直接写入视频平台提供的 `iframe` 嵌入代码。这个能力适合教程、作品展示、演示录像和内容补充，但不建议用视频替代必要的文字说明。

## 基本写法

```html
<iframe
  width="100%"
  height="468"
  src="https://www.youtube.com/embed/5gIf0_xpFPI"
  title="YouTube video player"
  frameborder="0"
  allowfullscreen
></iframe>
```

宽度建议使用 `100%`，高度使用固定值或与正文排版一致的比例。移动端会由页面样式负责约束容器宽度。

## YouTube 示例

<iframe width="100%" height="468" src="https://www.youtube.com/embed/5gIf0_xpFPI" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

## Bilibili 示例

```html
<iframe
  width="100%"
  height="468"
  src="//player.bilibili.com/player.html?bvid=BV1fK4y1s7Qf&p=1&autoplay=0"
  scrolling="no"
  frameborder="no"
  allowfullscreen="true"
></iframe>
```

<iframe width="100%" height="468" src="//player.bilibili.com/player.html?bvid=BV1fK4y1s7Qf&p=1&autoplay=0" scrolling="no" frameborder="no" allowfullscreen="true"></iframe>

## 维护建议

外部视频依赖第三方平台可用性。正文里应保留视频内容的文字摘要，避免平台链接失效后文章失去主要信息。

如果视频涉及隐私、未公开素材或授权限制，不要把它嵌入公开文章。
