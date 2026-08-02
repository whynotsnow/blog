# Design System

`src/design/` 是项目跨页面视觉规则的唯一所有者。它提供稳定的 CSS token、主题映射和 Pattern；组件负责组合这些 API，页面只负责路由与内容编排。

## 分层模型

Design token 按以下方向依赖：

```text
Primitive → Semantic → Theme/Pattern → Component
                         ↘ Compatibility → Legacy consumer
```

- **Primitive**：原始颜色与尺度，只能在 `src/design/` 内消费。
- **Semantic**：Surface、文本、边界和 Accent 等组件默认 API。
- **Theme**：Light、Dark 与 Wallpaper 上下文对 Semantic token 的重映射。
- **Pattern**：以 `ds-` 为前缀的跨框架布局和 Surface class。
- **Compatibility**：旧 token 到 Semantic token 的单向别名；不得反向依赖或形成循环。
- **Feature token**：只属于一个功能的变量留在所属组件或 `src/styles/`，并优先引用 Semantic token。

## 公共 API

### Token

| 类别 | 前缀 | 用途 |
| --- | --- | --- |
| Surface | `--surface-*` | Page、Content、Card、Raised、Overlay 层级 |
| Text | `--text-*` | Primary、Secondary、Muted、Disabled、On Accent |
| Border | `--border-*` | Subtle、Default、Strong 边界 |
| Accent | `--accent*` | 品牌色及 Hover、Active 状态 |
| Status | `--status-*` | Info、Success、Warning、Danger 状态强调色 |
| Layout | `--width-*`、`--space-*` | Shell、阅读宽度和页面节奏 |
| Typography | `--font-*`、`--text-*` | 正文、标题、标题行长和代码排版 |
| Shape | `--radius-*`、`--shadow-*` | 圆角与 Raised 层级 |
| Motion | `--motion-*` | 时长和 easing；具体动画仍由 Feature 所有 |

不要为了消除所有 CSS 数值而创建 token。只有跨功能重复、需要主题切换或代表稳定设计决策的值才进入 Design 层。

`--status-info`、`--status-success`、`--status-warning`、`--status-danger` 表示状态强调色，不直接表示背景或正文颜色。Feature 应基于状态强调色与 `--surface-*`、`--border-*` 组合局部 Surface 和边界；Form、Toast、Badge、Site Notice 等功能因此可以共享状态语言，而不必共享相同的背景强度。

Typography 中，Astro Font API 注入的 `--font-latin` 与 `--font-cjk` 只表示具体字体资源；当前 `--font-latin` 由 Zen Maru Gothic 生成 ASCII 子集，`--font-cjk` 由 Lolita V2 生成 CJK 子集。`src/design/tokens/typography.css` 使用它们组合语义级 `--font-body`，并继续派生 `--font-heading`。Feature 应消费 `--font-body`、`--font-heading` 或 `--font-mono`，不能直接绑定字体文件、Hash URL 或 Font API 生成的 Family Name。

Typography 规范化采用分批迁移。第一批只覆盖首页、分类页、文章详情页，以及这些页面直接展示或条件渲染的组件链路：`src/pages/index.astro`、`src/pages/posts/`、`src/components/home/`、`src/components/category/`、`src/components/post-detail/`、`src/components/post-toc/`、`PostMeta`、`MobileTOC`、`FloatingTOC`、评论入口、License、Markdown wrapper、`src/features/post-list/` 和 Markdown 样式。`projects`、`devices`、`friends`、`skills`、`diary`、`albums`、`anime`、RSS/Atom、404、播放器、设置面板等暂时按 Legacy Typography Debt 保留，只有进入后续批次时才迁移。

