# 项目架构

本项目是基于 Mizuki 深度定制的 Astro + Svelte 静态博客。当前改造目标是让页面、内容、配置和 Agent 协作边界清晰可维护。

## 运行模型

Astro 在构建期读取 Markdown 内容，通过 `src/services/core` 生成统一内容存储，再交给页面、布局和组件渲染。

```mermaid
flowchart TD
  A["Markdown 内容<br/>src/content/posts"] --> B["Astro Content Collection<br/>src/content.config.ts"]
  B --> C["原始内容读取<br/>src/services/core/source.ts"]
  C --> D["派生元数据注入<br/>src/services/core/inject.ts"]
  D --> E["内容存储<br/>src/services/core/content-store.ts"]
  E --> F["业务服务<br/>src/services/*.ts"]
  F --> G["Astro 页面<br/>src/pages"]
  G --> H["布局与组件<br/>src/layouts, src/components"]
```

## 核心目录

| 路径 | 说明 |
| --- | --- |
| `src/pages` | Astro 路由和静态端点。页面应尽量保持轻量。 |
| `src/layouts` | 页面外壳和网格布局。 |
| `src/components` | Astro 与 Svelte UI 组件。 |
| `src/design` | 跨功能视觉规则的唯一所有者：token、Theme、Foundation、Pattern 与 Legacy 兼容。 |
| `src/services/core` | 内容读取、排序、派生元数据、分类标签索引、内容缓存。 |
| `src/services` | 首页、归档、分类、Feed、日历数据、组件、文章详情等业务服务。 |
| `src/content` | Astro 内容集合，包含文章和特殊页面。 |
| `src/data` | 时间线、日记、友链、项目、设备、技能等非文章数据。 |
| `src/utils` | URL、日期、内容处理、组件和客户端行为工具。 |
| `public` | 构建时原样复制的静态资源。 |
| `scripts` | 内容同步、文章创建、番剧数据、字体压缩、索引提交等脚本。 |
| `docs` | 项目文档，按开发者和 Agent 分区维护。 |

## 服务层与 View Model 边界

后续拆分大文件时，应继续沿用当前的逻辑与页面解耦方案：`src/services/` 承载页面逻辑和 view model，`src/pages/` 保持路由入口轻量，拆出来的页面组件尽量只负责展示。

推荐边界如下：

- `src/services/` 负责页面逻辑、数据适配、配置归一化、static paths 构建、页面级 view model 生成。
- `src/pages/` 只负责路由入口：调用 service、组合 layout/component、把 view model 传给展示组件。
- `src/components/` 与 `src/layouts/` 负责渲染和局部展示结构。由页面拆出的组件应尽量是 presentational component。
- 浏览器运行时交互不放入 `src/services/`，例如 DOM 监听、音频播放、pointer/mouse/touch 事件、localStorage UI 状态、Svelte runtime store，应放在所属组件或 feature 目录旁边。
- `src/services/core` 仍然是内容管线边界。普通文章集合、分类、标签、归档和文章详情数据不要绕过 `getContentStore()`。

厚页面推荐拆分方式：

```text
src/pages/anime.astro
src/services/anime.ts
src/components/anime/
  AnimePage.astro
  AnimeToolbar.astro
  AnimeGrid.astro
  AnimeCard.astro
  types.ts
```

复杂运行时功能推荐使用 feature-local 结构：

```text
src/features/music-player/
  MusicPlayer.svelte
  MiniPlayer.svelte
  ExpandedPlayer.svelte
  PlaylistPanel.svelte
  audio-controller.ts
  storage.ts
  types.ts
```

拆分时优先把 helper 和类型留在所属功能目录内。只有当多个无关功能都复用同一段逻辑时，才提升到共享的 `src/utils` 或通用 service。

首页与分类页使用独立页面组合，并共享 Post Card 与 Grid 契约。首页由 `src/services/home.ts` 依次输出最近更新、推荐阅读、技术文章三个区块，每组 6 篇；分类页每页 12 篇，并在主内容顶部拥有分类与 Tag 筛选器。Astro SSG 页面 props 只保留当前页文章与不含 `data` 的分页元数据；每个分类另外生成一份 `/api/categories/{slug}.json/` 紧凑索引。普通分类页在首屏 `load` 完成且页面可见、在线、未启用 `Save-Data`、网络不属于 `2g` 或 `slow-2g` 时，才在浏览器 idle 阶段低优先级预取索引；合法 Tag 查询仍会立即加载，因网络条件跳过的预取不会阻止后续请求。索引 Promise 按完整 URL 隔离并以 3 个分类为上限执行 LRU 淘汰，因此同一分类的预取、Tag 切换、分页和 history 共用请求，而旧分类响应不会写入当前组件状态。查询参数、请求状态、失败重试、过滤和客户端分页逻辑与分类组件共置在 `src/components/category/category-page-client.ts`。

