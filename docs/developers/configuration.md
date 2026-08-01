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
| `src/config/wallpaper.ts` | 全屏壁纸 `wallConfig`。 |
| `src/services/layout/presets.ts` | 页面布局 `PageLayoutPolicy` 预设。 |
| `src/config/music.ts` | 音乐播放器 `musicPlayerConfig`。 |
| `src/config/effects.ts` | 站点特效 `sakuraConfig`。 |
| `src/config/comments.ts` | 评论系统 `commentConfig`。 |
| `src/config/analytics.ts` | 统计脚本、GTM、Clarity、Umami 配置。 |
| `src/config/category-slugs.ts` | 分类 slug 映射。 |

## 重要配置组

| 配置 | 说明 |
| --- | --- |
| `siteConfig` | 站点信息、语言、特色页面、横幅、主题和文章列表等。 |
| `wallConfig` | 全屏壁纸资源与效果行为。 |
| `navBarConfig` | 顶部导航链接。 |
| `profileConfig` | 首页作者资料模块内容。 |
| `licenseConfig` | 默认内容协议展示。 |
| `commentConfig` | 评论系统配置。 |
| `pageLayoutPolicies` | 页面 Shell Strategy 与由配置确定的桌面布局。 |
| `expressiveCodeConfig` | 代码块渲染行为。 |

## 字体配置

字体属于 Build 与 Design 基础设施，不再由 `siteConfig` 配置。字体源、字重、字符集策略、Locale 适用范围和 Astro CSS Variable 统一声明在 `scripts/fonts/config.mjs`；原始 TTF 使用小写 ASCII 文件名存放在 `scripts/fonts/source/`，不能放回 `src/assets/` 或 `public/`。

`pnpm font:prepare` 根据当前准备完成的 Content、`src` UI 文本和固定 safelist 生成缓存于 `.font-build/` 的 WOFF2 子集。Astro Font API 再将这些产物发布为带内容 Hash 的 `/_astro/fonts/*.woff2`，并生成 `@font-face` 与 CSS Variable。当前 `--font-latin` 由 Zen Maru Gothic 生成 ASCII 子集，`--font-cjk` 由 Lolita V2 生成 CJK 子集；它们仍只是字体资源变量，语义字体栈由 Design Typography 的 `--font-body`、`--font-heading` 和 `--font-mono` 拥有。

新增 Locale 时，在字体包配置中补充 `locales`、`unicodeRange` 和对应字符集策略。只 Preload 当前首屏必需且体积较小的 Latin 字体；其他语言字体应依赖 `unicode-range` 按实际字符加载，或在用户准备切换语言时 Prefetch，不能默认 Preload 全部语言包。

## 页面模块与布局

项目不再提供通用 Widget registry、placement preset 或跨端点 resolver。业务模块由页面显式拥有：首页通过 `MainGridLayout` 的 `support` slot 传入一份 Profile；归档页在主内容流中组合 Calendar 与 Timeline，只负责时间维度浏览；分类与 Tag 浏览由分类页持有；站点统计由 Footer service 和 Footer component 持有；文章 TOC 属于 post detail feature。

`shellStrategy` 选择页面级响应式几何：`container-content` 使用 Page Shell Container Query，`viewport-legacy` 保留尚未迁移页面的 viewport Grid。`pageLayoutPolicies` 只声明 Shell Strategy 和由配置确定的 Desktop Layout，不再提供用户侧 Desktop Layout Preference，也不描述业务模块 inventory。新增模块时应在所属页面或 layout 中显式组合，不要向配置层添加通用 placement 描述。

## 网站通知

网站通知由 Navbar 右侧的 Activity Center 统一展示。Activity Center 是站点基础设施，始终渲染；没有任何通知内容时只保留阅读状态与空通知状态，不再通过配置项控制是否挂载。面板中只显示通知标题和摘要，点击通知后打开弹窗阅读完整 Markdown 正文；文章页上的外圈仍只显示当前阅读进度。Activity Center 不承载 Theme、Settings 等操作型工具。

通知文件位于 `src/content/notifications/*.md`。Frontmatter 字段：