第一批范围内不应新增裸 `font-size` 或文字用途的 Tailwind `text-*`。字号优先从公共 Typography 阶梯获取；当某个功能需要稳定业务语义时，可以在所属 Feature CSS 中定义业务 token，但业务 token 的值应优先引用公共字号 token。例外仅限第三方组件覆盖、图标尺寸、外部库或极局部视觉校正，并应尽量用 Feature-local token 集中表达。图标尺寸不等同于文字字号；后续迁移中应从盘点里单独识别，避免把 icon `text-xl` 误当作正文排版契约。

迁移前后使用 `pnpm typography:inventory` 盘点第一批范围内的 Tailwind `text-*`、裸 `font-size`、已 token 化 `font-size` 和无效 Typography token。该命令当前是软约束，目标是先缩小第一批债务；当第一批收敛后，再考虑把新增裸字号接入 `pnpm design:check` 门禁。

公共 Typography 阶梯使用 `--text-*-size` 命名，优先覆盖第一批迁移需要的 UI 字号：Caption、Dense、Compact、Meta、UI、Muted UI、Emphasis UI、Body Regular、Subtitle、Card Title、Section Title、Stat、List Title、Page Title，以及图标字号 `--text-icon-*`。既有 `--text-small`、`--text-meta`、`--text-title` 作为兼容别名保留，但新 Feature 应优先引用新的 `--text-*-size` 阶梯；业务 token 例如 `--post-card-title-size`、`--category-filter-control-size` 应引用公共阶梯，而不是直接写裸字号。

### Pattern

| Class | 用途 |
| --- | --- |
| `.ds-surface-content` | 与页面背景融合的主要内容 |
| `.ds-surface-card` | 文章卡片、功能面板等普通承载面 |
| `.ds-surface-raised` | 搜索、设置和浮层 |
| `.ds-page-shell` | 全局 Shell 宽度与页面边距 |
| `.ds-reading-flow` | `48rem` 正文阅读流 |
| `.ds-reading-wide` | `52rem` 图片、代码、表格等宽内容 |
| `.ds-stack` | 纵向内容节奏，可用 `--stack-space` 覆盖 |
| `.ds-cluster` | 可换行的横向元素组，可用 `--cluster-space` 覆盖 |

Pattern 不包含路由、业务 ID、组件状态或交互逻辑。Astro 与 Svelte 的同一 UI 应消费相同 Pattern class。

首页与分类页的文章 Grid 使用 `post-feed` Container Query：容器小于 `608px` 为单列，达到 `608px` 为双列，达到 `932px` 为三列。单列 Grid 最大 `400px`，双列组合最大 `656px`，三列组合最大 `992px`。双列与三列 Card 的压力验证范围为 `296px–344px`，正式宽度预算约为 `296px–323px`：`296px` 是最低安全宽度，`320px` 是首选舒适宽度，列间距使用 `--space-grid-gap`；单列保留稍宽的阅读宽度。`608px` 端点在 `16px` gap 下正好提供两个 `296px` Card，`932px` 端点提供三个约 `300px` Card，因此最大宽度收缩后继续保留这两个安全端点。Grid Card 不再使用固定总高度，而是由 Cover 实际高度与固定 Content 预算自然相加；Cover 随 Card 宽度变化时，Content 不吸收剩余空间，因此窄 Card 不会反向产生更高的文字区域。Title、Meta、两行 Summary 与两行 Tags 使用固定槽位；区域间距只由前一槽位的 `margin-bottom` 提供。Tags 槽位严格由两行 Tag 与行间距组成，本身没有第二行之后的底部间距；Grid Content 独立保留约 `1.125rem–1.25rem` 的 bottom padding。封面高度根据 Card 容器宽度在 `10rem–14rem` 内流式变化；无图片时使用 Semantic token 生成占位封面。`container-content` 在 Desktop Landscape 仅补偿封面 `rem` 边界和内部 Spacing，并在 `2000px` 恢复默认值；Card Typography 不再参与 viewport 补偿，而是固定为 Title `1.25rem`、Summary `0.875rem`、Meta `0.75rem` 与 Tag `0.75rem`。Grid Card 固定使用一行 Title、一行 Meta、两行 Summary 与最多两行 Tags；Meta 的日期、分类和字数按自然信息流连续左对齐，分类至少保留约 `60px`，Card 不宽于 `304px` 时通过 `post-card` Container Query 隐藏全部 Meta 图标，当前支持范围内不隐藏字数；完整截断文本通过原生 `title` 提示，Pinned 状态显示在 Cover Badge，字数使用字/千字/万字紧凑格式。文章最多消费前六个 Tags，单个 Tag 不超过一半行宽，进入第三行的 Tag 及后续项由轻量布局守卫隐藏。封面继续使用 `56.25cqi`；`contain-intrinsic-size` 只提供单列约 `28rem`、多列约 `25rem` 的渲染占位估值，不再充当精确高度契约。List 模式继续使用 `--width-listing` 阅读宽度。Astro 与 Svelte renderer 复用 core `UIPost`，并输出一致的 Title、Card Meta、Summary、Tags 与 Cover 语义区域；Card Meta 独立于文章详情 `PostMeta`，Card 的 Grid/List 几何统一由 `src/features/post-list/post-list.css` 所有，Renderer 模板不再用响应式 Utility class 重复控制这些区域。