首页、分类页与文章详情页使用 `container-content` 布局策略。Banner 始终铺满 viewport，Navbar 与 Main Shell 使用统一的 `1280px` 外部最大宽度。首页显式提供一份 Profile support 内容：`1200px` 以上为最大 `992px` 的三列 Feed + `248px–272px` support column，`880px–1199px` 为最大 `656px` 的双列 Feed + support column，低于 `880px` 时同一个 Profile DOM 移到 Main 前方；Feed 在 `608px` 以下退为单列，并在 `932px` 进入三列。分类页与文章详情页不提供 support slot，内容区在 `1200px` 以下最大 `656px`，达到 `1200px` 后最大 `992px`；文章正文内部仍使用阅读宽度。站点统计由 `src/services/footer.ts` 生成 View Model，并由 `src/components/footer` 在 Footer 中渲染一次。归档页在主内容流中拥有 Calendar、Categories 与 Tags。`PanelCard.astro` 只负责通用卡片 Surface，不负责注册、解析或放置业务组件。旧 viewport Grid 已隔离到 `page-grid-legacy.css`，不得重新覆盖 `container-content` 状态。

`container-content` 页面会停用旧 `pageScaling` 根字号缩放，避免在 1280px 附近同时存在 px Shell 预算和 rem 全局缩放。文章 Sidebar TOC 也从 `--width-shell-wide` 推导外侧 Rail；只有 viewport 能容纳完整 Shell 与 TOC 时才显示，否则使用已有的窄屏 TOC 入口。

分类页与文章详情页在 Banner 与 Fullscreen 模式下保留横幅几何，但 Navbar 行为与首页解耦：只有首页使用 `banner-aware` 的透明度/滚动状态，分类页与文章详情页使用始终可见的 `fixed-visible` 状态。这两种模式的普通导航以及浏览器前进/后退都直接定位实际的 `.page-main-content` 区域，以其文档坐标减去 CSS `scroll-margin` clearance 得出统一位置，不再维护额外的零高度锚点；Overlay、None 和 Hash 导航不执行该定位。页面身份取自新容器的 interaction policy，不依赖内容替换阶段的瞬时 URL。

`main-grid-client` 是 Banner 可见性与 `content-start` 滚动的唯一 runtime owner。普通分类/文章链接在 `content:replace` 后执行一次 `380ms` Shell 自管 easing 动画；浏览器 history 只在 settled 阶段执行 instant 精确校正。动画可被滚轮、触摸、指针和滚动按键中断，并在 `prefers-reduced-motion` 下退化为即时定位。旧的 `layout-client` 只为未声明 `content-start` 的页面执行回到顶部，不再重复添加移动端 Banner 隐藏 class。

页面切换不再使用固定 `300vh` 扩展高度。Shell 在 `visit:start` 记录旧页面 `scrollHeight`，在 `content:replace` 后只为更短的新页面补充精确高度差，并在入口动画或 history 校正完成后以短过渡释放 `PageHeightGuard`。Grid Card 的 `contain-intrinsic-size` 与固定 `29rem` 高度一致，避免离屏行进入渲染范围时再次修改文档总高度。

Shell 自有的顶部 Navigation Progress 使用 Semantic `--accent` 与 Motion token 表达 Swup 请求和替换状态。它从 `visit:start` 开始、在 `content:replace` 推进并于 `visit:end` 完成，快速导航也保留最短可见时间。历史访问禁用 Swup 的缓存位置恢复，并在 settled 阶段临时关闭内容层 `top` transition、同步 Banner class、完成语义入口定位后才发布 `idle`。进度条不占布局高度，也不等待图片、统计、搜索或 Svelte hydration 完成。

文章详情路由保持轻量：`src/pages/posts/[...slug].astro` 负责 static paths 并把页面模型转交给 `src/components/post-detail/PostDetailPage.astro`。Header、最后修改时间、上下篇导航和页面级样式与展示组件放在同一 feature 目录；TOC 等运行时消费者继续使用稳定的 `#post-container` 与 `.markdown-content` hook。

`src/components/misc/Markdown.astro` 是普通文章与加密文章共用的唯一内容样式入口，统一加载 Markdown、扩展内容和 Expressive Code 样式；加密组件只负责保护与解密状态。代码复制交互位于 `src/features/post-content/post-content-client.ts`，不再混入展示容器。

