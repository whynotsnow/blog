# Live2D Companion 维护指南

本文档集中维护项目中 Live2D Companion（看板娘）的实现、配置、交互契约和验证要求。其他文档只保留摘要和链接，避免重复描述同一套规则。

## 功能边界

Live2D Companion 是一个浏览器端组件 module，源码位于 `src/components/modules/live2d-companion/`，静态运行资源位于 `public/live2d-companion/`。

它负责：

- 通过 iframe 隔离加载 `/live2d-companion/live2d-host.html` 和第三方 `l2d-widget.min.js`。
- 根据 `src/config.ts` 中的 `live2dCompanionConfig` 初始化模型、UI、动作和空闲表情播放。
- 保存访客的挂载、收起、展开位置、收起头像位置和当前模型选择。
- 提供 show / collapse / toggle / message / expression 命令事件，供页面或其他 Feature 控制。
- 渲染父页面侧完整 expression 面板，避免受 iframe、canvas 层级和命中区域限制。

它不负责：

- 直接管理 Floating Tools 的布局。Floating Tools 只控制是否挂载 Live2D Companion。
- 暴露 iframe DOM 给页面或其他组件操作。
- 实现 VTS `ToggleExpression` 状态机。`defaultParameters` 只在模型加载完成后设置初始参数。
- 支持旧 widget 的 `mode`、static 布局、旧 DOM 菜单配置或远程 Iconify 依赖。

## 文件结构

```text
src/components/modules/live2d-companion/
  Live2DCompanion.svelte
  Live2DCompanionModule.svelte
  events.ts
  preferences.ts
  types.ts
  widget-config.ts
  use-live2d-companion-module.ts
  live2d-companion-position.ts
  live2d-companion-runtime.ts

public/live2d-companion/
  live2d-host.html
  l2d-widget.min.js
  models/
```

### 外层挂载

`Live2DCompanion.svelte` 只处理可用性和挂载状态：

- `live2dCompanionConfig.enable` 是首次默认挂载状态，不是功能可用性的硬开关。
- `live2dCompanionConfig.hiddenOnMobile` 为 `true` 时，`max-width: 1280px` 视为设备限制。
- Floating Tools 的入口始终存在，访客选择通过 `live2d-companion-mounted` 保存。

### 主组件

`Live2DCompanionModule.svelte` 是薄 Svelte 组件：

- 调用 `useLive2DCompanionModule()` 获取 `view` store 和事件 handler。
- 绑定 `rootEl`、`iframeEl`、`expressionPanelEl` 给 controller。
- 保留 iframe、收起头像、完整 expression 面板和 module-local CSS。

不要把大量状态逻辑重新写回这个文件。

### Hook / Controller

`use-live2d-companion-module.ts` 是组合层：

- 创建 `view` store。
- 组合位置 controller 和 runtime helper。
- 处理 `onMount` / `onDestroy`。
- 分发 iframe `postMessage`。
- 编排 collapse / expand / toggle。
- 返回组件模板需要绑定的 handler。

目标是保持该文件只负责组合，不直接承载所有细节实现。

### 位置模块

`live2d-companion-position.ts` 负责位置状态：

- 统一位置锚点：`localStorage.live2d-companion-anchor`，结构为 `{ edge, centerY }`。
- `edge` 只能是 `"left"` 或 `"right"`，`centerY` 表示展开态和收起态共享的垂直视觉中心。
- 展开态拖拽边界由 `ui.positionBounds` 控制；默认只允许停靠在 `live2dCompanionConfig.position` 配置侧，允许向配置侧外最多移出组件自身 `50%`，不允许向另一侧自由移动，上下不允许移出 viewport。
- 收起头像拖拽时临时位置完全限制在 viewport 内；拖拽过程中只跟随指针，不触发角落吸附。松手后按“此处展开后是否贴顶/贴底”的同一判定吸附到角落位置，再按横向停靠策略保存同一个 anchor。
- 收起和展开互相切换时都从 anchor 派生具体 rect，不再维护两套独立位置状态。
- `buildRootPositionStyle()` 是外层 CSS custom properties 的唯一构造入口。

### Runtime 模块

`live2d-companion-runtime.ts` 负责浏览器运行时交互：

- iframe `postMessage` 和 `l2d-init` 初始化。
- 站点 Theme token 同步。
- iframe 加载、模型状态、expression 列表消息处理。
- 完整 expression 面板开关、选择和鼠标离开关闭。
- 展开态 iframe 拖拽。
- 收起头像 pointer drag、click suppression 和边缘吸附。

### 配置构建

`widget-config.ts` 负责把站点配置转换成 iframe host 需要的 widget 配置：

- `models` 字符串会归一化为 `{ path }`。
- 模型条目可覆盖 `scale`、`offset`、`avatar`、`defaultParameters`、`expressionMenu`、`idlePlayback`。
- `tips` 优先于 `dialog.welcome` / `dialog.touch`。
- `ui` 配置只控制 iframe 壳层 UI，不依赖具体模型名称。

