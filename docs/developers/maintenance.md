# 维护指南

## 定期检查

建议周期性运行：

```bash
pnpm check
pnpm type-check
pnpm lint
pnpm lint:md
pnpm build
```

涉及部署影响的改动建议运行 `pnpm build`，因为它会同时覆盖 Astro 构建、Pagefind 索引和字体压缩。
代码质量检查建议运行 `pnpm lint`；如需自动修复可修复问题，运行 `pnpm lint:fix` 后再复查 diff。
文档结构调整或 Markdown 格式修复建议运行 `pnpm lint:md`。

## 依赖更新

项目依赖面较广，包括 Astro、Svelte、Pagefind、Expressive Code、图片处理和静态资源工具。

推荐流程：

1. 每次只更新一组相关依赖。
2. 运行 `pnpm check`。
3. 运行 `pnpm build`。
4. 检查搜索、代码块、图片、文章详情页等关键页面。

## 生成内容和外部内容

不要手动编辑：

- `dist`
- `node_modules`
- `.pnpm-store`
- 生成的搜索索引
- 压缩后的字体产物

启用内容分离时，`src/content`、`src/data`、`public/images` 可能来自 `CONTENT_DIR` 的链接或复制结果。大范围修改前先确认当前内容来源。

## 高风险区域

| 区域 | 风险 |
| --- | --- |
| `src/content.config.ts` | Schema 变化可能影响大量文章构建。 |
| `src/services/core/inject.ts` | 派生元数据会影响列表、详情、归档、Feed 和卡片。 |
| `src/services/core/content-store.ts` | 分类和标签索引会影响路由与导航。 |
| `src/utils/permalink-utils.ts` | URL 变化会影响旧链接和 SEO。 |
| `scripts/sync-content.js` | 会移动、链接或复制内容目录。 |
| `src/config.ts` | 站点私有行为和外部服务配置集中在这里。 |

## 文档维护

行为变化时，更新最接近的文档：

- 架构或数据流：[项目架构](./architecture.md)
- 内容 schema 或写作规范：[内容编写指南](./content-guide.md)
- 配置：[配置说明](./configuration.md)
- 本地工作流：[开发工作流](./development.md)
- 部署：[部署指南](./deployment.md)
- Agent 工作流：[Agent Workflow](../agents/workflow.md)