路由切换动画由 `#swup-container` 的 `.transition-swup-layout` 单点负责。Navbar 与页面模块可以保留各自有意义的入场效果，文章列表项保留序列动画；文章详情内部区块不再叠加通用入场动画，避免嵌套位移和重复延迟。

## 内容管线

1. `src/content.config.ts` 定义 `posts` 和 `spec` 内容集合。
2. `src/services/core/source.ts` 中的 `getAllPostsRaw()` 从 Astro Content Collection 读取文章。
3. 草稿过滤在 `getAllPostsRaw()` 中完成：
   - 开发环境包含草稿。
   - 生产环境排除 `draft: true` 的文章。
4. `buildPostIndexEntries()` 从 Astro 已准备好的 `entry.rendered.metadata` 读取摘要、字数和阅读时间，并生成不含正文的 `PostIndexEntry`。
5. `buildContentStore()` 只保存轻量索引：文章索引、ID/Route Map、分类标签 Taxonomy 与聚合统计；不得保存 Markdown 正文、渲染 HTML、密码或详情专用 frontmatter。
6. `getContentStore()` 缓存初始化 Promise，首次并发调用共享同一次构建；初始化失败和 Vite HMR disposal 会清除缓存。
7. 文章 static paths 只携带 canonical slug 与文章 ID。详情 service 按 ID 获取 RawPost，通过有上限的共享队列生成 `Content`、headings 与详情 View Model；UI 不接触 RawPost。
8. Astro 文章卡片消费可序列化的 `PostCardViewModel`；分类 Tag JSON 使用不含重复 `meta` 的 `ClientPostCard`，Svelte 在首屏稳定后按网络条件 idle 预取，或在合法 Tag 模式立即加载这份索引。
9. RSS 与 Atom 只从 `PostIndexEntry` 构建 `FeedItemViewModel`，正文采用 `description || excerpt || title` 摘要语义。Feed 不读取 RawPost、不渲染 Markdown；Atom 通过 XML serializer 统一转义文本和属性。

数据层级如下：

```text
RawPost
├─ PostIndexEntry：构建态轻量索引
├─ PostCardViewModel：浏览器可序列化卡片字段
├─ ClientPostCard：分类 Tag 模式按需加载的紧凑卡片字段
├─ FeedItemViewModel：RSS/Atom 共用的摘要、URL、时间与 Taxonomy
└─ PostDetailPageProps：Content、headings 与详情资源
```

## 路由说明

| 路由文件 | 说明 |
| --- | --- |
| `src/pages/index.astro` | 首页文章列表和分类导航。 |
| `src/pages/posts/[...slug].astro` | 文章详情页，由 `buildPostDetailStaticPaths` 生成路径。 |
| `src/pages/category/[slug]/index.astro` | 分类第一页，底层由 `src/services/category-page.ts` 生成页面数据。 |
| `src/pages/category/[slug]/page/[page].astro` | 分类分页，底层由 `src/services/category-page.ts` 生成页面数据。 |
| `src/pages/api/categories/[slug].json.ts` | 每分类一份紧凑 Tag 索引；普通分类访问不会下载。 |
| `src/pages/archive.astro` | 归档页。 |
| `src/pages/rss.xml.ts`、`src/pages/atom.xml.ts` | 摘要型 Feed 输出，底层由 `src/services/feed.ts` 统一数据和 XML 语义。 |
| `src/pages/og/[...slug].png.ts` | Open Graph 图片生成。 |

## 配置入口

主要配置位于 `src/config.ts`，类型位于 `src/types/config.ts`。

高影响配置包括：

- `siteConfig`：站点信息、语言、特色页面、横幅、主题、字体、文章列表行为。
- `navbarConfig`：顶部导航。
- `profileConfig`：首页作者资料模块内容。
- `pageLayoutPolicies`：页面 Shell Strategy 与允许的 Desktop Page Layout Preference；当前 policy 仅允许 `content-right`。
- `commentConfig`：评论系统。

配置结构变化需要同步更新 [配置说明](./configuration.md)。

## 扩展原则

