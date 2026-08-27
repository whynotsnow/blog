---
title: 测试 Markdown 扩展语法
published: 2026-08-12
updated: 2026-08-19
description: 说明当前博客支持的提示块、GitHub 仓库卡片、剧透文本、代码高亮和数学公式等扩展写法。
image: ''
author: whynotsnow
lang: zh_CN
tags: [测试内容, 写作规范, Markdown, Expressive Code]
category: 测试内容
draft: false
pinned: false
priority: 80
recommendScore: 65
comment: true
---

当前博客在标准 Markdown 之外，支持一些适合技术文章和说明文档的增强语法。使用这些能力时，正文仍然保持 Markdown 文件形态，构建期会把扩展语法转换成页面组件或增强 HTML。

## GitHub 仓库卡片

仓库卡片可以用来引用项目源码：

```markdown
::github{repo="whynotsnow/blog"}
```

渲染效果如下：

::github{repo="whynotsnow/blog"}

建议只在确实需要指向项目仓库时使用，避免一篇文章里堆叠过多外部卡片。

## 提示块

提示块适合放注意事项、维护边界或风险说明：

```markdown
:::note
这是一条普通说明。
:::

:::warning
这是一条需要谨慎处理的提醒。
:::
```

:::note
提示块应服务于正文，不要把每个段落都包成提示块。
:::

:::warning
涉及密码、私有地址或账号凭证的内容不应写入公开文章。
:::

## 图片网格

多张相关图片可以使用 `:::grid` 组织成响应式画廊：

````markdown
:::grid{columns="3" aspect="16/9" fit="cover"}
![第一张图](/images/demos/image-grid-demo/landscape-1.webp)

![第二张图](/images/demos/image-grid-demo/landscape-2.webp)
:::
````

网格支持 `columns`、`aspect` 和 `fit` 参数，并会为同一组图片建立独立的 Fancybox 灯箱分组。完整用法见 [Markdown 图片网格画廊](/posts/image-grid-gallery/)。

## GitHub 风格提示

项目也支持常见的 GitHub 风格引用提示：

```markdown
> [!TIP]
> 这是一条建议。
```

> [!TIP]
> 这种写法适合从 GitHub 文档迁移过来的内容。

## 剧透文本

剧透语法适合隐藏不想立即展示的补充信息：

```markdown
这段内容包含 :spoiler[需要点击或悬停查看的说明]。
```

实际效果：这段内容包含 :spoiler[需要点击或悬停查看的说明]。

## 代码块

代码块由 Expressive Code 渲染，支持语言高亮和复制按钮：

```ts
type PostMeta = {
  title: string;
  published: Date;
  tags: string[];
};
```

写作时务必标注语言，尤其是 `ts`、`astro`、`svelte`、`css`、`bash` 和 `yaml`。

## 数学公式

文章可以书写行内公式 `$E = mc^2$`，也可以使用块级公式：

```markdown
$$
a^2 + b^2 = c^2
$$
```

$$
a^2 + b^2 = c^2
$$

技术文章使用公式时，应在公式前后补充文字解释，避免让公式独立承担全部语义。
