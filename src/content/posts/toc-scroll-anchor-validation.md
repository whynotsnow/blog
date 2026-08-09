---
title: TOC 滚动与锚点定位验证样例
published: 2026-08-09
updated: 2026-08-09
description: 用一篇较长的中文样例文章验证 TOC active tracker、滚动命中和锚点定位的一致性。
image: ''
tags: [TOC, Markdown, Astro, Svelte, Testing]
category: 技术
draft: false
lang: zh_CN
comment: true
---

这篇文章是专门为验证文章页 TOC 滚动、高亮命中和锚点定位而写的样例。
它不会讨论一个独立的新功能，而是把当前项目文档里提到的内容系统、
配置层、页面结构和运行时行为串在一起，形成一个足够长、足够稳定、
标题层级足够密集的测试页面。

读这篇文章时，可以同时打开桌面侧边栏 TOC、移动端目录按钮和 Floating TOC。
从页面顶部缓慢向下滚动、点击目录项跳转、再从接近底部的位置继续滚动，
都应该能观察到当前高亮项是否和正文中实际靠近 viewport 顶部的标题一致。

## 项目内容系统的上下文

当前博客使用 Astro Content Collection 管理内容。普通文章放在
`src/content/posts/**/*.md`，特殊页面放在 `src/content/spec/**/*.md`，
网站通知放在 `src/content/notifications/**/*.md`。这些集合都由
`src/content.config.ts` 定义 schema，因此文章 frontmatter 的结构不是临时约定，
而是构建期会被 Astro 校验的内容契约。

对于 TOC 验证来说，最重要的是普通文章的 headings 数据。未加密文章会在构建期
由 Astro 提供 headings，桌面目录、移动端目录和 Floating TOC 都应共享同一份静态
TOC 数据。加密文章则不同：未解锁前不应该暴露静态目录，解锁后再从解密正文 root
生成 runtime TOC。

### Content Collection 与 headings

Astro 在编译 Markdown 时会解析标题，并把标题结构暴露给页面层。这个过程让 TOC
不需要在普通文章里做全页面 DOM 扫描，也让目录数据在服务端渲染阶段就能稳定生成。
如果标题文本、slug 或层级发生变化，TOC 的节点结构也会随之变化。

这篇样例刻意使用大量 H2 和 H3 标题。H2 用来模拟一级目录项，H3 用来模拟二级目录项。
当页面滚动到某个 H2 的正文范围内时，该 H2 应该展开；当滚动进入它下面的某个 H3 范围时，
对应 H3 应该成为 active item。

### 文章路由与 canonical slug

内容指南里说明，未设置 `alias` 时，文章文件名就是 canonical slug，并生成
`/posts/{文件名}/`。这篇文章的文件名是 `toc-scroll-anchor-validation.md`，
因此预期访问路径是 `/posts/toc-scroll-anchor-validation/`。

这里不使用 `alias`，是为了减少验证变量。我们希望所有行为都集中在 TOC scroll、
hash anchor、Swup 拦截和 active tracker 上，而不是额外引入路由别名。

### 分类和标签

项目文档建议每篇文章只设置一个分类，标签可以多个，但应避免同义词和大小写差异。
这篇文章使用规范分类 `技术`，并保留 `TOC`、`Markdown`、`Astro`、`Svelte`、
`Testing` 作为英文关键词。这样既符合现有分类系统，也便于之后在分类页快速找到它。

## 为什么需要专门的 TOC 验证文章

TOC 问题通常不是单纯的视觉问题。它混合了文档结构、滚动容器、固定导航栏高度、
hash 更新、浏览器原生锚点跳转、客户端路由、标题可见性和文章底部边界。
如果样例文章太短，很多问题只会在真实长文里出现；如果标题层级太少，
二级标题折叠和根标题收起的问题也很难稳定复现。

