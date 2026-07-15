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
| Layout | `--width-*`、`--measure-*`、`--space-*` | Shell、阅读宽度和页面节奏 |
| Typography | `--font-*`、`--text-*-size` | 正文、标题和代码排版 |
| Shape | `--radius-*`、`--shadow-*` | 圆角与 Raised 层级 |
| Motion | `--motion-*` | 时长和 easing；具体动画仍由 Feature 所有 |

不要为了消除所有 CSS 数值而创建 token。只有跨功能重复、需要主题切换或代表稳定设计决策的值才进入 Design 层。

`--status-info`、`--status-success`、`--status-warning`、`--status-danger` 表示状态强调色，不直接表示背景或正文颜色。Feature 应基于状态强调色与 `--surface-*`、`--border-*` 组合局部 Surface 和边界；Form、Toast、Badge、Site Notice 等功能因此可以共享状态语言，而不必共享相同的背景强度。

### Pattern

| Class | 用途 |
| --- | --- |
| `.ds-surface-content` | 与页面背景融合的主要内容 |
| `.ds-surface-card` | 文章卡片、Widget 等普通承载面 |
| `.ds-surface-raised` | 搜索、设置和浮层 |
| `.ds-page-shell` | 全局 Shell 宽度与页面边距 |
| `.ds-reading-flow` | `48rem` 正文阅读流 |
| `.ds-reading-wide` | `52rem` 图片、代码、表格等宽内容 |
| `.ds-stack` | 纵向内容节奏，可用 `--stack-space` 覆盖 |
| `.ds-cluster` | 可换行的横向元素组，可用 `--cluster-space` 覆盖 |

Pattern 不包含路由、业务 ID、组件状态或交互逻辑。Astro 与 Svelte 的同一 UI 应消费相同 Pattern class。

首页与分类页的文章 Grid 使用 `post-feed` Container Query：容器小于 `608px` 为单列，达到 `608px` 为双列，达到 `932px` 为三列。单列 Grid 最大 `400px`，双列组合最大 `704px`，三列组合最大 `1064px`。双列与三列 Card 的目标范围约为 `296px–344px`，列间距使用更紧凑的 `--space-grid-gap`，避免 Card 达到最大宽度后在两列到三列之间形成过长的闲置区；单列保留稍宽的阅读宽度。Grid Card 固定高度继续为 `29rem`，封面高度根据 Card 容器宽度在 `10rem–14rem` 内流式变化；无图片时使用 Semantic token 生成占位封面。List 模式继续使用 `--width-listing` 阅读宽度，Astro 与 Svelte renderer 必须保持同一 Card 结构和 Semantic token 契约。

首页、分类页与文章详情页的 Main Grid 使用 `page-shell` Container Query，并共享一套按压缩预算退让的 Shell 契约。Banner 始终铺满 viewport；Navbar、Main Shell 与三列 Main Grid 共享 `1352px` 外部最大宽度。Shell 不再用内部 padding 消耗这项宽度预算，窄于最大宽度时由 `--space-shell-wide-x` 收缩外宽并形成安全 margin。Shell 达到 `1200px` 时显示三列 Feed + Sidebar；低于该端点后切换为双列 Feed + Sidebar，组合最大 `992px`。Shell 低于 `880px` 时隐藏右侧 Sidebar，将同一批 Widget 放到 Main 前方并占满布局宽度；Feed 保持双列，低于 `608px` 后再退为单列。Sidebar 在 `248px–272px` 内压缩。Sidebar 端点与双列 Feed 最小宽度由同一预算推导，因此禁止出现单列 Card + 右侧 Sidebar，也禁止 Supporting Row 与右侧 Sidebar 同时显示。Widget Slot 使用 `widget-card` Container Query 控制 Profile 与 Site Stats 的内部排列。

`container-content` 页面不消费旧 `pageScaling` 根字号缩放；字体与间距应通过 Design token 自身的 `clamp()` 流式变化，避免 Shell 的 px 宽度预算与 rem 尺度在 viewport 端点发生跳变。文章 Sidebar TOC 使用 `--width-shell-wide` 推导 Shell 外侧 Rail，并只在 viewport 能同时容纳完整 Shell、间距和 TOC 时出现；旧 `--page-width` 公式仅保留给尚未迁移的 legacy 页面。

顶部 Navigation Progress 是 Shell-local Pattern：颜色消费 `--accent`，过渡消费 `--motion-*`，固定覆盖在页面顶部且不占文档流高度。它消费 Swup 生命周期并保证快速导航仍有短暂的可见反馈，但不作为内容、图片或 Svelte hydration 的完成状态。

## Theme 与 Wallpaper

Light Theme 在 Semantic 层提供默认值，`:root.dark` 只重映射主题相关 token。Wallpaper 模式通过 body class 重映射 Card Surface；组件不得自行重新计算 Light/Dark 颜色。

文章详情页在普通模式使用透明 Content Surface；Wallpaper transparent/overlay 模式仍由文章 Feature 增加半透明背景、边框、圆角和 blur，以保证复杂背景上的可读性。

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

影响页面布局、主题或 Surface 时继续运行 `pnpm build` 和 `pnpm test:smoke`。`design:check` 当前在 CI 中阻塞新增违规，但尚未接入 precommit。
