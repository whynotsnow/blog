# 分类管理

本文说明当前项目中分类（Category）和标签（Tag）的新增、维护、展示资产、验证方式，以及未来从 Astro 构建期内容迁移到数据库或外部分类服务时应保留的边界。

## 当前模型

分类不是单独的 Markdown 集合。当前分类数据由文章 frontmatter、规范分类配置和分类展示资产共同生成：

| 数据来源 | 文件 | 职责 |
| --- | --- | --- |
| 文章分类 | `src/content/posts/**/*.md` | 每篇文章通过 `category` 字段声明所属分类。 |
| 规范分类 | `src/config/category-slugs.ts` | 定义稳定 `name`、`slug` 和兼容输入 `aliases`。 |
| 分类展示资产 | `src/data/category-assets.ts` | 定义分类 Hub 卡片使用的描述和封面图。 |
| 分类归一化 | `src/services/core/taxonomy.ts` | 将 frontmatter 输入转换为规范分类或自动 slug。 |
| 分类 Hub 数据 | `src/services/category-hub.ts` | 构建 `/category/`、`/category/recent/` 和 `/category/recommended/` 的 View Model。 |
| 具体分类页数据 | `src/services/category-page.ts` | 构建 `/category/{slug}/`、分页和 Tag JSON 索引。 |

普通 UI 组件不要直接读取 Astro Content Collection。分类、标签、文章链接和卡片数据应通过 `src/services/core`、`src/services/category-hub.ts` 或 `src/services/category-page.ts` 进入页面。

## 路由与页面

| 路由 | 说明 |
| --- | --- |
| `/category/` | 分类 Hub 的全部分类视图，展示分类卡片、热门 Tag、每类最近文章和右侧 support。 |
| `/category/recent/` | 分类 Hub 的最近更新视图，按全站最近活动时间展示文章，并复用分类 support。 |
| `/category/recommended/` | 分类 Hub 的推荐视图，按全站推荐分展示文章，并复用分类 support。 |
| `/category/{slug}/` | 具体分类第一页，主内容区支持分类和 Tag 筛选。 |
| `/category/{slug}/page/{page}/` | 具体分类的第 2 页及后续分页；不会生成 `/page/1/`。 |
| `/api/categories/{slug}.json/` | 每个具体分类一份紧凑 Tag 索引，浏览器仅在需要 Tag 模式时加载或低优先级预取。 |

分类 Hub 和具体分类页都通过 `MainGridLayout` 的 `support` slot 使用右栏。全站发现入口由 `src/services/support.ts` 统一生成，并通过 `GlobalDiscoveryCard.astro` 展示预览内容：全部分类 card 展示分类项，最近更新与推荐阅读 card 展示文章项。Hub 页会隐藏当前视图对应的发现 card，只展示其他发现入口和热门标签；具体分类页展示全部全站发现入口，并且这些 card 使用全站文章池。当前分类文章、Tag 筛选和分页留在主内容区，右栏不再重复当前分类最近更新、热门标签或分类导航。

## 新增分类

### 1. 添加规范分类

在 `src/config/category-slugs.ts` 中新增定义：

```ts
{
  name: "阅读",
  slug: "reading",
  aliases: ["Books", "Read"],
}
```

字段说明：

- `name`：展示名称，也是新文章 frontmatter 推荐使用的分类名。
- `slug`：稳定 URL 段，只使用小写 ASCII、数字和短横线，避免后续迁移时需要 redirect。
- `aliases`：兼容旧内容输入。alias 只用于归一化，不会生成独立分类 URL。

规则：

- 不要复用已有 slug。
- 不要让两个分类共享同一个 `name` 或 alias 的大小写无关输入。
- 新文章应直接使用规范 `name`，不要依赖 alias 写作。

### 2. 给文章设置分类

在文章 frontmatter 中设置单一分类：

```yaml
---
title: 示例文章
published: 2026-08-03
category: 阅读
tags: [书单, 笔记]
---
```

每篇文章只属于一个分类。标签可以多个，但应保持命名稳定，避免大小写差异、同义词和中英文混写造成导航碎片。

### 3. 添加分类展示资产

在 `src/data/category-assets.ts` 中为分类 slug 添加描述和图片：