这篇文章的目的，是提供一个可以重复操作的验证页面。它不追求内容主题上的完整性，
而是追求滚动行为上的覆盖率。每个章节都故意写得比普通说明更长一些，
让 active tracker 有足够的距离判断当前标题范围。

### 滚动命中不是点击定位

点击 TOC 标题时，页面会主动滚动到目标 heading。这个动作可以使用明确的 offset，
例如根据 navbar 或 `--main-content-offset` 计算出来的值。用户手动滚动时则不同，
active tracker 需要在每一次 scroll update 中判断当前 viewport 应该归属于哪个标题。

如果点击定位和滚动命中使用不同 offset，就会出现一种不舒服的体验：
点击目录项后标题位置看起来是准确的，但稍微滚动一点，高亮项却跳到上一个或下一个标题。
这种不一致通常说明 scroll-to-heading 和 active-heading detection 没有共享同一套边界。

### 二级标题折叠的复现场景

用户在 `/posts/markdown-extended/` 中观察到的问题，出现在命中二级标题
`Custom Titles` 后继续向下滚动很小距离时，TOC 高亮收起了所有二级标题，
表现得像已经滚动到页面底部。这类问题特别适合用长文复现，因为它常常和
bottom boundary、当前标题范围和最后一个标题范围之间的关系有关。

在这篇文章中，后面会安排多个连续 H3，并在接近底部的位置继续放置 H2/H3。
如果目录在未真正到达文章底部时提前变成 roots-only 状态，就可以很快看出来。

## 验证路线一：从页面顶部自然滚动

第一条验证路线是最接近日常阅读的方式：打开文章后不点击 TOC，只使用滚轮或触控板
从顶部缓慢往下滚动。这个过程中需要观察三个点：第一个 H2 何时高亮，H2 下的 H3
何时高亮，以及离开某个 H3 后是否仍然保持在合理的父级章节里。

这条路线可以暴露 active tracker 的起始命中问题。如果 tracker 的判断线离页面顶部
过远，标题可能还没有接近可读区域就提前高亮；如果判断线过低，标题已经被固定导航栏
遮住或滚过很久，高亮才会更新。

### 顶部进入正文的第一个观察点

从文章标题区域滚动到正文区域时，第一个可观察目标是 H2 `项目内容系统的上下文`。
当它进入主要阅读位置时，TOC 应该把该 H2 标记为 active。由于页面顶部可能存在
navbar、公告条或其他固定区域，实际判断点不应简单等同于 `window.scrollY`。

如果当前项目使用 `--main-content-offset` 表达主内容偏移，那么 active tracker
和点击跳转都应该尽量消费同一个值。这样用户看到的标题位置和 TOC 高亮的判断位置
才会一致。

### 中段稳定性的第二个观察点

继续滚动到当前章节时，TOC 应该保持展开当前 H2，并在进入本 H3 的正文范围后
高亮这个 H3。这里特别关注“刚刚越过标题一小段距离”的状态。正常情况下，
高亮不应该因为离开标题元素本身而立刻丢失，因为用户阅读的是这个标题下的内容范围，
不是只阅读标题那一行。

如果 active tracker 只依赖 `getBoundingClientRect().top` 的瞬时值，
而没有把标题之间的范围建模清楚，就容易在两个标题之间出现空窗期。
范围建模的价值在这里非常明显。

### 低速滚动与惯性滚动

触控板的惯性滚动会产生很多小步进，鼠标滚轮则可能产生更大的跳跃。
TOC 逻辑应该能同时处理这两种输入。低速滚动用于检查边界是否抖动，
快速滚动用于检查 tracker 是否能跳过中间不可见标题并仍然命中正确范围。

这也是为什么测试文章需要比较长。短文章很难制造“快速滚动跳过多个 heading”
之后仍然需要准确判断 active item 的场景。

## 验证路线二：点击 TOC 标题跳转

