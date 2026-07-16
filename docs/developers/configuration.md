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
| `src/config/site-notice.ts` | 网站级通知 `siteNoticeConfig`。 |
| `src/config/wallpaper.ts` | 全屏壁纸 `fullscreenWallpaperConfig`。 |
| `src/services/layout/presets.ts` | 页面布局 `PageLayoutPolicy` 预设。 |
| `src/config/music.ts` | 音乐播放器 `musicPlayerConfig`。 |
| `src/config/effects.ts` | 站点特效 `sakuraConfig`。 |
| `src/config/comments.ts` | 评论系统 `commentConfig`。 |
| `src/config/analytics.ts` | 统计脚本、GTM、Clarity、Umami 配置。 |
| `src/config/category-slugs.ts` | 分类 slug 映射。 |

## 重要配置组

| 配置 | 说明 |
| --- | --- |
| `siteConfig` | 站点信息、语言、特色页面、横幅、主题、文章列表、字体等。 |
| `fullscreenWallpaperConfig` | 叠加全屏壁纸资源与效果行为。 |
| `navBarConfig` | 顶部导航链接。 |
| `profileConfig` | 首页作者资料模块内容。 |
| `licenseConfig` | 默认内容协议展示。 |
| `commentConfig` | 评论系统配置。 |
| `pageLayoutPolicies` | 页面 Shell Strategy 与允许的桌面布局集合；当前仅允许 `content-right`。 |
| `siteNoticeConfig` | 主内容 Shell 顶部的网站级通知、状态、操作与可见范围。 |
| `expressiveCodeConfig` | 代码块渲染行为。 |

## 页面模块与布局

项目不再提供通用 Widget registry、placement preset 或跨端点 resolver。业务模块由页面显式拥有：首页通过 `MainGridLayout` 的 `support` slot 传入一份 Profile；归档页在主内容流中组合 Calendar、Categories 与 Tags；站点统计由 Footer service 和 Footer component 持有；文章 TOC 属于 post detail feature。

`shellStrategy` 选择页面级响应式几何：`container-content` 使用 Page Shell Container Query，`viewport-legacy` 保留尚未迁移页面的 viewport Grid。`pageLayoutPolicies` 只声明 Shell Strategy 和允许的 Desktop Page Layout Preference，不再描述业务模块 inventory。新增模块时应在所属页面或 layout 中显式组合，不要向配置层添加通用 placement 描述。

## 网站通知

`SiteNoticeBar` 以站点级浮层固定在 Navbar 下方，限制为阅读宽度，不参与页面流布局。

- `enable`：启用或关闭网站通知。
- `autoRotate`：多条通知时是否自动轮播；用户 Hover 或将焦点移入通知区域时暂停。
- `rotationIntervalMs`：自动轮播间隔，运行时最低为 3000ms；系统启用 `prefers-reduced-motion` 时不自动轮播。
- `notices`：通知条目数组，按配置顺序显示并支持手动上下切换。
- `notices[].id`：通知的稳定版本 ID；用户已读状态以 `site-notice:read:<id>` 保存，关闭状态以 `site-notice:dismissed:<id>` 保存。发布需要重新展示的新通知时应修改 ID。
- `title`、`content`、`icon`：通知标题、纯文本正文和可选图标。
- `status`：支持 `info`、`success`、`warning`、`danger`，视觉由 Design Semantic status token 提供。
- `dismissible`：是否允许用户关闭。
- `action`：可选操作链接，包含 `label`、`href` 和 `external`；配置存在即显示，不需要额外 enable 字段。
- `visibility.scope`：`all` 表示全部页面，`home` 仅首页，`content` 表示非首页。
- `visibility.include`、`visibility.exclude`：可进一步按路径控制。路径默认精确匹配，以 `*` 结尾时匹配该路径及其子路径，例如 `/posts/*`。

网站通知内容保持纯文本。较长信息应通过 `action` 链接到详情页，不在 Notice Bar 内嵌 Markdown 或 HTML。

Navbar 右侧的 Activity Center 是全站信息入口。Badge 只统计未读网站通知，文章页上的外圈只显示当前阅读进度；打开 Panel 后可查看通知历史以及文章进度、当前章节、剩余阅读时间和本地续读位置。`info` / `success` 通知在右上角短暂预览后退场，仍保留在 Activity Center；`warning` / `danger` 预览不会自动消失。Activity Center 不承载 Theme、Settings 等操作型工具。

## SettingsPanel 相关配置

统一设置面板从 Navbar 迁入右下角 Floating Tools。Tools 收起时保留主入口与按滚动状态出现的 Back to Top，展开后提供 Theme、Music、Floating TOC（当前页面存在标题时）和 Settings 入口。Settings 打开后 Tools Rail 自动收起；桌面端面板根据入口所在的 viewport 侧动态对齐，并把完整高度限制在 Safe Area 内，移动端使用底部 Sheet。设置面板继续使用现有配置作为默认值来源，并通过 `switchable` 字段决定是否展示对应配置项。