```ts
reading: {
  description: "记录阅读笔记、书单整理和长期主题索引。",
  image: {
    src: "/images/category/reading.webp",
    alt: "阅读 category cover",
    position: "center",
  },
},
```

当前 `image.src` 使用通用字符串契约，支持：

- `public` 下的绝对路径，例如 `/images/category/reading.webp`。
- 远程 URL，例如 `https://example.com/cover.webp`。
- 以后接入数据库时返回的图片 URL。

分类图片不直接绑定 Astro `ImageMetadata`，是为了避免未来数据库迁移时 UI 合同被 Astro 本地资产类型锁死。

### 4. 放置图片资源

推荐路径：

```text
public/images/category/{slug}.webp
```

资源建议：

- 使用 WebP 或 AVIF。
- 保持横向构图，适合卡片顶部 `16:9` 近似裁切。
- 文件名使用分类 slug，便于迁移脚本和数据库记录复用。
- `alt` 应描述分类封面语义，不要写成无意义的文件名。

没有配置图片的分类会显示语义占位封面，页面仍可正常构建。

## 管理已有分类

### 重命名展示名称

如果只是修改展示名称，同时希望 URL 不变：

1. 修改 `src/config/category-slugs.ts` 中的 `name`，保留原 `slug`。
2. 将旧名称加入 `aliases`。
3. 批量把文章 frontmatter 中的旧名称改为新规范名称。
4. 检查 `src/data/category-assets.ts` 是否需要同步更新描述或 `alt`。

这样旧内容输入仍会归一到同一个 slug，已存在的 `/category/{slug}/` URL 不会变化。

### 修改 slug

修改 slug 会改变 URL，属于高风险操作：

- `/category/{old}/` 会消失。
- `/api/categories/{old}.json/` 会消失。
- 旧链接、搜索索引、外部引用和用户书签可能失效。

确实需要修改时：

1. 在 `src/config/category-slugs.ts` 中更新 `slug`。
2. 更新 `src/data/category-assets.ts` 的 key 和图片路径。
3. 更新所有手写链接、导航配置和文档。
4. 评估是否需要在部署层提供 redirect。
5. 运行 `pnpm build:astro` 并检查生成的分类路由。

当前项目没有分类 redirect registry。不要通过生成第二个分类来兼容旧 slug；这会让分类 Hub、Tag 索引和文章卡片链接出现重复入口。

### 合并分类

合并分类时保留目标分类 slug：

1. 选定目标分类，例如 `tech`。
2. 把被合并分类的旧展示名加入目标分类 `aliases`。
3. 批量修改文章 frontmatter 的 `category` 为目标规范名称。
4. 删除被合并分类在 `CATEGORY_DEFINITIONS` 和 `categoryAssets` 中的独立配置。
5. 运行验证，确认 `/category/{old}/` 不再生成，目标分类文章数量符合预期。

### 删除分类

分类没有独立数据表，只有当没有文章归属到该分类时，它才不会出现在内容存储和分类路由中。删除步骤：

1. 将文章迁移到其他分类，或删除对应文章。
2. 删除 `src/config/category-slugs.ts` 中不再需要的定义。
3. 删除 `src/data/category-assets.ts` 中不再需要的展示资产。
4. 如资源文件不再复用，删除 `public/images/category/{slug}.webp`。

## 标签管理

Tag 不在 `src/config/category-slugs.ts` 中集中声明，而是从文章 frontmatter 派生。

规则：

- Tag slug 由 `src/services/core/taxonomy.ts` 的 `generateTagSlug()` 生成。
- Tag 链接总是带所属分类上下文，例如 `/category/tech/?tag=astro`。
- 同名 Tag 在不同分类下可以存在，但用户会在对应分类页筛选。
- 修改 Tag 名称会改变筛选 URL，应像修改分类 slug 一样谨慎。

需要治理 Tag 时，优先批量修改文章 frontmatter，不要在 UI 层做别名映射。

## 分类卡片展示

分类 Hub 卡片由 `src/components/category/CategoryHubPage.astro` 渲染，数据来自 `CategoryHubCard`：

- `name`、`slug`、`url`：分类身份和入口。
- `count`、`tagCount`、`updated`：文章数、标签数和最近活动时间。
- `description`、`image`：来自 `src/data/category-assets.ts` 的展示资产。
- `tags`：分类热门标签。
- `recentPosts`：分类最近更新文章。

