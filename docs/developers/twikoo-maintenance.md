# Twikoo 评论组件维护方案

本文记录本站 Twikoo 评论组件的集成方式、主题维护策略、升级流程和验证要求。当前目标是让 Twikoo v1.7.15 在首次进入文章页、通过 Swup 点击下一篇或其他文章链接后，都能稳定加载官方结构样式，并使用站点 Design token，而不是回退到 Twikoo/Element UI 原版蓝色。

## 当前集成边界

Twikoo 相关文件分为三层：

| 层级 | 文件 | 职责 |
| --- | --- | --- |
| 官方脚本 | `public/assets/js/twikoo.nocss.js` | Twikoo v1.7.15 的无 CSS 运行时代码。 |
| 官方样式 | `public/assets/css/twikoo.css` | 基于 Twikoo v1.7.15 官方 CSS，但将原版蓝色字面量改为 `--twikoo-*` CSS 变量。 |
| 站点桥接 | `src/components/comment/twikoo-theme.css` | 把站点 Semantic token 映射到 `--twikoo-*` 变量，并保留少量字体、圆角、输入框、内容排版整合。 |

客户端加载逻辑位于 `src/components/comment/twikoo-client.ts`：

- 先加载 `public/assets/css/twikoo.css`，再加载 `public/assets/js/twikoo.nocss.js`。
- 通过 `style#twikoo-theme-overrides` 注入站点桥接样式，并确保它位于 head 中后加载的 Twikoo/Vue style 之后。
- Swup 页面替换后重新检查 stylesheet 是否仍在当前 document 中；如果 CSS link 被移除，下一次初始化必须重新插入。
- 初始化开始时即写入 root 的 init key，避免 `content:replace` 与 `page:view` 在同一棵评论 DOM 上重复初始化。
- Twikoo 内置后台入口和后台面板由 `src/components/comment/twikoo-theme.css` 隐藏；评论管理已迁移到 `snow-base` 管理端代理，不再从 blog 页面打开 Twikoo 原生后台。

## 为什么不直接 fork Twikoo

当前方案选择维护 vendored CSS，而不是 fork Twikoo 官方项目，原因是：

1. 本站需要修改的是主题色和加载顺序，不是 Twikoo 的评论业务逻辑。
2. Twikoo DOM 和 Element UI selector 仍沿用官方版本；fork JS 会扩大维护面，后续安全修复和上游升级都需要自行合并。
3. 仅覆盖 `src/components/comment/twikoo-theme.css` 会导致 selector 数量膨胀，且容易遗漏 `.tk-action-icon`、`.el-input__inner:focus`、`.tk-tag-blue`、分页、loading 等官方蓝色入口。
4. 将官方蓝色字面量替换为变量后，站点只需要维护一层小的 token bridge，后续换主题或调整 accent 不需要继续追逐每个 Twikoo selector。

只有出现以下情况时，才考虑 fork Twikoo：

- 必须修改 Twikoo JS 或 Vue 组件行为，且无法通过初始化配置、加载顺序或站点外层生命周期解决。
- 官方 CSS/DOM 结构频繁变化，导致 vendored CSS 变量化成本超过维护 fork 的成本。
- 需要长期发布一个本站私有 Twikoo 发行包，并能承担上游合并、构建、许可证和安全更新成本。

## 官方 CSS 变量化规则

`public/assets/css/twikoo.css` 应尽量保持官方结构，只替换 Twikoo/Element UI 的主题蓝色。状态色不要随意改动：success、warning、danger、info 这类语义色属于组件状态，不等同于原版品牌蓝。

当前蓝色映射如下：

| 官方字面量 | 替换为 |
| --- | --- |
| `#409EFF`、`#409eff` | `var(--twikoo-accent)` |
| `#3a8ee6` | `var(--twikoo-accent-active)` |
| `#66b1ff` | `var(--twikoo-accent-hover)` |
| `#c6e2ff` | `var(--twikoo-accent-border-hover)` |
| `#ecf5ff` | `var(--twikoo-accent-surface)` |
| `#b3d8ff` | `var(--twikoo-accent-border)` |
| `#a0cfff` | `var(--twikoo-accent-disabled-bg)` |
| `#8cc5ff` | `var(--twikoo-accent-disabled-text)` |
| `#d9ecff` | `var(--twikoo-accent-disabled-border)` |
| `rgba(64,158,255,0.13)` | `var(--twikoo-accent-surface-strong)` |
| `rgba(64,158,255,0.50)` | `var(--twikoo-accent-border-strong)` |
| `rgba(64, 158, 255, 0.6)` | `var(--twikoo-accent-muted)` |
| `rgba(64,158,255,0.063)` | `var(--twikoo-accent-surface-soft)` |

