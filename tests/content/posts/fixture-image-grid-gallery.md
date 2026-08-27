---
title: Markdown 图片网格画廊
published: 2026-08-19
updated: 2026-08-19
description: 说明当前博客如何使用 :::grid 指令组织文章图片，控制列数、比例、裁剪方式，并接入独立的 Fancybox 灯箱分组。
image: ''
author: whynotsnow
lang: zh_CN
tags: [写作规范, Markdown, 图片网格, Fancybox]
category: 测试内容
draft: false
pinned: false
priority: 76
recommendScore: 58
comment: true
---

图片网格画廊用于在一篇文章里展示多张相关图片。它通过 `:::grid` 容器指令声明，把普通 Markdown 图片排成响应式网格，并为同一个网格内的图片建立独立的 Fancybox 灯箱分组。

这适合放文章截图、作品预览、旅行照片精选、设备细节对比，或任何需要“一组图片一起浏览”的内容。普通文章图片仍然可以单独书写；只有放进 `:::grid` 的图片才会按网格方式渲染。

## 基础写法

在 `:::grid` 和结束标记 `:::` 之间直接写 Markdown 图片。每张图片建议单独成段，并用空行分隔：

````markdown
:::grid
![第一张图片说明](/images/demos/image-grid-demo/landscape-1.webp)

![第二张图片说明](/images/demos/image-grid-demo/landscape-2.webp)
:::
````

默认配置是三列、`16/10` 展示比例、`cover` 裁剪方式。

:::grid
![默认网格的第一张横图](/images/demos/image-grid-demo/landscape-1.webp)

![默认网格的第二张横图](/images/demos/image-grid-demo/landscape-2.webp)

![默认网格的第三张横图](/images/demos/image-grid-demo/landscape-3.webp)
:::

## 参数

参数写在开始标记后面的花括号中：

```markdown
:::grid{columns="3" aspect="16/9" fit="cover"}
```

| 参数 | 可用值 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `columns` | `1` 到 `6` 的整数 | `3` | 桌面端每行列数。 |
| `aspect` | 正数比例，例如 `16/9`、`3/4`、`1/1` | `16/10` | 图片卡片的展示比例。 |
| `fit` | `cover` 或 `contain` | `cover` | 图片填充方式。 |

`columns` 超出范围时会回落到三列；`aspect` 不是合法比例时会回落到 `16/10`；`fit` 除了 `contain` 以外都会当作 `cover`。

## 标题和替代文本

图片的 alt 文本会作为无障碍替代文本，也会作为默认图注。如果 Markdown 图片带有可选 title，则 title 优先作为图注：

```markdown
![用于无障碍的说明](/images/demos/image-grid-demo/square-1.webp "显示在图片下方的图注")
```

:::grid{columns="3" aspect="1/1"}
![这张图片没有 title，因此 alt 会显示为图注](/images/demos/image-grid-demo/square-1.webp)

![第二张方图的无障碍说明](/images/demos/image-grid-demo/square-2.webp "这段 title 会显示为图注")

![第三张方图的无障碍说明](/images/demos/image-grid-demo/square-3.webp "较长图注会自动换行，并保持卡片底部对齐")
:::

## 裁剪方式

`fit="cover"` 会从中心裁剪图片，让同一组卡片保持整齐，适合封面、缩略图和视觉预览。

:::grid{columns="3" aspect="16/9" fit="cover"}
![cover 裁剪示例一](/images/demos/image-grid-demo/default-portrait-1.webp "cover：填满卡片")

![cover 裁剪示例二](/images/demos/image-grid-demo/default-portrait-2.webp "cover：中心裁剪")

![cover 裁剪示例三](/images/demos/image-grid-demo/default-portrait-3.webp "cover：统一版式")
:::

`fit="contain"` 会完整保留原图。图片比例和卡片比例不一致时，卡片里可能出现留白；这适合截图、海报、透明图或边缘信息不能被裁掉的图片。

:::grid{columns="3" aspect="16/9" fit="contain"}
![contain 示例一](/images/demos/image-grid-demo/default-portrait-1.webp "contain：保留完整原图")

![contain 示例二](/images/demos/image-grid-demo/default-portrait-2.webp "contain：允许留白")

![contain 示例三](/images/demos/image-grid-demo/default-portrait-3.webp "contain：适合边缘信息重要的图片")
:::

## 常见比例

方图适合头像、图标、局部细节和作品缩略图：

:::grid{columns="2" aspect="1/1"}
![方图示例一](/images/demos/image-grid-demo/mixed-square-1.webp)

![方图示例二](/images/demos/image-grid-demo/mixed-square-2.webp)

![方图示例三](/images/demos/image-grid-demo/mixed-square-3.webp)
:::

`3/4` 适合海报、人物、手机截图和竖向作品：

:::grid{columns="3" aspect="3/4"}
![竖图示例一](/images/demos/image-grid-demo/portrait-1.webp)

![竖图示例二](/images/demos/image-grid-demo/portrait-2.webp)

![竖图示例三](/images/demos/image-grid-demo/portrait-3.webp)
:::

单列适合需要更大阅读尺寸的图片：

:::grid{columns="1" aspect="16/9"}
![单列详情图](/images/demos/image-grid-demo/feature-landscape-1.webp)
:::

## 响应式和灯箱

桌面端会按照 `columns` 展示；窄屏下最多两列；手机宽度会收敛为单列。这样同一段 Markdown 不需要为移动端再写一套图片结构。

点击任意网格图片会打开 Fancybox。每个 `:::grid` 都有自己的分组：在一个网格里打开图片时，只会浏览同一组内的图片，不会混入文章中的普通图片或其他网格。

如果图片边缘有重要文字、截图按钮或透明区域，优先使用 `fit="contain"`，或者把 `aspect` 调整到接近原图比例。需要整齐的卡片视觉时，保留默认的 `cover` 即可。