- 通知文件名：通知的稳定版本 ID，例如 `site-building-2026-07.md` 对应 `site-building-2026-07`；用户已读状态以 `site-notice:read:<id>` 保存，忽略状态以 `site-notice:dismissed:<id>` 保存，确认状态以 `site-notice:acknowledged:<id>` 保存。发布需要重新展示的新通知时应修改文件名。
- `title`：面板和弹窗标题，应短句概括通知内容。
- `summary`：Activity Center 列表摘要，建议一行内可读。
- `status`：支持 `info`、`success`、`warning`、`danger`，视觉由 Design Semantic status token 提供。
- `level`：支持 `normal`、`important`、`urgent`、`critical`。`important` 和 `urgent` 未读时会在每个浏览器会话中自动展开一次 Activity Center；`critical` 未确认时会在每个浏览器会话中自动打开一次弹窗。
- `pinned`：是否置顶并自动打开详情；当前内容约定最多只有一条。`pinned` 表达展示策略，`level` 表达严重程度。
- `dismissible`：是否允许用户忽略通知。未配置时 `critical` 默认为 `false`，其他等级默认为 `true`。
- `requiresAck`：是否必须通过“我知道了”确认；未配置时 `critical` 默认为 `true`，其他等级默认为 `false`。确认会同时写入已读状态。
- `action`：可选操作链接，包含 `label`、`href` 和 `external`；配置存在即显示，不需要额外 enable 字段。
- `visibility.scope`：`all` 表示全部页面，`home` 仅首页，`content` 表示非首页。
- `visibility.include`、`visibility.exclude`：可进一步按路径控制。路径默认精确匹配，以 `*` 结尾时匹配该路径及其子路径，例如 `/posts/*`。

通知正文使用 Markdown 编写，由 Astro 在构建期渲染后交给弹窗展示。通知弹窗适合短段落、列表、链接和少量代码；长篇说明应通过 `action` 链接到正式文章或 `spec` 页面。

通知状态语义：

- “已读”表示用户打开过详情，不再计入未读 Badge。
- “确认”表示用户明确点击“我知道了”，主要用于 `critical` 或需要确认的置顶通知。
- “忽略”表示用户不再希望在列表中看到该通知。
- 用户手动关闭自动展开的 Activity Center 后，本浏览器会话不会再次自动展开；用户点击“稍后再看”关闭自动弹窗后，本浏览器会话不会再次自动弹出。

## SettingsPanel 相关配置

统一设置面板从 Navbar 迁入右下角 Floating Tools。Tools 收起时保留主入口与按滚动状态出现的 Back to Top，展开后提供 Theme、Music、Floating TOC（当前页面存在标题时）和 Settings 入口。Settings 打开后 Tools Rail 自动收起；桌面端面板根据入口所在的 viewport 侧动态对齐，并把完整高度限制在 Safe Area 内，移动端使用底部 Sheet。设置面板继续使用现有配置作为默认值来源，并通过 `switchable` 字段决定是否展示对应配置项。

