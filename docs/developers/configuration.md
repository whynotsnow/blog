# 配置说明

项目主要配置位于 `src/config/`，兼容导出入口位于 `src/config.ts`，类型定义位于 `src/types/config.ts`。

## 配置归属

本仓库是个人定制版本，`src/config/` 中的值是站点私有配置，不是上游 Mizuki 的通用默认值。

`src/config.ts` 只作为兼容入口使用，继续导出旧有配置名称，保证现有 `@/config`、`../config` 等导入路径不需要改动。新增或调整配置时，应修改 `src/config/` 下最接近的模块，而不是把新配置重新堆回 `src/config.ts`。

修改配置时：

- 注释应靠近对应配置项。
- 配置结构变化需要同步更新 `src/types/config.ts`。
- 影响使用、内容或部署的配置变化需要更新文档。
- 不要把密钥、Token、Cookie 写入配置文件。

## 配置文件结构

| 文件 | 说明 |
| --- | --- |
| `src/config.ts` | 兼容导出入口，只转发 `src/config/index.ts`。 |
| `src/config/index.ts` | 聚合导出所有配置模块。 |
| `src/config/site.ts` | 站点核心配置 `siteConfig`、`SITE_LANG`、`SITE_TIMEZONE`。 |
| `src/config/navbar.ts` | 顶部导航 `navBarConfig`。 |
| `src/config/profile.ts` | 个人资料 `profileConfig`。 |
| `src/config/wallpaper.ts` | 全屏壁纸 `fullscreenWallpaperConfig`。 |
| `src/services/layout/presets.ts` | 页面布局 `PageLayoutPolicy` 预设。 |
| `src/services/widget/presets.ts` | 各端点、各区域的 Widget placement。 |
| `src/config/music.ts` | 音乐播放器 `musicPlayerConfig`。 |
| `src/config/effects.ts` | 站点特效 `sakuraConfig`。 |
| `src/config/comments.ts` | 评论系统 `commentConfig`。 |
| `src/config/analytics.ts` | 统计脚本、GTM、Clarity、Umami 配置。 |
| `src/config/category-slugs.ts` | 分类 slug 映射。 |
| `src/config/widget-configs.ts` | 运行时 widget 配置聚合对象。 |

## 重要配置组

| 配置 | 说明 |
| --- | --- |
| `siteConfig` | 站点信息、语言、特色页面、横幅、主题、文章列表、字体等。 |
| `fullscreenWallpaperConfig` | 叠加全屏壁纸资源与效果行为。 |
| `navBarConfig` | 顶部导航链接。 |
| `profileConfig` | 个人资料组件内容。 |
| `licenseConfig` | 默认内容协议展示。 |
| `commentConfig` | 评论系统配置。 |
| `pageLayoutPolicies` | 页面基础布局与允许的桌面布局集合。 |
| `widgetPlacementPresets` | Desktop、Tablet、Mobile 各区域的 Widget 实例。 |
| `expressiveCodeConfig` | 代码块渲染行为。 |

## 侧边栏 Widget 布局

页面布局和 Widget placement 是两个独立配置边界：`pageLayoutPolicies` 决定各端点有哪些区域以及如何排列，`widgetPlacementPresets` 只决定区域中渲染哪些 Widget。Widget 数量、空区域或某端点的配置不得改变页面布局，也不会触发跨端点自动迁移。

- `desktop.left`、`desktop.right`、`desktop.sidebar`：显式定义 Desktop 各布局区域中的 Widget。
- `tablet.sidebar`：显式定义 Tablet 侧栏，不会继承 Desktop 配置。
- `mobile.beforeContent`、`mobile.afterContent`：显式定义 Mobile 内容前后的 Widget，不再使用历史 `drawer` 命名。
- `position: "flow"`：Widget 按普通文档流排列。
- `position: "sticky"`：Widget 放入吸顶区域；当对应侧栏在 `md`（`>=768px`）及以上可见时由 CSS 启用吸顶，Desktop 与 Tablet 共用该规则，Mobile 保持普通流。

Sticky 区域由 `WidgetRegion.astro` 渲染，其根容器必须保持 `h-full`，否则 Sticky 容器会被自身内容高度限制并随页面滚出视口。

## SettingsPanel 相关配置

统一设置面板使用现有配置作为默认值来源，并通过 `switchable` 字段决定是否展示对应入口。

