# Mizuki for Coding Agents

> 本仓库是 `whynotsnow` 基于 [Mizuki 8.2](https://github.com/LyraVoid/Mizuki/tree/8.2) 独立优化、更新和维护的个人博客工程。当前迭代已经不再只是主题配置或样式调整，而是接近一次 `Mizuki 9.0.0` 级别的工程化升级：内容管线、页面架构、Design System、runtime modules、Coding Agent 支持和项目治理都已经形成独立维护方向。

[![Node.js >= 22](https://img.shields.io/badge/node.js-%3E%3D22-brightgreen)](https://nodejs.org/)
[![pnpm 10](https://img.shields.io/badge/pnpm-10-blue)](https://pnpm.io/)
[![Astro 5](https://img.shields.io/badge/Astro-5-orange)](https://astro.build/)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-ff3e00)](https://svelte.dev/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg?logo=apache)](https://opensource.org/licenses/Apache-2.0)

## 项目定位

`Mizuki for Coding Agents` 是一个自用优先的 Astro + Svelte 静态博客和 content engineering system。它保留了 Mizuki 的审美基础、Markdown 体验和 static site 优势，但当前维护重点已经转向：

- 稳定的 content pipeline、Content Store 和 build-time index。
- 面向分类、标签、归档、推荐和文章详情的 service layer View Model。
- 更明确的页面 Shell、Banner、右栏支持区和移动端布局策略。
- 独立的 Design System、Semantic token 和页面级 visual contract。
- Activity Center、Floating Tools、Music Player、Live2D Companion 等 browser runtime modules。
- 内容分离、字体子集、Pagefind、Feed、OG 图片和部署自动化。
- Agent Workspace Spec 与 adjacent sidecar planning，用于长期 AI-assisted maintenance。

这个仓库更适合作为个人站点工程继续演进，不建议直接当作上游 Mizuki 的通用主题模板使用。

## 面向 Coding Agent 的项目支持

这个项目已经把 Coding Agent 协作作为一等维护场景处理。它不是只提供一份 `AGENTS.md`，而是把 project structure、validation strategy、known failures、execution boundary 和 planning records 都纳入仓库约定，让后续 AI-assisted maintenance 可以复用已经确认过的项目知识。

当前支持包括：

| 能力 | 说明 |
| --- | --- |
| Agent 入口 | 根目录 [AGENTS.md](./AGENTS.md) 记录必须遵守的仓库规则、tool boundary、documentation routing 和 validation requirements。 |
| Agent Docs | [agent-docs](https://github.com/whynotsnow/agent-skills/tree/main/skills/agent-docs) 维护真实开发项目的 README、AGENTS、`docs/developers/` 与 `docs/agents/` 文档契约。 |
| Agent Workspace | [agent-workspace](https://github.com/whynotsnow/agent-skills/tree/main/skills/agent-workspace) 操作 Agent Workspace Spec 项目，明确 manifest、local tooling、public knowledge 与 local state 的边界。 |
| Agent Project Sidecar | [agent-project-sidecar](https://github.com/whynotsnow/agent-skills/tree/main/skills/agent-project-sidecar) 维护相邻 planning sidecar，把 plans、decisions、runs、validation notes 和 handoffs 从产品源码中分离。 |
| 项目内验证 | `node .agent-workspace/tools/agent-workspace.mjs validate` 用于确认公开 Agent Workspace 文件、disclosure boundary 和 local profile 关系。 |
| 影响面测试 | `pnpm test:plan` 和 `pnpm test:affected` 根据改动路径选择最小充分验证，避免每次文档或局部改动都跑全量回归。 |
| 失败记忆 | `docs/agents/runtime-playbook.md`、`failure-index.md` 和 `memory.json` 记录可复用的 troubleshooting patterns，减少重复调试。 |

这三个 skill 的公开基线维护在 [whynotsnow/agent-skills](https://github.com/whynotsnow/agent-skills)。项目内会通过系列文章持续说明它们如何配合使用，当前入口见 [Coding Agent 三件套总览](./src/content/posts/coding-agent-skills.md)。

对 Coding Agent 来说，这个仓库的核心约束是：先读入口规则，再按 task scope 读取最小必要文档；实现时尊重 service layer、Design layer 和 runtime module boundary；验证时按 impact-based testing 选择命令；产出时明确说明实际跑过的 checks 和未覆盖的 residual risks。

## 与上游 Mizuki 的关系

本项目基于 [Mizuki 8.2](https://github.com/LyraVoid/Mizuki/tree/8.2) 继续独立优化与维护。当前仓库地址是 [whynotsnow/blog](https://github.com/whynotsnow/blog)，自有迭代已经接近 `Mizuki 9.0.0` 级别：不再以兼容上游模板为第一目标，而是优先服务当前个人站点、content engineering、Coding Agent collaboration 和长期维护治理。

## 主要重构方向

这些变化不是零散功能叠加，而是对原 Mizuki 项目维护模型的一次长期重构。重构目标是让内容、页面、配置、视觉和浏览器运行时各自有清晰 owner，降低后续同步上游或继续扩展时的隐式耦合。

| 方向 | 从上游模板到当前项目的变化 |
| --- | --- |
| 内容管线重构 | 从页面直接消费内容，转向 `src/services/core` 统一构建 Content Store、RouteIndex、Taxonomy、PostIndexEntry 和详情页渲染队列。 |
| 路由与服务分层 | 从厚页面和混合逻辑，转向薄 `src/pages`、页面级 `src/services`、展示型组件和模块本地 runtime。 |
| 分类发现体系 | 从基础分类/标签跳转，转向分类 Hub、最近更新、推荐阅读、具体分类分页、Tag 筛选和按需 JSON 索引。 |
| 首页信息架构 | 从传统文章分页列表，转向最近更新、推荐阅读和分类入口组合，首页 Profile 由页面显式拥有。 |
| 页面 Shell 重构 | 从 Sidebar/Widget placement 模式，转向 Banner、Navbar、Main Shell、support slot 和 Container Query 驱动的布局策略。 |
| Design System 重构 | 从分散样式变量和页面局部样式，转向 `src/design` 管理 token、Theme、Foundation、Pattern 和 Legacy compatibility。 |
| 文章详情重构 | 从路由页承载复杂展示，转向 `PostDetailPage`、Post support、共享 TOC 契约、Markdown 统一样式入口和详情 service。 |
| 浏览器运行时重构 | 从散落脚本和通用工具，转向 Activity Center、Floating Tools、Music Player、Live2D Companion、Shell Panels 等模块独立拥有状态。 |
| 配置体系重构 | 从单一 `src/config.ts` 堆叠配置，转向 `src/config/` 分模块维护，并保留 `src/config.ts` 作为兼容导出入口。 |
| 构建与内容分离 | 从本地内容直接构建，扩展到外部内容仓库固定 commit、开发 overlay、字体子集、Pagefind、Feed 和 OG 图片生成。 |
| 工程规范严格化 | 从经验式维护，转向 impact-based testing、pre-commit gate、Design check、Markdown lint、Agent Workspace validation 和 sidecar execution gate。 |
| 文档与 Agent 维护 | 从 README 记录改动，转向 `docs/developers/`、`docs/agents/`、Agent Workspace Spec 和 sidecar 分工维护。 |

如果后续需要吸收 [Mizuki](https://github.com/matsuzaka-yuki/Mizuki) 的新能力，应先按当前项目的重构边界重新迁移，不要直接恢复原模板的旧目录、Widget placement 或配置模式。

## 技术栈

| 类别 | 当前选择 |
| --- | --- |
| 框架 | Astro 5 |
| 交互组件 | Svelte 5 |
| 样式 | Tailwind CSS 4、Stylus、项目内 Design System |
| 内容 | Astro Content Collection、Markdown、构建期派生索引 |
| 搜索 | Pagefind |
| 代码块 | Expressive Code |
| 页面切换 | Swup |
| 包管理 | pnpm 10，通过 Corepack 使用 |
| 运行环境 | Node.js 22 或更新版本 |

## 快速开始

### 环境要求

- Node.js 22 或更新版本。
- pnpm 10，建议通过 Corepack 使用 `package.json` 声明的版本。
- 本仓库提供 `.nvmrc`，安装了 nvm 的环境可以先运行 `nvm use`。

### 安装依赖

```bash
git clone https://github.com/whynotsnow/blog.git
cd blog
nvm use
corepack enable
corepack install
corepack pnpm install
```

如果在 Codex 或临时 shell 中工作，可以先加载项目环境：

```bash
source .codex/env-setup.sh
```

### 本地开发

```bash
pnpm dev
```

开发服务默认监听 `http://localhost:4321`。`dev` 会先准备内容与字体子集，再启动 Astro Dev Server。

只查看生产内容时使用：

```bash
pnpm dev:prod-content
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 准备内容、生成开发 overlay、准备字体并启动开发服务。 |
| `pnpm dev:prod-content` | 使用生产内容模式启动开发服务。 |
| `pnpm build` | 生产构建，包含内容准备、番剧数据更新、字体子集、Astro build 和 Pagefind 索引。 |
| `pnpm build:astro` | 只运行 Astro 构建阶段，不生成 Pagefind 索引。 |
| `pnpm check` | 运行 Astro check，并把 hint 级诊断视为失败。 |
| `pnpm type-check` | 运行 TypeScript 类型检查。 |
| `pnpm type-check:svelte` | 运行 Svelte 组件诊断。 |
| `pnpm test:plan` | 按影响面打印本地验证计划。 |
| `pnpm test:affected` | 执行本地影响面选择的验证。 |
| `pnpm test:fast` | 运行 Unit 和 Integration 测试。 |
| `pnpm test:smoke` | 运行关键路由 Playwright 冒烟测试。 |
| `pnpm verify:full` | 运行完整静态、测试、浏览器和构建门禁。 |
| `pnpm new-post -- <filename>` | 创建文章模板。 |
| `pnpm content:prepare` | 准备配置锁定的外部内容版本。 |
| `pnpm font:prepare` | 根据内容和 UI 文本生成字体子集。 |
| `pnpm plan:status` | 查看相邻 `../blog.plan` sidecar 状态。 |

更多命令和失败处理见 [开发工作流](./docs/developers/development.md)。

## 内容与配置

文章默认位于 `src/content/posts`，特殊页面内容位于 `src/content/spec`。项目也支持外部内容仓库：构建时通过 `ENABLE_CONTENT_SYNC`、`CONTENT_REPO_URL` 和 `CONTENT_REPO_COMMIT_SHA` 固定读取指定提交，避免生产构建跟随远端 HEAD 漂移。

主要配置入口已经拆分到 `src/config/`：

| 文件 | 说明 |
| --- | --- |
| `src/config/site.ts` | 站点核心信息、语言、Banner、主题和特色页面。 |
| `src/config/navbar.ts` | 顶部导航派生规则。 |
| `src/config/profile.ts` | 首页个人资料模块。 |
| `src/config/wallpaper.ts` | 壁纸模式与资源。 |
| `src/config/comments.ts` | 评论系统配置。 |
| `src/config/analytics.ts` | GTM、Clarity、Umami 等统计配置。 |
| `src/config/category-slugs.ts` | 分类规范名称、slug 和兼容 alias。 |

`src/config.ts` 只是兼容导出入口。新增或调整配置时优先修改 `src/config/` 下的具体模块，详细规则见 [配置说明](./docs/developers/configuration.md)。

## 主要能力

### 内容浏览

- 首页展示最近更新、推荐阅读和分类入口。
- `/category/` 是分类 Hub，负责全部分类、热门 Tag 和发现入口。
- `/category/recent/` 和 `/category/recommended/` 分别展示最近更新与推荐阅读。
- `/category/{slug}/` 支持具体分类分页、Tag 筛选和按需加载紧凑索引。
- `/archive/` 聚焦时间维度浏览，包含 Calendar 与 Timeline。
- RSS、Atom 和 Open Graph 图片由独立 service 生成。

### 文章体验

- Markdown、扩展内容和 Expressive Code 样式由统一入口管理。
- 支持 KaTeX、代码高亮、代码复制、图片展示、评论和阅读元数据。
- 文章详情页使用独立 Post support 区承载桌面 TOC 与全站发现入口。
- 加密文章与普通文章复用 Markdown 样式入口，解密后再生成 runtime TOC。

### 页面与交互

- Navbar、Banner、Main Shell 和页面切换动画由 Shell runtime 统一协调。
- Activity Center 展示站点通知和文章阅读状态。
- Floating Tools 统一承载 Theme、Music、Settings、Floating TOC、Back to Top 和 Live2D Companion 入口。
- Music Player、Live2D Companion、Twikoo 评论和通知状态均由所属模块维护浏览器状态。

### 开发与维护

- `docs/developers/` 保存中文开发、配置、部署、测试和维护文档。
- `docs/agents/` 保存英文 Agent 执行规则、项目地图、运行时 playbook 和持久记忆。
- `.agent-workspace/manifest.json` 与项目本地工具提供 Agent Workspace Spec 合规入口。
- 相邻 `../blog.plan` sidecar 用于规划、决策、运行记录和 handoff，产品源码仍保留在本仓库。

## 生产环境变量

常用环境变量如下，完整说明见 [配置说明](./docs/developers/configuration.md) 和 [部署指南](./docs/developers/deployment.md)。

| 变量 | 用途 |
| --- | --- |
| `ENABLE_CONTENT_SYNC` | 是否启用外部内容仓库准备。 |
| `CONTENT_REPO_URL` | 外部内容仓库地址。 |
| `CONTENT_REPO_COMMIT_SHA` | 要构建的完整 40 位内容 commit SHA。 |
| `CONTENT_DIR` | 外部内容 staging、release、current 和本地备份目录。 |
| `GTM_ID` | Google Tag Manager 容器 ID。 |
| `CLARITY_PROJECT_ID` | Microsoft Clarity 项目 ID。 |
| `UMAMI_API_KEY` | Umami 统计 API key。 |
| `MONGODB_URI` | Twikoo MongoDB 连接字符串。 |
| `BILI_SESSDATA` | 可选 Bilibili 数据源凭证。 |

本地值放在 `.env`，生产值放在部署平台的环境变量或 secret 管理中。不要把密钥、Token、Cookie 或私有 URL 提交进仓库。

## 文档入口

| 入口 | 读者 | 内容 |
| --- | --- | --- |
| [docs/README.md](./docs/README.md) | 所有人 | 项目文档总索引。 |
| [docs/developers/README.md](./docs/developers/README.md) | 开发者、内容维护者、部署维护者 | 中文开发文档索引。 |
| [docs/developers/architecture.md](./docs/developers/architecture.md) | 开发者 | 架构、内容管线、服务层和扩展原则。 |
| [docs/developers/content-guide.md](./docs/developers/content-guide.md) | 内容维护者 | 文章 frontmatter、分类标签、草稿和资源规则。 |
| [docs/developers/deployment.md](./docs/developers/deployment.md) | 部署维护者 | 静态平台部署、内容分离和 CI/CD。 |
| [docs/agents/README.md](./docs/agents/README.md) | AI coding agent | Agent 文档索引。 |
| [AGENTS.md](./AGENTS.md) | AI coding agent | 修改代码前必须遵守的仓库规则。 |

## 维护注意事项

- 这个仓库是个人定制项目，`src/config/` 中的值不是上游通用默认配置。
- 普通文章集合、分类、标签、归档和文章详情数据应通过 `getContentStore()` 与服务层获取，不要在 UI 组件中绕过内容管线。
- 新增页面逻辑先放入 `src/services`，再由 `src/pages` 组合 layout 和组件。
- 业务运行时状态应放在所属 `src/components/modules/*`，不要回流到通用工具或服务层。
- UI 变更优先复用 `src/design` 中的 Semantic token 与 `ds-` Pattern。
- 文档变更应更新最接近的 owning document，不要把详细维护规则堆回根 README。
- 提交前根据影响面运行最小充分验证；需要完整验证时使用 `pnpm verify:full`。

## 许可证与致谢

本仓库保留上游 Mizuki 的开源许可文件，并继续感谢 Mizuki 项目的基础设计与实现。当前仓库中的个人内容、配置、图片和站点数据不应被视为可复用模板默认值。