更新或重新下载官方 CSS 后，必须扫描确认没有遗漏原版蓝色：

```bash
rg -n "#409EFF|#409eff|#3a8ee6|#66b1ff|#c6e2ff|#ecf5ff|#b3d8ff|#a0cfff|#8cc5ff|#d9ecff|rgba\\(64, ?158, ?255" \
  public/assets/css/twikoo.css \
  src/components/comment/twikoo-theme.css \
  tests/e2e/features/post-detail.spec.ts
```

该命令应无输出。

## `twikoo-theme.css` 的维护原则

`src/components/comment/twikoo-theme.css` 不应重新实现 Twikoo 官方样式。它只负责：

- 定义 `--twikoo-accent*` 变量，并从站点 Semantic token 派生值。
- 统一评论区字体、字号、行高、正文链接、代码块、图片、头像圆角。
- 统一输入框的站点表面、圆角、focus ring。
- 处理少量与页面视觉一致性相关的 border、radius、surface。

避免在这里继续新增大量 Twikoo/Element UI 颜色覆盖，例如：

- `.el-button--primary` 全状态颜色；
- `.tk-action-icon`、`.tk-sort-item`、`.tk-pagination-pager.__current`、`.el-loading-spinner` 的主题色；
- `.tk-tag-blue` 的蓝色背景和边框；
- `.el-input__inner:focus`、`.el-textarea__inner:focus` 的原版蓝色边框。

这些颜色入口应优先在 `public/assets/css/twikoo.css` 中通过变量解决。

## 升级 Twikoo 的流程

升级 Twikoo 时按以下顺序处理：

1. 下载目标版本官方包，例如 `npm pack twikoo@<version>`，只把需要的 dist 产物复制到 `public/assets/`。
2. 优先选择 `twikoo.nocss.js`，继续让站点显式加载 CSS，避免 `twikoo.all.min.js` 把 JS 和样式顺序绑定在一起。
3. 用官方 `twikoo.css` 覆盖 `public/assets/css/twikoo.css` 后，重新应用“官方 CSS 变量化规则”。
4. 扫描是否还存在 Twikoo/Element UI 原版蓝色。
5. 检查 `src/components/comment/twikoo-theme.css` 是否仍只承担 token bridge 和少量结构整合；如果 selector 明显膨胀，应优先回到 vendor CSS 变量化层修复。
6. 更新 E2E mock，使 mock CSS 继续模拟“变量化后的官方 CSS”，不要让测试依赖大面积主题覆盖。
7. 运行验证命令。

## 验证要求

修改 Twikoo 集成、CSS 或文章详情页评论生命周期后，至少运行：

```bash
pnpm exec playwright test tests/e2e/features/post-detail.spec.ts -g "Twikoo"
pnpm design:check
pnpm lint
pnpm type-check
pnpm type-check:tests
pnpm check
```

浏览器验证应优先使用 Playwright。关键断言包括：

- 首次进入文章页后存在且只存在一个 `/assets/css/twikoo.css` link。
- Swup 导航到下一篇或其他文章后，Twikoo CSS link 仍存在；如果被 Swup 移除，下一次初始化会重新插入。
- `style#twikoo-theme-overrides` 位于官方 CSS 和后续注入的 Twikoo/Vue style 之后。
- `.tk-action-icon`、`.tk-actions button`、`.tk-nick-link:hover`、`.el-input__inner:focus`、`.el-textarea__inner:focus`、`.el-button--primary`、`.el-button--text`、`.tk-sort-item.__active`、`.tk-icon.__comments`、`.tk-tag-blue`、`.tk-pagination-pager.__current`、`.el-loading-spinner` 等代表性节点的 computed style 使用站点主题变量，不出现原版蓝色。
- Swup 连续文章导航不会对同一个评论 root 双重初始化。
- Twikoo mock 中的后台入口和后台面板应保持不可见，避免迁移到 `snow-base` 后又从 blog 暴露原生后台入口。

如果真实 Twikoo 服务因网络或后端限制无法返回评论数据，仍应通过 Playwright 注入最小 DOM fixture 检查 computed style；最终说明中必须区分“真实服务数据未验证”和“真实页面 DOM/CSS 计算已验证”。
