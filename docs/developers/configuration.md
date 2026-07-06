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
| `src/config/sidebar.ts` | 侧边栏布局 `sidebarLayoutConfig`。 |
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
| `fullscreenWallpaperConfig` | 全屏壁纸行为。 |
| `navBarConfig` | 顶部导航链接。 |
| `profileConfig` | 个人资料组件内容。 |
| `licenseConfig` | 默认内容协议展示。 |
| `commentConfig` | 评论系统配置。 |
| `sidebarLayoutConfig` | 侧边栏位置和布局模式。 |
| `expressiveCodeConfig` | 代码块渲染行为。 |

## SettingsPanel 相关配置

统一设置面板使用现有配置作为默认值来源，并通过 `switchable` 字段决定是否展示对应入口。

- `siteConfig.postListLayout.enable`：控制文章列表布局切换入口是否启用，`allowSwitch` 仍表示是否允许用户切换。
- `siteConfig.wallpaperMode.defaultMode`：支持 `banner`、`fullscreen`、`overlay`、`none`。当前 `overlay` 是为后续真实能力预留的壁纸模式。
- `siteConfig.banner.carousel.switchable`：控制横幅轮播设置入口。
- `siteConfig.banner.waves.switchable`：控制横幅 waves 设置入口。
- `siteConfig.banner.homeText.switchable`：控制首页 banner 文案设置入口。
- `fullscreenWallpaperConfig.enable` 和 `fullscreenWallpaperConfig.switchable`：控制全屏/叠加壁纸资源与切换入口。
- `fullscreenWallpaperConfig.overlay`：提供叠加壁纸的默认 `opacity`、`blur`、`cardOpacity`，以及各滑块的 `switchable` 配置。
- `fullscreenWallpaperConfig.fullscreen.switchable`：控制全屏壁纸透明度、模糊度滑块入口。
- `sakuraConfig.switchable`：控制樱花特效设置入口。

在设置面板分阶段迁移期间，未接入真实运行时的设置只使用这些配置作为默认展示值，不应提前写入 `localStorage` 或触发页面副作用。

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