第二条验证路线是从 TOC 主动点击标题。点击一级标题时，页面应该滚动到该 H2 附近；
点击二级标题时，页面应该滚动到该 H3 附近。滚动结束后，active item 应该和刚刚点击的
目录项一致，不能依赖浏览器原生 hash jump 再做一次不可控的补偿。

如果项目使用 Swup 或类似客户端导航库，TOC 链接还要避免被当作普通页面导航处理。
对于同页 hash 跳转，理想行为是由 TOC runtime 接管滚动、更新 hash、刷新 active state。

### 点击一级标题后的预期

点击 TOC 中的 H2 时，标题应停在可读区域的顶部附近。这里的“顶部附近”不是绝对的
`0px`，而是应该扣除固定导航或配置的 scroll offset。若 offset 为 0，
标题可以贴近 viewport 顶部；若 offset 等于 navbar 高度，标题不应被 navbar 遮挡。

随后手动向下滚动一小段，active item 不应该马上跳走。只有当 tracker 的判断线进入
下一个标题范围时，TOC 才应该推进到下一个节点。

### 点击二级标题后的预期

点击 H3 时，父级 H2 应该展开，目标 H3 应该高亮。桌面 TOC、移动端 TOC 和 Floating TOC
如果同时存在，应表现一致。这里尤其要注意移动端目录关闭后的滚动状态：
关闭浮层本身不应改变页面滚动高度，也不应触发额外的 native hash jump。

如果点击后页面滚到一个位置，但下一帧 active tracker 判断为另一个标题，
通常说明点击 scroll offset 和 active offset 仍然不一致。

### Hash 更新与后退行为

TOC 点击通常会更新地址栏 hash，例如 `#点击二级标题后的预期`。这个 hash 的作用是
提供可分享链接和浏览器历史记录，但它不应该让浏览器执行第二套默认锚点滚动。

因此点击 handler 需要明确阻止默认行为，由项目自己的 `scrollToHeading` 或同类逻辑
完成定位。这样才能保证 offset、history、active state 的来源一致。

## 验证路线三：连续二级标题

连续二级标题是 TOC active tracker 最容易出错的场景之一。如果几个 H3 之间的正文都很短，
滚动判断线可能在很短时间内穿过多个范围。此时 tracker 既不能停留在过期标题，
也不能在没有明确命中底部之前收起所有二级标题。

下面几个小节故意放得比较近，但每个小节仍然有足够正文。测试时可以在这一段慢慢滚动，
观察高亮是否按照 H3 顺序稳定推进。

### 连续标题 A：范围开始

这一小节代表连续标题区域的起点。理想情况下，它的 active range 应该从本标题的
scroll target 附近开始，到下一个 H3 的 scroll target 附近结束。用户阅读这段文字时，
TOC 高亮应该停留在 `连续标题 A：范围开始`。

如果高亮提前跳到下一节，说明 range end 可能过早；如果始终停留在上一节，
说明 range start 可能过晚，或者当前节点推进逻辑没有正确比较 next heading。

### 连续标题 B：范围推进

这一小节用于观察从 A 到 B 的推进。滚动判断线越过 B 的起点后，active item 应该变为 B。
这个判断最好来自标题图结构，而不是每次都从头扫描所有 heading 后凭经验猜测。

图结构可以把每个节点的父级、前一个兄弟、后一个兄弟和范围边界准备好。
这样 active tracker 只需要根据当前 scroll position 判断是否推进、回退或保持。

### 连续标题 C：范围结束

这一小节用于观察连续标题组的结尾。离开 C 后，如果还没有进入下一个 H2，
TOC 应该仍然保持父级展开，并根据当前范围保持 C 或父级，而不是直接切到 roots-only。

roots-only 更适合表达“页面已经超过文章有效 TOC 范围”的状态。
它不应该被一个普通的 H3 range end 错误触发。

## 验证路线四：底部边界

底部边界是这次问题分析中最关键的区域。旧逻辑如果使用“文章正文容器 bottom 减去某个固定值”
来判断 bottom state，就可能在视觉上还没有到达真正底部时提前进入 roots-only。
这会让用户看到二级标题突然全部收起，像是 TOC 认为正文已经结束。