维护约束：

- 不要在组件中重新计算分类、标签或文章 URL。
- 不要把 Astro Content Collection 查询放进组件。
- 不要修改 `.category-hub-grid` 的列数、断点或最大宽度来解决卡片内部展示问题；卡片内部优化应限定在 `category-hub-card__*` 槽位。
- 分类卡片视觉应尽量和首页文章 Grid Card 的封面、标题、meta、摘要和 Tag 槽位语言保持一致。

## 验证清单

新增或调整分类后，按影响面选择验证：

```bash
pnpm test:plan
pnpm test:affected
```

常见补充命令：

```bash
pnpm check
pnpm build:astro
```

当修改了分类卡片样式、Hub 页面结构或右栏 support 时，优先覆盖分类 Hub 相关的 Playwright 场景：

```bash
pnpm exec playwright test tests/e2e/features/post-list.spec.ts
```

验证重点：

- `/category/` 能展示分类卡片。
- `/category/recent/` 能按最近活动时间展示文章并保留右栏。
- `/category/recommended/` 能展示推荐文章并保留右栏。
- `/category/{slug}/` 能展示具体分类文章。
- 合法 `?tag=` 查询能加载 `/api/categories/{slug}.json/`。
- 修改 slug 后确认旧 URL 是否按预期消失或由部署层 redirect。

## 迁移支持

未来如果把分类、标签或文章索引迁移到数据库，应保留当前 UI View Model 和服务边界，而不是让页面组件直接依赖数据库 SDK。

推荐目标边界：

```text
数据库 / 外部内容 API
  ↓
Repository 或 Loader
  ↓
ContentStore-compatible index
  ↓
src/services/category-hub.ts
src/services/category-page.ts
  ↓
Astro pages / UI components
```

迁移原则：

- UI 继续消费 `CategoryHubPageViewModel`、`CategoryHubCard`、`CategoryPageProps` 和 `ClientPostCard` 这类页面级 View Model。
- 数据库记录可以拥有独立主键，但路由仍应使用稳定 slug。
- 分类图片继续使用通用 `src` 字符串契约，允许本地 public 路径、CDN URL 或对象存储 URL。
- Tag JSON 可以替换为数据库查询接口，但客户端仍应得到同形态的紧凑 `ClientPostCard[]`。
- 不要把数据库 SDK、鉴权、连接字符串或 Node-only 逻辑导入 Astro/Svelte 组件。
- 不要把 Raw Markdown、正文 HTML、密码或详情页专用字段暴露到分类列表 API。

### 建议的数据表

如果使用数据库，可以按以下形态映射：

| 表或集合 | 关键字段 | 说明 |
| --- | --- | --- |
| `categories` | `id`、`slug`、`name`、`description`、`imageUrl`、`imageAlt`、`aliases` | 分类身份和展示资产。 |
| `posts` | `id`、`slug`、`title`、`categoryId`、`published`、`updated`、`score`、`summary`、`coverUrl` | 分类列表所需文章摘要。 |
| `tags` | `id`、`slug`、`name` | 标签身份。 |
| `post_tags` | `postId`、`tagId` | 多对多关系。 |

迁移时先让数据库 loader 输出与当前 `ContentStore` 等价的轻量索引，再替换服务内部数据来源。只要 View Model 合同不变，分类 Hub、具体分类页、右栏 support 和客户端 Tag 筛选都不需要大规模重写。

### 迁移步骤建议

1. 固化现有 slug：导出 `CATEGORY_DEFINITIONS`，确认每个 slug 都是长期稳定 URL。
2. 扫描文章 frontmatter，生成分类、标签和文章摘要快照。
3. 将 `src/data/category-assets.ts` 的描述和图片迁移到分类记录。
4. 编写数据库 loader，使其输出与 `ContentStore` 分类索引等价的数据。
5. 先替换 `category-hub.ts` 和 `category-page.ts` 的数据来源，保持页面组件不变。
6. 对比 `/category/`、`/category/recent/`、`/category/recommended/`、`/category/{slug}/` 和 Tag JSON 输出。
7. 完成后再评估是否迁移文章详情页、Feed 或搜索索引。

不要在迁移第一步就改 UI 结构。分类管理的长期稳定点应该是 slug、URL 和 View Model，而不是当前 Astro 或未来数据库的具体读取方式。