首页、分类页与文章详情页的 Main Grid 使用 `page-shell` Container Query。Banner 始终铺满 viewport；Navbar 与 Main Shell 共享 `1280px` 外部最大宽度。提供 support slot 的页面在 Shell 达到 `1200px` 时显示三列 Feed/Main + `248px–272px` support，组合最大宽度为 `1280px`；`880px–1199px` 显示双列 Feed/Main + support，组合最大宽度为 `944px`；低于 `880px` 时 support DOM 进入 Main 前方。`880px` 与 `1200px` 分别匹配双列和三列 Feed 的最低安全宽度、Sidebar 与 `16px` gap，因此保持不变。首页 support 为 Profile、站点概览、最近更新、分类与标签；分类页 support 为最近更新、热门标签与其他分类，避免重复 Main 内的分类筛选摘要；文章详情页 support 为唯一桌面文章目录、继续阅读与推荐阅读，Header、正文、封面和后置区块共享 `--width-reading-wide` rail。无 support 的 `container-content` 页面在 `1200px` 以下最大 `656px`、达到 `1200px` 后最大 `992px`。`PanelCard` 仅组合 `.ds-surface-card` 与局部间距，不拥有页面 placement 规则；Footer Stats 也在 Footer 内消费 Semantic token，而不模拟侧栏 Card。

站点根字号固定为 `16px`，不再在 Tailwind `md` 的 `768px` 端点从 `14px` 跳到 `16px`。正文语义字号控制在 `16px–17px`，文章详情主标题控制在约 `28px–34px`，Markdown 内部标题使用 `--text-article-h1` 到 `--text-article-h4` 表达层级，不使用 Tailwind Typography 的局部字号作为文章排版契约。`container-content` 页面也不消费旧 `pageScaling` 根字号缩放；移动端或 Feature Typography 应通过对应 Semantic/Feature token 表达，避免 Shell 的 px 宽度预算与 rem 尺度在 viewport 端点发生跳变。文章桌面侧栏由 `PostSupport` 作为整体 sticky shell 展示，TOC、继续阅读和推荐阅读共享同一个视口内滚动边界；TOC 在长文章中只展开当前一级章节附近的子项，接近文章末尾时压缩为一级标题概览。旧 `--page-width` 公式仅保留给尚未迁移的 legacy 页面。

`container-content` 的共享 Shell 补偿由布局策略自动启用，不按具体 route 建立白名单。Banner、Navbar 与 Footer 先在宽于 `1280px` 的 Desktop Landscape 环境中补偿 Typography 和组件内部 Spacing，并在 `2000px` 恢复默认尺寸；补偿继续使用 Feature-local `rem` token，不修改根字号。Banner 的 `vh`/`svh`/`dvh` 几何保持独立，不随 `1280px` Main Shell 和约 `320px` Card 的宽度预算变化。