- 新增文章字段：先改 `src/content.config.ts`，再改 `src/services/core` 的派生逻辑。
- 分类定义由 `src/config/category-slugs.ts` 维护规范名称、slug 与兼容 alias，`src/services/core/taxonomy.ts` 在内容进入 Post Index 前完成统一；同义分类不得在 Content Store 中形成不同 route。
- 新增非文章数据：优先放到 `src/data`。
- 新增页面模块：放入所属领域目录，通过路由或 layout 显式组合；只有被多个无关功能复用的视觉外壳才提升为 `src/components/ui` 组件。不要恢复通用 placement registry。
- 网站级通知由 `src/config/site-notice.ts` 配置，`src/services/site-notice.ts` 生成 View Model，`src/components/site-notice` 拥有右上角预览呈现，`src/features/activity-center/notice-state.ts` 分别管理已读与关闭状态。通知通过独立的 `#site-notice-container` 在主内容 Shell 中更新，不得放进带 `transform` 的 `#swup-container`，否则固定定位会在过渡期间改用内容容器作为 containing block。Desktop/Tablet 通知使用贴近 viewport 右上角的单行状态卡，层级低于 Navbar 与交互浮层；Mobile 则限制在页面安全边距内并允许两行正文。通知 viewport 高度按断点固定，轮播不得在客户端按单条内容重新测量高度，因此通知切换不会改变文档 `scrollHeight` 或滚动条比例。`info` / `success` 作为短时 Preview 自动退场但继续保留在 Activity Center，`warning` / `danger` 保持可见直至用户处理。
- 右上角 Activity Center 由 `src/features/activity-center` 统一拥有，是信息入口而不是快捷操作入口。Navbar 中的 Bell Badge 只表达未读通知数，外圈只表达文章阅读进度；Panel 组合通知历史与当前文章的阅读百分比、当前 Heading、预计剩余时间和本地续读位置。阅读状态只读取 `#post-container` 暴露的标题与分钟元数据，并把浏览器交互状态保留在 Feature 内，不进入 `src/services`。
- Activity Center 与 Floating Tools 新增的 Shell Icon 必须保存到 `src/assets/icons/material-symbols`，并在 `src/components/ui/local-icons.ts` 显式登记，由 Astro/Svelte 两个 `LocalIcon` Renderer 以本地 Mask Asset 呈现，不得在运行时请求 Iconify API。Activity Center 遇到未登记的动态通知图标时回退为本地 Info Icon；新增通知图标时应同步补充 SVG 与 Registry。
- 右下角 Floating Tools 由 `src/features/floating-tools` 统一拥有 viewport placement、响应式触摸尺寸与展开状态，并在 `MainGridContent.astro` 中挂载到整个动画 Main Content Layer 外。Theme、Music、Settings、Floating TOC 与 Back to Top 继续拥有各自行为，只把入口组合进统一 Rail；新的 Shell 悬浮入口不得再单独声明互相竞争的右下角 fixed 坐标。Settings 必须使用传入的 Feature class 形成真正的 viewport Panel，不能把 Astro 的 `class:list` 语法用于 Svelte 组件。
- Pio 的 `pioConfig.enable` 与 `hiddenOnMobile` 决定功能是否可用，`src/features/pio/preferences.ts` 则封装访客的显示偏好；Tools 开关与 Pio 自带关闭/恢复入口共享同一事件契约。Music Player 通过 `src/features/music-player/events.ts` 接收 Panel 命令并发布播放、加载、首次播放与展开状态；Floating Tools 只消费该契约并根据播放器占用高度避让，不直接持有 Audio 状态，也不通过 DOM Mutation 反推播放器状态。
- 新增页面逻辑：先封装到 `src/services`，再接入 `src/pages`。
- 分类、标签和文章 URL 不要硬编码。共享 URL 拼接使用 `src/utils/url.ts`，分类与标签规范化使用 `src/services/core/taxonomy.ts`，文章 canonical URL 使用 `src/services/core/post-routes.ts`。图片 glob、Astro Content 类型与 Node API 只属于 `src/services/core/content-assets.ts`，不得进入客户端依赖图。

## 首页与文章视觉基础

首页和文章详情页通过 `src/design/` 统一 Surface、文本层级、内容宽度、页面间距与 Typography。其他功能页仍可通过 Legacy token 保持兼容，详细分层和迁移规则见 [Design System](./design-system.md)。

- 首页文章列表使用 `--width-listing`，不随主内容列无限扩张。
- 文章正文阅读宽度使用 `--width-reading: 48rem`；代码、表格、图片与数学公式可扩展到 `--width-reading-wide`。
- 普通模式下文章正文使用无卡片背景的 Content Surface；壁纸透明或 Overlay 模式仍使用半透明背景、轻边框与 blur，以维持可读性。
- 首页和文章详情页优先消费 `--surface-*`、`--text-*`、`--border-*` 与 `--accent` 等 Semantic token。旧的 `--card-bg`、`--primary`、`--line-*` 等变量由 Compatibility 层供值，不应在新代码中继续扩散。
- 页面级留白使用 `--space-page-x`、`--space-content` 与 `--space-cluster`；组件内部的小型布局仍可使用 Tailwind spacing utility。

Design 层不拥有具体 Feature 动画、浏览器交互或第三方库主题；这些规则继续由所属 Feature 管理。