- `siteConfig.postListLayout.enable`：控制文章列表布局切换入口是否启用，`allowSwitch` 仍表示是否允许用户切换。
- `postListLayout` 的 `grid` 偏好会写入既有的 `localStorage.postListLayout`。在小于 `768px` 时，Grid 仍以单列卡片呈现以保证阅读宽度；偏好不会被重置，视口达到 `768px` 后会自动恢复双列。
- `desktopLayoutPreference`：保存用户的 Desktop 页面布局偏好。页面 policy 拥有最终约束权；文章详情页只允许 `content-right`，不会清除用户在其他页面使用的 `three-column` 偏好。
- `siteConfig.wallpaperMode.defaultMode`：支持 `banner`、`fullscreen`、`overlay`、`none`。`fullscreen` 表示全屏高度的 banner 模式；`overlay` 才会显示全屏壁纸图层，并通过 CSS 变量控制壁纸和卡片透明效果。
- 共享布局断点固定为：`0–479px` 小屏手机、`480–767px` 大屏手机、`768–1279px` 平板、`>=1280px` 桌面。Tailwind 同时显式使用 `sm: 640px`、`md: 768px`、`lg: 1280px`、`xl: 1920px`。
- 普通 Banner 使用 `--banner-block-size` 同步控制横幅高度与正文起始位置；低高度横屏约为 `60vh` 以优先正文。首页 Fullscreen Banner 始终为 `100dvh`，非首页移动端隐藏 Banner。
- `siteConfig.banner.carousel.switchable`：控制横幅轮播设置入口。当前入口只保留 UI 状态预览，不会写入运行时配置。
- `siteConfig.banner.waves.switchable`：控制横幅 waves 设置入口。用户设置会写入 `localStorage.wavesEnabled` 并实时显示/隐藏 waves。
- `siteConfig.banner.homeText.switchable`：控制首页 banner 文案设置入口。用户设置会写入 `localStorage.bannerTitleEnabled` 并实时显示/隐藏首页文案。
- `fullscreenWallpaperConfig.enable` 和 `fullscreenWallpaperConfig.switchable`：控制叠加全屏壁纸资源与壁纸模式切换入口。
- `fullscreenWallpaperConfig.overlay`：提供叠加壁纸的默认 `opacity`、`blur`、`cardOpacity`，以及各滑块的 `switchable` 配置。用户设置会分别写入 `localStorage.overlayOpacity`、`localStorage.overlayBlur`、`localStorage.overlayCardOpacity`。
- `fullscreenWallpaperConfig.fullscreen.switchable`：预留全屏横幅相关设置入口；当前全屏横幅不显示 `[data-fullscreen-wallpaper]` 图层。
- `sakuraConfig.switchable`：控制樱花特效设置入口。用户设置会写入 `localStorage.sakuraEnabled` 并通过 `sakura-manager` 启停运行时。

## 特色页面

`siteConfig.featurePages` 控制可选页面是否启用。关闭某个页面后，也应从导航配置中移除对应链接。

当前可选页面：

- `anime`
- `diary`
- `friends`
- `projects`
- `skills`
- `timeline`
- `albums`
- `devices`

番剧数据源由 `src/config/site.ts` 中的 `siteConfig.anime.mode` 控制，可选 `local`、`bangumi` 或 `bilibili`。当前配置使用 `local`，构建不会请求外部服务；选择 `bangumi` 或 `bilibili` 时必须同时配置对应用户 ID，否则数据更新和构建会失败。更新脚本在无法读取该配置时保留上游的 `bangumi` fallback。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `ENABLE_CONTENT_SYNC` | 是否启用外部内容仓库同步。 |
| `CONTENT_REPO_URL` | 外部内容仓库地址。 |
| `CONTENT_DIR` | 外部内容仓库本地目录。 |
| `GTM_ID` | Google Tag Manager 容器 ID。 |
| `CLARITY_PROJECT_ID` | Microsoft Clarity 项目 ID。 |
| `UMAMI_API_KEY` | 启用 Umami 统计时的 API key。 |
| `MONGODB_URI` | Twikoo MongoDB 连接字符串。 |
| `BILI_SESSDATA` | 可选 Bilibili 凭证。 |

本地值放在 `.env`，生产值放在 Vercel 或对应部署平台的环境变量中。

## URL

URL 相关工具位于：

- `src/utils/url-utils.ts`
- `src/utils/client-utils.ts`

新增代码不要硬编码分类、标签、文章 URL。文章详情页使用 `/posts/{slug}/`，可选 `alias` 会生成 `/posts/{alias}/`。