### 类型

`types.ts` 只放 module-local 类型。配置对外类型仍由 `src/types/config.ts` 维护。

## 配置入口

主要配置在 `src/config.ts` 的 `live2dCompanionConfig`，类型定义在 `src/types/config.ts`。

常用字段：

| 字段 | 说明 |
| --- | --- |
| `enable` | 首次默认挂载状态。访客选择会覆盖它。 |
| `models` | 模型路径数组，或 `{ path, label, avatar, scale, offset, defaultParameters, expressionMenu, idlePlayback }` 条目数组。 |
| `avatar` | 收起和加载状态默认头像。模型条目的 `avatar` 优先级更高。 |
| `position` | 默认左右位置，只在没有持久化位置时使用。 |
| `width` / `height` | 外层组件和模型 iframe 的尺寸基础。 |
| `modelScale` / `modelOffset` | 模型绘制缩放和偏移的全局默认值。 |
| `defaultParameters` | 模型加载后应用的默认 Live2D 参数。 |
| `hiddenOnMobile` | 是否在中小视口隐藏组件。 |
| `hideAboutMenu` | 是否隐藏旧 widget 的 About、休眠和 Switch 菜单按钮。 |
| `modelSwitch` | 本地模型切换按钮图标和文案。 |
| `expressionMenu` | 全局 expression action 和完整面板配置。 |
| `idlePlayback` | 用户空闲时随机播放 expression 的配置。 |
| `ui` | iframe 壳层 UI 配置，如主题来源、消息偏移、收起按钮、拖拽提示和 `positionBounds`。 |
| `dialog` / `tips` | 旧 widget tips 的文案来源。 |

## LocalStorage 契约

| Key | Owner | 内容 |
| --- | --- | --- |
| `live2d-companion-mounted` | `preferences.ts` | Floating Tools 控制的外层挂载状态，`"1"` 表示挂载。 |
| `live2d-companion-collapsed` | `preferences.ts` | 组件内部收起状态，`"1"` 表示收起。 |
| `live2d-companion-anchor` | `live2d-companion-position.ts` | 统一位置 `{ edge, centerY }`，展开态和收起态都由它派生。 |
| `live2d-companion-model-index` | `widget-config.ts` / iframe host | 当前模型索引。 |

外层挂载状态和内部收起状态必须保持独立。收起按钮只改变内部状态，不卸载组件；Floating Tools 关闭才卸载组件 DOM、iframe、Canvas 和实例。

## 事件契约

页面和其他组件必须通过 `src/components/modules/live2d-companion/events.ts` 控制看板娘：

```ts
showLive2DCompanion();
collapseLive2DCompanion();
toggleLive2DCompanion();
sendLive2DCompanionMessage("...");
setLive2DCompanionExpression("...");
```

不要直接操作 iframe DOM 或查询第三方 widget 内部节点。这样可以保持 iframe 隔离边界和后续模型替换能力。

## Iframe host 契约

`public/live2d-companion/live2d-host.html` 是 Live2D 渲染隔离层：

- 加载 `/live2d-companion/l2d-widget.min.js`。
- 接收父页面 `l2d-init` 消息完成初始化。
- 通过 `postMessage` 上报 `l2d-loaded`、`l2d-model-state`、`l2d-expressions`、`l2d-action`、`l2d-drag-*`。
- 使用本地 SVG 渲染收起、模型切换、常用表情和拖拽提示按钮。
- 同步 Light / Dark、`color-scheme` 和透明背景，避免暗主题下露出白底。

生产环境必须允许同源 iframe：

- `X-Frame-Options: SAMEORIGIN`
- `Content-Security-Policy: frame-ancestors 'self'`

不要改回 `DENY`，否则 `/live2d-companion/live2d-host.html` 会被浏览器拒绝加载。

## 拖拽交互

展开态拖拽：

- iframe host 负责长悬停识别和拖拽消息上报。
- 默认 `dragHoverDelay` 是 `1500ms`。
- 父页面 controller 负责实际 viewport 坐标、clamp 和持久化。
- 展开态默认锁定在配置侧，只允许向配置侧外最多 `50%` 移出 viewport；上下默认完全限制在 viewport 内。
- `ui.positionBounds.expandedHorizontalOverflowRatio` 和 `expandedVerticalOverflowRatio` 可调整展开态水平/垂直越界比例。
- `ui.positionBounds.horizontalDock` 控制横向停靠策略：默认 `"configured-edge"`，只停靠到 `live2dCompanionConfig.position`；需要恢复左右自由吸附时可改成 `"nearest-edge"`。
- `ui.positionBounds.horizontalInset` 控制收起头像和展开态距离配置侧左右边缘的距离，默认 `0`。
- `ui.positionBounds.viewportMargin` 控制收起头像和展开态距离 viewport 上下边缘的边距。
- `ui.positionBounds.collapsedCornerSnapTolerance` 控制收起头像与展开态角落判定之间的额外吸附容差。