Footer 不设置固定 Shell 高度，而是由内容自然撑开；外层间距、Stats 的横向与换行间距、Meta 行间距统一消费 Footer Feature-local token，并随同一 Desktop Landscape 补偿曲线变化。Banner 的容器高度仍只由 `--banner-block-size` 的 `vh`/`svh`/`dvh` 几何决定，文字补偿不得反向改变首屏比例。

Navbar 外层高度由 `--navbar-shell-height` 所有；`--main-content-offset` 与 Page Entry Clearance 从该高度和 `--navbar-shell-clearance` 推导。`container-content` 在同一 Desktop Landscape 范围内将 Shell 高度从 `1536px` viewport 的约 `64.8px` 平滑恢复到 `2000px` 的 `72px`，但 Navigation Button 继续保留 `44px` 点击区域，Logo 高度也不随这轮补偿变化。Navbar 滚动阈值必须消费同一高度契约，不得重新写入固定 `72px` 或 `88px`。右侧文章 TOC 的 sticky top 使用 `--main-content-offset`，不要使用更大的 `--page-entry-clearance`，否则会把 navbar clearance 叠加两次。

顶部 Navigation Progress 是 Shell-local Pattern：颜色消费 `--accent`，过渡消费 `--motion-*`，固定覆盖在页面顶部且不占文档流高度。它消费 Swup 生命周期并保证快速导航仍有短暂的可见反馈，但不作为内容、图片或 Svelte hydration 的完成状态。

## Theme 与 Wallpaper

Light Theme 在 Semantic 层提供默认值，`:root.dark` 只重映射主题相关 token。Wallpaper 模式通过 body class 重映射 Card Surface；组件不得自行重新计算 Light/Dark 颜色。

文章详情页在普通模式使用 `ds-surface-card` 作为阅读卡片边界。上方文章卡片与 `post-detail__after-flow` 后置卡片共享同一外层宽度；两张卡片内部的 Header、正文、封面、分享、许可、评论、最后修改和上下篇导航共享同一条 `--width-reading-wide` rail，以减少大屏时阅读内容与右侧 support aside 的空隙，并避免正文流与后置区块左右漂移。Wallpaper transparent/full-wall 模式在同一阅读卡片上额外增加 blur，以保证复杂背景上的可读性。

## 新增或修改视觉规则

1. 先检查现有 Semantic token 或 Pattern 是否覆盖需求。
2. 仅在多个无关功能都会复用时新增 Design API。
3. 单一功能的独特规则保留为 Feature-local token。
4. 新 Theme token 必须同时检查 Light、Dark 和 Wallpaper 上下文。
5. 不在 `src/pages/` 创建颜色、阴影、全局 custom property 或新的页面宽度体系。
6. 修改 Design API 后更新本文，并运行 `pnpm design:check`。

## Legacy 迁移

`--page-bg`、`--card-bg`、`--primary`、`--line-*` 等旧变量目前由 `compatibility/legacy-tokens.css` 提供。它们是迁移 API，不是新代码入口。

`scripts/design-system-baseline.json` 按 token 和文件记录现有债务：

- 现有记录可以暂时保留；
- 新增文件或新消费会导致 `pnpm design:check` 失败；
- 文件完成迁移后应从 baseline 删除；
- baseline 只应缩小，扩展必须伴随明确的 Design 评审。

## 验证

Design 相关修改至少运行：

```bash
pnpm design:check
pnpm lint
pnpm check
pnpm type-check
```

影响页面布局、主题或 Surface 时先运行 `pnpm test:plan`，并至少覆盖 `pnpm build:astro` 与 Design Contract E2E；跨功能变更再升级到 `pnpm verify:full`。`design:check` 会在 Design 文件进入 staged 状态时由 pre-commit 运行，也属于 CI 影响门禁。