- `siteConfig.postListLayout.enable`：控制文章列表布局切换入口是否启用，`allowSwitch` 仍表示是否允许用户切换。
- `postListLayout` 默认使用 `grid`，偏好会写入既有的 `localStorage.postListLayout`，已保存的 List 偏好不会被重置。它只控制 Post List View，不再隐式改写页面级 Desktop Layout Preference。
- 首页、分类页和文章详情页使用 Container Query：Banner 始终铺满 viewport，Navbar 与 Main Shell 共享 `1352px` 外部最大宽度。首页在 `1200px` 以上使用三列 Feed + Profile support，在 `880px–1199px` 使用双列 Feed + Profile support，低于 `880px` 时把同一个 Profile DOM 放到 Main 前方；Feed 低于 `608px` 后退为单列。分类页与文章页不提供 support slot，内容区在 `1200px` 以下最大 `704px`、达到 `1200px` 后最大 `1064px`。断点针对实际容器，不直接对应 viewport 宽度。
- `siteConfig.pageScaling` 仅保留给尚未迁移的 `viewport-legacy` 页面；首页、分类页和文章详情页会主动清除根字号缩放，不能依赖该配置改变 Card、Sidebar 或 Typography 尺寸。
- `desktopLayoutPreference`：保留旧存储兼容，但当前全部页面 policy 只允许 `content-right`，设置面板不会显示无效的 `three-column` 选择；该值仍不会从 `postListLayout` 推导。
- `siteConfig.wallpaperMode.defaultMode`：支持 `banner`、`fullscreen`、`overlay`、`none`。`fullscreen` 表示全屏高度的 banner 模式；`overlay` 才会显示全屏壁纸图层，并通过 CSS 变量控制壁纸和卡片透明效果。
- Banner、Navbar 与尚未迁移页面仍使用 viewport 断点：`0–479px` 小屏手机、`480–767px` 大屏手机、`768–1279px` 平板、`>=1280px` 桌面。首页、分类页和文章详情页的内容布局不使用这些断点，而以 `page-shell` 与 `post-feed` Container Query 为准。
- 普通 Banner 使用 `--banner-block-size` 同步控制横幅高度与正文起始位置；低高度横屏约为 `60vh` 以优先正文。首页 Fullscreen Banner 始终为 `100dvh`，非首页移动端隐藏 Banner。
- `siteConfig.banner.carousel.switchable`：控制横幅轮播设置入口。当前入口只保留 UI 状态预览，不会写入运行时配置。
- `siteConfig.banner.waves.switchable`：控制横幅 waves 设置入口。用户设置会写入 `localStorage.wavesEnabled` 并实时显示/隐藏 waves。
- `siteConfig.banner.homeText.switchable`：控制首页 banner 文案设置入口。用户设置会写入 `localStorage.bannerTitleEnabled` 并实时显示/隐藏首页文案。
- `fullscreenWallpaperConfig.enable` 和 `fullscreenWallpaperConfig.switchable`：控制叠加全屏壁纸资源与壁纸模式切换入口。
- `fullscreenWallpaperConfig.overlay`：提供叠加壁纸的默认 `opacity`、`blur`、`cardOpacity`，以及各滑块的 `switchable` 配置。用户设置会分别写入 `localStorage.overlayOpacity`、`localStorage.overlayBlur`、`localStorage.overlayCardOpacity`。
- `fullscreenWallpaperConfig.fullscreen.switchable`：预留全屏横幅相关设置入口；当前全屏横幅不显示 `[data-fullscreen-wallpaper]` 图层。
- `sakuraConfig.switchable`：控制樱花特效设置入口。用户设置会写入 `localStorage.sakuraEnabled` 并通过 `sakura-manager` 启停运行时。
- `pioConfig.enable`：决定是否提供看板娘功能；`hiddenOnMobile` 继续作为设备限制。允许显示时，Floating Tools 提供访客级开关，偏好复用 Pio 的 `localStorage.posterGirl`，因此 Tools 与 Pio 自带关闭/恢复入口保持同步。隐藏只改变运行时可见性，不重复加载 Live2D 脚本。
- Music Player 仍拥有播放与展开状态。默认以右下角隐藏控件出现：请求 Playlist 时显示旋转的 Theme-aware Music Icon fallback，成功后切换为第一首封面，列表或封面不可用时保留静态 fallback。未开始播放时不显示 Mini Player，Floating Tools 的 Music 入口或隐藏控件负责呼出控制面板；首次播放后 Mini Player 持续可用，即使暂停也不会消失。展开面板采用紧凑的单一 Surface，Playlist 在同一 Surface 内向上展开并与播放控制区贴合；左侧播放顺序按钮在 Sequential 与 Shuffle 间切换，并通过图标、颜色和 `aria-pressed` 明确反馈当前状态。播放器通过 Feature-local Event Contract 发布必要的 UI 状态，Floating Tools 只更新入口提示、状态动画和自动收起，不直接操作 Audio。Floating Tools 与 Music Player 位于同一个固定 Flex Layer，浏览器在同一次布局计算中维持安全间距；Playlist 展开时不再依赖独立的位置 easing 或异步测量追赶。Floating Tools 的总入口、Display Settings、TOC 与 Pio 开关使用对应场景的本地 Semantic Icon。
- Music Player 的可见状态遵循 `Hidden fallback → Expanded Panel → Mini Player` 状态机。点击面板外区域、收起按钮或再次点击 Floating Tools Music 入口都会回到合法默认态：播放前返回 Hidden fallback，首次播放后返回 Mini Player，右下角不会出现无 Music UI 的空状态。Hidden 与 Mini 由同一 Shared Container 承载，在固定的右下锚点同步插值宽高与圆角；Mini 内容始终保持最终尺寸，由容器二维裁切显露并配合 Fade，避免 `auto height` 跳变、内容重排或先纵后横的分段感。所有状态过渡均在 `prefers-reduced-motion` 下取消时长。
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
