---
title: 网站通知与 Activity Center
published: 2026-08-17
updated: 2026-08-19
description: 说明当前博客如何通过通知集合和 Activity Center 展示站点公告、更新提醒和重要提示。
image: ''
author: whynotsnow
lang: zh_CN
tags: [Activity Center, 通知, 站点公告]
category: 教程
draft: false
pinned: false
priority: 68
recommendScore: 50
comment: true
---

Activity Center 用来展示站点公告、更新提醒和重要提示。它读取 `src/content/notifications` 中的通知 Markdown，不需要把公告硬编码进页面组件。

## 通知文件

每条通知是一个 Markdown 文件。文件名就是稳定 ID，例如：

```text
src/content/notifications/site-building-2026-07.md
```

通知 frontmatter 控制标题、摘要、状态、等级、是否可忽略、是否需要确认，以及展示范围。

## 等级和行为

通知等级包括 `normal`、`important`、`urgent` 和 `critical`。普通通知适合记录更新；重要或紧急通知会在会话中更主动地提醒访问者；关键通知通常要求确认。

不要滥用高等级通知。只有影响访问者操作、内容理解或站点可用性的事项才适合提升等级。

## 展示范围

`visibility.scope` 可以控制通知出现在全站、首页或内容页。需要更细的控制时，可以使用 include 和 exclude。

对于只影响文章阅读的说明，应限制在内容页；对于全站维护或功能上线，可以使用全站范围。

## 正文内容

通知正文应短小明确。需要展开说明时，可以用 `action` 链接到一篇正式文章，而不是在通知弹窗里放长篇内容。

例如一次内容结构调整，可以让通知摘要说明“文章分类已重新整理”，再链接到本文或功能总览。

## 维护建议

通知适合表达时间敏感的信息。过期通知应设置失效时间、下线或更新正文，避免 Activity Center 长期显示已经完成的施工提示。