- `siteConfig.postListLayout.enable`：控制文章列表布局切换入口是否启用，`allowSwitch` 仍表示是否允许用户切换。
- `postListLayout` 默认使用 `grid`，偏好会写入既有的 `localStorage.postListLayout`，已保存的 List 偏好不会被重置。它只控制 Post List View，不再隐式改写页面级 Layout Policy。
- 首页、分类页和文章详情页使用 Container Query：Banner 始终铺满 viewport，Navbar 与 Main Shell 共享 `1280px` 外部最大宽度。首页在 `1200px` 以上使用最大 `992px` 的三列 Feed + Profile support，在 `880px–1199px` 使用最大 `656px` 的双列 Feed + Profile support，低于 `880px` 时把同一个 Profile DOM 放到 Main 前方；Feed 低于 `608px` 后退为单列。分类页与文章页不提供 support slot，内容区在 `1200px` 以下最大 `656px`、达到 `1200px` 后最大 `992px`。断点针对实际容器，不直接对应 viewport 宽度。
- `siteConfig.pageScaling` 仅保留给尚未迁移的 `viewport-legacy` 页面；首页、分类页和文章详情页会主动清除根字号缩放，不能依赖该配置改变 Card、Sidebar 或 Typography 尺寸。
- `siteConfig.wallpaperMode.defaultMode`：支持 `banner`、`full-banner`、`full-wall`、`none`。`banner` 表示横幅模式；`full-banner` 表示全屏横幅；`full-wall` 显示全屏壁纸图层，并通过 CSS 变量控制壁纸和卡片透明效果；`none` 隐藏壁纸。
- Banner、Navbar 与尚未迁移页面仍使用 viewport 断点：`0–479px` 小屏手机、`480–767px` 大屏手机、`768–1279px` 平板、`>=1280px` 桌面。首页、分类页和文章详情页的内容布局不使用这些断点，而以 `page-shell` 与 `post-feed` Container Query 为准。
- 普通 Banner 使用 `--banner-block-size` 同步控制横幅高度与正文起始位置；低高度横屏约为 `60vh` 以优先正文。首页 Fullscreen Banner 始终为 `100dvh`，非首页移动端隐藏 Banner。
- `siteConfig.banner.carousel.switchable`：控制横幅轮播设置入口。当前入口只保留 UI 状态预览，不会写入运行时配置。
- `siteConfig.banner.waves.switchable`：控制横幅 waves 设置入口。用户设置会写入 `localStorage.wavesEnabled` 并实时显示/隐藏 waves。
- `siteConfig.banner.homeText.switchable`：控制首页 banner 文案设置入口。用户设置会写入 `localStorage.bannerTitleEnabled` 并实时显示/隐藏首页文案。`homeText.subtitle` 在 `typewriter.enable=true` 时交给 Typewriter 轮播；关闭 Typewriter 时渲染第一条副标题作为静态文案。
- `wallConfig.enable` 和 `wallConfig.switchable`：控制全屏壁纸资源与壁纸模式切换入口。
- `wallConfig.effects`：提供全屏壁纸的默认 `opacity`、`blur`、`cardOpacity`，以及各滑块的 `switchable` 配置。用户设置会分别写入 `localStorage.wallOpacity`、`localStorage.wallBlur`、`localStorage.wallCardOpacity`。
- 横幅模式与全屏横幅共用 `siteConfig.banner.carousel`，差异只来自 Banner 几何与页面 Shell 表现；`wallConfig.carousel` 只作用于 `full-wall` 模式的 `[data-wallpaper]` 全屏壁纸图层。
- `sakuraConfig.switchable`：控制樱花特效设置入口。用户设置会写入 `localStorage.sakuraEnabled` 并通过 `sakura-manager` 启停运行时。
- `live2dCompanionConfig.enable` 仅提供 Live2D Companion 的默认页面挂载状态，Floating Tools 的看板娘入口仍可重新挂载组件。访客挂载、内部收起、统一位置锚点和模型索引分别写入独立 `localStorage` key；拖拽边界可通过 `ui.positionBounds` 配置，其中 `horizontalDock` 默认锁定到配置侧，`horizontalInset` 默认让组件贴合左右边缘。模型、expression、idle playback、iframe host、拖拽、同源 iframe header 和旧 widget 配置边界详见 [Live2D Companion 维护指南](./live2d-companion-maintenance.md)。
- `musicPlayerConfig.enable` 仅提供音乐播放器 UI 的默认页面挂载状态；即使设为 `false`，Floating Tools 的 Music 入口仍然存在并可重新显示播放器，访客选择写入 `localStorage.music-player-mounted`。播放器自身继续拥有播放、Default、Mini、Expanded 与 Playlist 状态，Floating Tools 只通过 Feature-local Event Contract 控制模块 UI 是否展示，不直接操作 Audio 或内部面板状态。
- Music Player 默认以右下角圆形封面出现，点击后进入 Mini，Mini 再进入 Expanded；播放与非播放状态使用同一套 UI 交互。Default 封面使用不改变外轮廓尺寸的轻微上浮 Hover，并允许阴影与过渡内容越过状态容器，避免固定宽度裁切封面或留下半圆阴影。Default ↔ Mini 使用同一组裁切、缩放与旋转插值反向播放，确保往返动画互为镜像；Mini ↔ Expanded 的两个 Surface 共用同一时长、easing、clip-path、blur 与 transform 轨迹。Floating Tools 的 FLIP 位移由同一个 easing 函数生成关键帧，并使用播放器传出的 transition 起始时间校正事件延迟，因此展开与回落都会沿同一条 `420ms` 时间轴运行。所有状态过渡均在 `prefers-reduced-motion` 下取消时长。
- Display Settings 首次定位不参与动画，只过渡 `opacity`、轻微纵向 `transform` 与 Surface 属性，避免从旧坐标横向飞入。

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
| `ENABLE_CONTENT_SYNC` | 是否启用外部内容准备；未设置时默认为 `false`。 |
| `CONTENT_REPO_URL` | 外部内容仓库地址，启用时必需。 |
| `CONTENT_REPO_COMMIT_SHA` | 要构建的完整 40 位 commit SHA，启用时必需。 |
| `CONTENT_DIR` | staging、release、current 指针和本地备份的状态目录，默认 `./content`。 |
| `GTM_ID` | Google Tag Manager 容器 ID。 |
| `CLARITY_PROJECT_ID` | Microsoft Clarity 项目 ID。 |
| `UMAMI_API_KEY` | 启用 Umami 统计时的 API key。 |
| `MONGODB_URI` | Twikoo MongoDB 连接字符串。 |
| `BILI_SESSDATA` | 可选 Bilibili 凭证。 |

本地值放在 `.env`，生产值放在 Vercel 或对应部署平台的环境变量中。

## URL

浏览器与构建阶段共用的纯 URL 工具位于 `src/utils/url.ts`，分页 URL 展示算法位于 `src/utils/pagination.ts`。分类与标签规范化由 `src/services/core/taxonomy.ts` 负责，文章 canonical URL 由 `src/services/core/post-routes.ts` 负责；包含 Astro Content 或 Node API 的图片解析只允许放在 `src/services/core/content-assets.ts`。

新增代码不要硬编码分类、标签、文章 URL，也不要让客户端模块导入构建期工具。分类链接应使用分类页 `/category/{slug}/`；Tag 链接应带所属分类上下文，例如 `/category/{slug}/?tag={tagSlug}`。文章详情页使用 `/posts/{slug}/`，可选 `alias` 会生成 `/posts/{alias}/`。