收起态拖拽：

- 只作用于圆形头像按钮，不经过 iframe。
- pointer 移动超过阈值后才进入拖拽，避免和点击展开冲突。
- 拖拽结束保存 `{ edge, centerY }`。
- `edge` 由 `horizontalDock` 决定；默认跟随配置侧，`nearest-edge` 模式下才根据头像中心在 viewport 左右半区吸附。
- 靠近顶部或底部边界时，拖拽中仍保持指针跟随；松手后才吸附到对应角落。吸附起点和展开态点击收起时能收起到角落的判定保持一致，确保最终位置和后续展开/收起映射一致。
- 角落吸附只在 `pointerup` 后触发，避免大吸附范围造成拖不动。
- 松手进入角落吸附时会短暂启用位置过渡，使用 `0.32s cubic-bezier(0.16, 1, 0.3, 1)`，自由拖拽时不启用位置过渡。
- 拖拽结束会抑制同一轮 click，避免拖完误展开。

## Expression 面板

Expression 有两层：

- iframe 内 action 区：最多展示 5 个快捷 expression action。
- 父页面完整面板：最多按 `4 × 6 = 24` 个 expression 渲染。

完整面板由父页面组件渲染，不放在 iframe 内。点击完整面板里的表情后保持面板打开，方便连续预览；快捷表情、模型切换、收起或其他非面板操作会关闭完整面板。

新模型 expression 超过上限时，不承诺全部展示。维护时应删减、分组，或关闭完整面板后只配置 action。

## 模型维护

模型文件位于 `public/live2d-companion/models/`，当前包含 NOIR 和 14jiang 相关资源。

新增模型时：

1. 放入模型目录，确保 `.model3.json`、`.moc3`、贴图、物理文件和 expression 文件路径正确。
2. 在 `src/config.ts` 的 `live2dCompanionConfig.models` 增加模型条目。
3. 为模型配置 `label` 和 `avatar`，保证切换菜单和收起头像可用。
4. 需要微调显示时优先使用模型条目的 `scale` 和 `offset`。
5. expression 快捷入口放在模型条目的 `expressionMenu.shortcuts`。
6. 不要把只用于初始姿态的参数注册成 expression 动作。
7. 不要把 shell 控件、CSS 或命令逻辑绑定到某个模型名称或模型内部 DOM。

## 主题和样式

Live2D 外层样式属于 module-local CSS：

- 可使用 `--surface-*`、`--text-*`、`--border-*`、`--accent`、`--shadow-*` 等 Semantic token。
- 不新增全局 Design API，除非多个无关 Feature 都需要复用。
- iframe host 通过父页面同步的 Theme token 设置控件和消息气泡样式。
- 组件外层固定定位必须保持在 Swup 替换边界外，避免被 transformed ancestor 改变 fixed containing block。

## 与 Floating Tools 的关系

Floating Tools 只拥有入口和外层显示偏好：

- `Live2DCompanionToggle.svelte` 读写 `live2d-companion-mounted`。
- `live2dCompanionConfig.enable` 只提供首次默认值。
- 即使默认关闭，Floating Tools 入口仍可重新挂载看板娘。
- Floating Tools 不读取 Live2D 内部 DOM，不反推 collapse、iframe 或模型状态。

## 验证要求

修改 Live2D Companion 后，按影响范围选择最小充分验证。

常用检查：

```bash
pnpm lint
pnpm type-check
pnpm type-check:svelte
pnpm check
pnpm design:check
pnpm exec playwright test tests/e2e/features/floating-tools.spec.ts
```

文档变更还需要：

```bash
pnpm lint:md
node .agent-workspace/tools/agent-workspace.mjs validate
```

需要浏览器验证的典型场景：

- Floating Tools 能控制 Live2D 外层挂载。
- 中小视口下 `hiddenOnMobile: false` 时组件仍可用。
- iframe 能加载 `/live2d-companion/live2d-host.html`。
- 展开态拖拽、收起头像拖拽和刷新恢复坐标正常。
- expression 面板显示、选择和关闭行为符合契约。

## 常见风险

- 把 `enable` 当成硬开关，导致 Floating Tools 入口无法重新挂载组件。
- 直接操作 iframe DOM，破坏隔离边界。
- 把内部收起状态和外层挂载状态混为一谈。
- 只保存展开态位置，导致收起头像刷新后回到默认位置。
- 让收起头像拖出 viewport。
- 把 `X-Frame-Options` 改回 `DENY`。
- 依赖远程 Iconify 图标，导致菜单按钮离线或网络失败时不可用。
- 把 `defaultParameters` 当成 expression 状态管理。
- 新模型 expression 过多却没有控制 action 和完整面板上限。
