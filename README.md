# Mizuki For whynotsnow

> ⚠️ 本仓库由 **whynotsnow** 魔改自 [matsuzaka-yuki/Mizuki](https://github.com/matsuzaka-yuki/Mizuki)  
> 更多详细文档请参考 [Mizuki 官方文档](https://docs.mizuki.mysqil.com/)  
> 本 README 主要记录 **whynotsnow 改动和新特性**  

---

## 🌟 项目简介

**Mizuki For whynotsnow** 是基于 Mizuki 的个人博客/内容管理系统的魔改版本，目标是 **个性化布局、增强功能和私有化配置**。  
适合自用、演示以及学习 Astro + Svelte + Tailwind 的静态站点开发。

- ⚠️ 本项目不适合无代码基础或者无前端技术知识的人士食用！
- 🤝 有任何疑问或者有更好的想法可以提可以提issues或pr
---

### ✨ 新特性 (New Features)

🚀 本版本主要围绕 **内容组织、架构优化以及前端组件能力增强** 进行了一系列改进。

#### 🎨 个性化改动

- 对 **文档、配置、样式和布局** 进行了整体调整与优化
- 在 `list` 模式下，隐藏原有 **右侧 Sidebar**，改为隐藏 **左侧 Sidebar**

#### 📰 首页文章推荐机制

- 取消首页展示 **所有文章 + 分页模式**
- 引入 **简易推荐算法**
- 首页文章将根据推荐逻辑动态生成，使内容展示更具导向性

#### 📂 分类与内容组织

- 新增 **分类页面（Category Page）**
- 支持 **分类分页**
- 分类列表通过 **SSG 静态生成**，有利于 **SEO 收录**
- 列表页面支持 **基于分类筛选文章**

#### 🏷️ 分类与标签导航组件

新增组件：

- `PostTaxonomyNav`

功能：

- 展示当前文章的 **分类 (Category)** 与 **标签 (Tag)**
- 支持 **在分类下筛选 Tag**
- 提供更清晰的文章导航能力

#### 🔖 Tag 页面支持

- 参考原 UI 组件实现 **Tag 页面**
- 支持 **Tag 分页**
- Tag 分页使用 **客户端分页**
- Tag 页面 **不参与 SEO**

#### 📑 分页组件重构

- Tag 分页模式支持
- 原有 **Astro的UI组件使用Svelte重现实现保持UI一致性**
- 统一全站分页逻辑
- 提升组件复用性

#### 🧪 内容生成工具

新增 **批量生成文章脚本**

用途：

- 快速生成测试文章
- 方便本地开发与 UI 调试

#### 🧩 架构优化

引入新的架构层以提升可维护性：

- 引入 **services 层**，实现 UI 与业务逻辑解耦
- 统一文章数据源 `source.ts`
- 数据来源统一为： 
```
content-store/buildContentStore
```

#### 🔧 Widget 系统优化

- Widget 组件统一使用：

```
widget/registry
```

- 通过 registry 实现 **组件注册与 props 注入**
- 提升组件扩展能力

#### 🔗 分类与标签跳转逻辑

- `tags` 与 `categories` 统一使用 **slug 映射跳转**
- 统一 Archive 页面数据来源
- 提高数据结构一致性


---

### 🔧 改动项 (Changes)

本版本对部分原有逻辑进行了结构调整和 UI 优化：

#### 🗂 数据结构优化

- 分类（Category）与标签（Tag）改为 **统一查询模式**
- 不再进行独立查询
- 每篇文章自动关联对应分类与标签

#### ⚙️ 配置管理调整

- 站点配置、主题配置、页面布局配置 **全部私有化**
- 不再通过前端页面展示
- 改为 **开发阶段配置**

#### 🧭 布局结构调整

- **profile模块** 将显示有右侧而不是左侧
- **站点信息模块** 移动至原 `profile` 区域下方
- 页面结构更加清晰

---

### ⚠️ 破坏性更新 / 注意事项 (Breaking Changes)

在升级或迁移时请注意以下变更：

#### 🎨 UI 表现变化

由于布局与组件逻辑进行了调整：

- UI 表现 **可能与原项目略有差异**
- 部分页面结构与展示方式已重新设计

#### ⚙️ permalinkConfig 兼容性

- `permalinkConfig` 依赖的 **UI 数据结构已发生调整**
- 旧配置可能出现：

  - 配置无效
  - 页面渲染异常
  - URL 生成错误

建议：

- 升级时重新检查 `permalinkConfig`
- 根据新的数据结构进行适配

### 🛠️ 未来支持 / 优化点 (Planned Features / Improvements)

- [ ] 文章首页推荐列表推荐算法将使用Umami等第三方数据参与逻辑
- [ ] 而文章详情 不在展示站点信息相关的widget TOC改为左边展示
- [ ] 友链支持在线申请  
- [ ] 更多功能，敬请期待


## 🛠️ 技术栈

- **框架**: Astro  
- **前端交互**: Svelte  
- **样式**: Tailwind CSS + Stylus  
- **构建工具**: Vite  
- **包管理**: pnpm  
- **代码规范**: Biome  

---

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18  
- pnpm  

### 安装依赖

```bash
git clone https://github.com/whynotsnow/blog.git
cd blog
pnpm install
```

### 项目运行

```bash
pnpm dev
```
浏览器打开 `http://localhost:4321` 预览页面

## ⚙️ 生产环境变量配置
⚠️ 本项目仅考虑Vercel部署的情况，其他方式部署请自行查阅[Mizuki 文档](https://docs.mizuki.mysqil.com/)

#### 网站分析
| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GTM_ID` | Google Tag Manager 容器 ID | `GTM-XXXXXX` |
| `CLARITY_PROJECT_ID` | Microsoft Clarity 项目 ID | `xxxxx` |
如果不配置会使用默认ID

#### 访问量统计（如果启用 umamiConfig）
| 变量名 | 说明 | 示例 |
|--------|------|------|
| `UMAMI_API_KEY` | umami 统计网站访问量 | `api_xxxxxxx` |

#### 评论系统（如果启用 Twikoo）
| 变量名 | 说明 | 示例 |
|--------|------|------|
| `MONGODB_URI` | MongoDB Atlas提供的数据库链接 | `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority` |

参考[Twikoo 文档](https://twikoo.js.org/mongodb-atlas.html)
可能还需要配置IP Access List