更稳妥的做法，是让 bottom state 和最后一个标题的有效范围建立关系。
也就是说，只有当滚动判断线确实超过最后一个 TOC heading 的合理范围，
或者文章内容已经没有可归属标题时，才进入 bottom roots-only。

### 接近底部但仍在章节内

这一小节模拟“已经很靠近底部，但仍然在某个标题正文内”的状态。
滚动到这里时，TOC 不应该因为文章容器 bottom 比某个阈值小而提前收起。
如果本节还有可读内容，active item 就应该仍然指向本节或它的父级章节。

这个场景可以通过慢速滚动验证：当页面底部逐渐接近 viewport 下边缘时，
目录是否仍然保持当前 H3 展开。如果它突然变成只显示根标题，
就说明 bottom state 的触发条件仍然过早。

### 最后一个标题的有效范围

最后一个标题比较特殊，因为它没有 next heading。没有 next 并不意味着它的范围立刻结束。
它的 range end 应该来自文章内容结束位置、正文容器结束位置或一个明确的文档边界，
而不是来自不存在的下一个节点。

如果最后一个 H3 下还有很长一段内容，用户阅读这段内容时仍然应该看到这个 H3 高亮。
只有继续滚动到文章有效内容之后，TOC 才有理由切换到 bottom roots-only。

### 文章结尾的 roots-only 状态

真正的 roots-only 状态可以保留，但触发条件要明确。它表示用户已经离开 TOC 可表达的正文范围，
不是表示“某个内部计算值碰到了阈值”。在 UI 上，它可以帮助目录在页面底部保持简洁；
在逻辑上，它应该是 state machine 的一个明确终态或临界状态。

这个状态最好由 tracker 根据 current node、previous node、next node 和 range boundary
共同判断。这样即使页面高度、字体加载、图片懒加载或移动端 viewport 变化，
也不会因为一个魔法数字而改变语义。

## rangeStart 与 rangeEnd 的使用方式

`rangeStart` 和 `rangeEnd` 可以理解为某个 TOC 节点在滚动轴上的归属范围。
当 active line 落在这个范围内时，当前节点就是最合理的 active heading。
如果 active line 小于 `rangeStart`，tracker 需要考虑回退到 previous；
如果 active line 大于 `rangeEnd`，tracker 需要考虑推进到 next。

这两个字段不是单纯的视觉位置缓存。它们更像是把标题图结构映射到滚动坐标后的结果。
只要 range 计算和 scroll offset 使用同一套输入，点击定位和手动滚动命中就更容易一致。

### 用 rangeStart 表示标题开始

一个 heading 的 `rangeStart` 可以来自该 heading 的页面绝对位置减去共享 offset。
共享 offset 可以由 `siteConfig.toc.scrollOffset` 显式配置，也可以回落到
`--main-content-offset`。如果两者都不可用，默认值为 0 是最容易解释的选择。

这样一来，点击目录项时滚到的位置，和 active tracker 判断“进入该标题”的位置，
会指向同一条滚动轴上的线。

### 用 rangeEnd 表示标题结束

一个 heading 的 `rangeEnd` 通常可以来自下一个同级或后继 heading 的 `rangeStart`。
对于最后一个 heading，`rangeEnd` 可以来自文章正文的有效结束位置。
这比使用固定的 `container bottom - 160px` 更清晰，因为它描述的是内容范围，
不是某个临时视觉缓冲。

如果存在图片加载、字体加载或内容解密导致的高度变化，range 需要在布局稳定后刷新。
这也是 TOC runtime 应该监听 resize、content refresh 或 unlock event 的原因。

### 把 range 接入 active tracker

active tracker 可以维护一个 current node。每次滚动时先计算 active line，
再检查 current 的 range。如果仍在范围内，就保持不变；如果越过 range end，
就沿 next 推进；如果回到 range start 之前，就沿 previous 回退。

