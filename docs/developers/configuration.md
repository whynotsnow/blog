# 配置说明

项目主要配置位于 `src/config.ts`，类型定义位于 `src/types/config.ts`。

## 配置归属

本仓库是个人定制版本，`src/config.ts` 中的值是站点私有配置，不是上游 Mizuki 的通用默认值。

修改配置时：

- 注释应靠近对应配置项。
- 配置结构变化需要同步更新 `src/types/config.ts`。
- 影响使用、内容或部署的配置变化需要更新文档。
- 不要把密钥、Token、Cookie 写入配置文件。

## 重要配置组

| 配置 | 说明 |
| --- | --- |
| `siteConfig` | 站点信息、语言、特色页面、横幅、主题、文章列表、字体等。 |
| `fullscreenWallpaperConfig` | 全屏壁纸行为。 |
| `navbarConfig` | 顶部导航链接。 |
| `profileConfig` | 个人资料组件内容。 |
| `licenseConfig` | 默认内容协议展示。 |
| `commentConfig` | 评论系统配置。 |
| `sidebarLayoutConfig` | 侧边栏位置和布局模式。 |
| `permalinkConfig` | URL 生成和自定义 permalink。 |
| `expressiveCodeConfig` | 代码块渲染行为。 |

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

## URL 和 Permalink

URL 相关工具位于：

- `src/utils/url-utils.ts`
- `src/utils/permalink-utils.ts`
- `src/utils/client-utils.ts`

新增代码不要硬编码分类、标签、文章 URL。使用已有工具可以保证 alias 和 permalink 配置继续生效。

