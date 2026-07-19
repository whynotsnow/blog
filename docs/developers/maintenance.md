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
代码质量检查建议运行 `pnpm lint`；如需自动修复可修复问题，运行 `pnpm lint:fix` 后再复查 diff。`pnpm type-check` 与 `pnpm check` 都属于提交门禁：前者检查纯 TypeScript，后者负责 Astro、Svelte、内容和组件 Props 诊断。完整 `pnpm build` 仍应作为 CI 的合并门禁，避免被本地 `--no-verify` 绕过。
文档结构调整或 Markdown 格式修复建议运行 `pnpm lint:md`。

## Agent Workspace Spec 公开边界

`AGENTS.md` 与 `docs/agents/` 属于可公开、可版本管理的 Agent Workspace Spec 知识。个人身份、本机绝对路径、完整命令输出、未经审核的 runtime memory 和私有基础设施信息必须保存到以下 Git 忽略目录：

- `.agent-workspace/local/`：稳定的本机或个人上下文。
- `.agent-workspace/raw/`：原始日志、trace、prompt 和临时诊断。
- `.agent-workspace/quarantine/`：等待脱敏和分类的候选 memory。

团队环境通过本地加盐指纹将当前 Git identity 映射为随机 Developer ID，并为不同机器和会话分别生成 Machine ID 与 Session ID。公开文档不会记录开发者姓名、邮箱或这些本地 ID。

这里的“私有”限制的是数据输出和持久化，不是禁止 Agent 读取。任务确实依赖开发者偏好、机器能力、会话状态或本地诊断时，Agent 可以读取并分析这些目录；无关任务不应为了流程完整而主动检查。最终 handoff 只能报告完成任务所必需的脱敏结论，例如某项能力当前是否可用，不能披露身份、本机路径、hostname、本地 profile ID、私有 URL、credential 或原始观察数据。

首次使用或切换 Git identity 后运行：

```bash
node .agent-workspace/tools/agent-workspace.mjs profile init
node .agent-workspace/tools/agent-workspace.mjs profile status
node .agent-workspace/tools/agent-workspace.mjs profile doctor
node .agent-workspace/tools/agent-workspace.mjs runtime detect
node .agent-workspace/tools/agent-workspace.mjs session start
```

同一开发者需要关联另一个 Git identity 时，使用本地已有的 Developer ID：

```bash
node .agent-workspace/tools/agent-workspace.mjs profile link-identity <developer-id>
```

Agent Workspace 工具统一位于 `.agent-workspace/tools/`，通过 manifest 声明单一入口，不要求修改 `package.json`。只要 manifest 声明的本地入口存在且对应 runtime 可用，就应优先直接调用项目本地工具。Node 项目可以自行添加快捷 alias，但它不是 Spec 合规要求。

这里的 `.agent-workspace/tools/` 是项目本地实现层，也是当前项目 Agent Workspace 命令的最高优先级执行入口。已安装的 Agent Workspace Skill 负责 workspace 识别、规范解释、迁移指导和边界审查，不应覆盖或绕过项目自己的 tools 实现。不同项目可以使用 Node、Python、Bash、Make、package-manager wrapper 或 CI 命令，只要 manifest 描述准确即可。

如果 manifest 声明的入口缺失或本地实现不支持某个命令，应报告 workspace capability gap，不能静默改用 Skill 自带 validator。Skill 的本机安装路径属于 private local state，不得写入公开项目文档。

提交 Agent Workspace Spec 变更前运行：

```bash
node .agent-workspace/tools/agent-workspace.mjs validate
pnpm lint:md
```

公开 memory 必须使用 `$HOME`、`<user>`、`<repository>` 等占位符，不能直接复制本机路径或完整日志。详细规则参见 [Agent Workspace Spec Disclosure Policy](../agents/disclosure-policy.md)。

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

启用内容分离时，`src/content/posts`、`src/content/spec`、`src/data`、`public/images` 是指向 `CONTENT_DIR/current` 的受管理链接。大范围修改前先运行 `pnpm content:prepare` 并确认日志中的模式与 commit SHA。

## 高风险区域

| 区域 | 风险 |
| --- | --- |
| `src/content.config.ts` | Schema 变化可能影响大量文章构建。 |
| `src/services/core/inject.ts` | 派生元数据会影响列表、详情、归档、Feed 和卡片。 |
| `src/services/core/content-store.ts` | 分类和标签索引会影响路由与导航。 |
| `src/utils/url-utils.ts` | URL 变化会影响旧链接和 SEO。 |
| `scripts/prepare-content.mjs`、`scripts/content-sync/` | 会准备 pinned checkout，并事务性切换四个内容目录。 |
| `src/config.ts` | 站点私有行为和外部服务配置集中在这里。 |

## 文档维护

行为变化时，更新最接近的文档：

- 架构或数据流：[项目架构](./architecture.md)
- 内容 schema 或写作规范：[内容编写指南](./content-guide.md)
- 配置：[配置说明](./configuration.md)
- 本地工作流：[开发工作流](./development.md)
- 部署：[部署指南](./deployment.md)
- Agent 工作流：[Agent Workflow](../agents/workflow.md)