这种图或链表式推进能减少全量扫描，也能让 bottom roots-only 变成一个明确的状态流转。
当 current 是最后一个节点且 active line 超过最后 range end 时，才进入 bottom state。

## 配置层与默认 offset

项目文档强调配置形状应由 `src/types/config.ts` 定义，默认配置放在 `src/config/site.ts`，
浏览器运行时需要通过 ConfigCarrier 或同类桥接组件拿到必要的 runtime config。
TOC scroll offset 属于这类配置：它影响浏览器端滚动行为，但也应该有类型定义和默认值。

对于这个项目，默认 offset 设为 0 是合理的，因为它不会假设 navbar 高度。
如果站点未来有固定导航栏高度变化，可以显式配置 `siteConfig.toc.scrollOffset`。
如果 CSS 已经暴露 `--main-content-offset`，runtime 可以把它作为更贴近布局的回退来源。

### 为什么避免新的魔法数字

魔法数字的问题不在于数字本身，而在于缺少语义来源。`160px` 可能在某个屏幕上看起来合适，
但它无法说明为什么是 160，也无法保证在不同字体、不同 viewport、不同内容密度下仍然正确。

当 offset 由配置或 CSS 变量提供时，数字仍然存在，但它有了来源。
维护者可以追踪它属于 navbar、content inset 或其他布局约束，而不是只能凭经验调整。

### 默认值与用户配置

默认值应尽量保守。`0` 的语义很清楚：不额外补偿固定区域。配置值则用于项目明确知道
顶部有固定遮挡时。这样既不会把布局假设写死在 TOC 逻辑里，也保留了站点按需调整的能力。

这篇文章本身不要求某个具体 offset。它的作用是帮助观察当前配置下，
点击定位和滚动命中是否共享同一套 offset。

## 运行时验证清单

下面是一组可以手动执行的验证动作。它们不是自动化测试脚本，但可以帮助快速定位问题。
如果以后要写 Playwright 测试，也可以把这些动作拆成断言。

### 从顶部慢慢滚到本文段

打开 `/posts/toc-scroll-anchor-validation/`，从页面顶部缓慢滚动到这里。
观察 TOC 是否依次高亮前面的 H2/H3。中途不要点击目录项，只依赖自然滚动。

预期结果是 active item 按正文顺序推进，当前 H2 始终展开，二级标题不会在普通段落中
突然全部收起。

### 点击目录跳转到本小节

点击 TOC 中的 `点击目录跳转到本小节`。页面应该定位到本标题附近，
标题不应被固定导航栏遮挡。滚动结束后，TOC 中本小节应保持高亮。

随后向下滚动很小一段距离，active item 应继续保持在本小节，
直到判断线进入下一个标题范围。

### 从接近底部继续向下滚动

滚动到 `验证路线四：底部边界` 附近，然后继续向下慢慢滚动。
如果 TOC 在还没有进入文章末尾时就收起所有二级标题，
说明 bottom roots-only 的触发条件仍然过早。

真正接近文章结尾时，目录可以进入简洁状态，但这个状态应该发生在最后一个标题范围之后。

## 结论：这篇文章应该如何被使用

这篇样例文章可以长期保留在内容集合中，作为 TOC 行为的人工验证页面。
它覆盖了构建期 headings、同页 hash、点击跳转、自然滚动、连续二级标题和底部边界。
当后续调整 `TocActiveTracker`、`scrollToHeading`、Floating TOC 或配置桥接逻辑时，
都可以用它做第一轮肉眼验证。

如果某次改动让点击定位和滚动命中再次不一致，这篇文章的中段连续 H3 和底部章节
应该能很快暴露问题。到那时，优先检查 shared scroll offset、rangeStart/rangeEnd
刷新时机，以及 bottom roots-only 是否只在最后一个有效 heading range 之后触发。
