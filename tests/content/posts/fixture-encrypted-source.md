---
title: 测试加密文章能力说明
published: 2026-08-15
updated: 2026-08-19
description: 说明当前博客的文章加密字段、访问路径、解锁体验和目录生成边界。
image: ''
author: whynotsnow
lang: zh_CN
encrypted: true
password: "123456"
tags: [测试内容, 功能说明, 内容保护, 加密文章, Markdown]
category: 测试内容
draft: false
pinned: false
priority: 85
recommendScore: 75
comment: true
alias: fixture-encrypted-example
---

这是一篇真实启用加密的功能说明文章，访问者需要输入密码后才能阅读正文。当前示例密码是 `123456`，仅用于展示交互流程，不应用作任何真实私密内容的保护密码。

## 如何启用

在文章 frontmatter 中设置：

```yaml
encrypted: true
password: "123456"
```

构建时，项目会把正文按加密文章流程处理。访问者打开页面时先看到解锁界面，输入正确密码后才渲染正文。

## 路由和元数据

加密文章仍然可以设置 `title`、`published`、`description`、`tags`、`category` 和 `alias`。这些字段会用于文章列表、分类页和 Feed 摘要。

真正需要保护的内容应放在正文里，不要写进公开元数据。标题、摘要、分类、标签和 URL 都会暴露给访问者。

## 目录边界

普通文章的目录来自构建期 Markdown headings。加密文章不同：未解锁前不输出静态目录，避免标题结构泄露正文信息。

解锁后，客户端会从解密后的正文重新生成目录，并同步桌面目录、移动端目录和悬浮目录。

## 使用场景

加密文章适合临时分享、半公开说明、活动信息或不希望被普通浏览入口直接阅读的内容。它不是完整的权限系统，也不替代服务端访问控制。

如果内容涉及强隐私、商业秘密或账号凭证，不应放入静态博客文章。

## 写作建议

加密文章仍然应该有清晰摘要。摘要要说明文章主题，但不要泄露正文细节。更新密码或正文后，记得同步 `updated`，方便读者判断内容是否仍然有效。
