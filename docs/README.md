# 文档中心

这里是 `Mizuki For whynotsnow` 的项目文档入口。

文档按读者拆分：

- `developers/`：面向开发者和内容维护者，使用中文编写。
- `agents/`：面向 AI coding agent，使用英文编写。
- `assets/`：文档图片、编辑器静态资源等附属资产。

## 开发者文档

| 文档 | 说明 |
| --- | --- |
| [开发者文档索引](./developers/README.md) | 中文开发者文档总入口。 |
| [项目架构](./developers/architecture.md) | 项目目录、内容管线、路由、配置和扩展原则。 |
| [Design System](./developers/design-system.md) | 视觉 token、Theme、Pattern、兼容层和治理规则。 |
| [开发工作流](./developers/development.md) | 环境、命令、构建、检查和常用任务。 |
| [内容编写指南](./developers/content-guide.md) | 文章 schema、frontmatter、分类标签、草稿和资源规则。 |
| [配置说明](./developers/configuration.md) | 站点配置、环境变量、特色页面和 URL 工具。 |
| [维护指南](./developers/maintenance.md) | 定期检查、依赖更新、生成文件和高风险区域。 |
| [内容分离](./developers/content-separation.md) | 外部内容仓库配置、私有仓库和故障排查。 |
| [内容仓库结构](./developers/content-repository.md) | 分离内容仓库的推荐目录和写作规范。 |
| [内容迁移指南](./developers/migration-guide.md) | 从单仓库迁移到分离内容仓库。 |
| [部署指南](./developers/deployment.md) | Vercel 等静态平台部署说明。 |
| [自动构建触发](./developers/auto-build-trigger.md) | 内容更新后触发重新部署的快速参考。 |

## Agent 文档

| 文档 | 说明 |
| --- | --- |
| [Agent Workspace Spec](../spec/agent-workspace/SPEC.md) | Agent 工作区文件格式、合规等级、上下文解析与版本规则。 |
| [Agent Documentation](./agents/README.md) | English documentation index for AI agents. |
| [Agent Workflow](./agents/workflow.md) | English workflow for AI agents: inspect, modify, validate, and hand off work. |
| [Project Map](./agents/project-map.md) | English architecture map optimized for AI agents. |
| [Runtime Playbook](./agents/runtime-playbook.md) | English playbook for known runtime and tooling pitfalls. |
| [Runtime Requirements](./agents/runtime-requirements.md) | English execution capability contract and local profile resolution order. |
| [Disclosure Policy](./agents/disclosure-policy.md) | English policy for public Agent Workspace Spec knowledge and ignored runtime state. |
| [Failure Index](./agents/failure-index.md) | English index of clustered failure patterns. |
| [Execution Log](./agents/execution-log.md) | English log for reusable AI-assisted task learning. |
| [Memory](./agents/memory.json) | Structured persistent memory for Agent Workspace Spec. |

## 推荐阅读路径

### 修改代码

1. 阅读 [项目架构](./developers/architecture.md)。
2. 阅读相关专题文档。
3. 使用 `git status --short`、`rg --files` 和目标文件读取命令确认当前上下文。
4. 变更后运行 `pnpm check` 或更具体的校验命令。

### 编写内容

1. 阅读 [内容编写指南](./developers/content-guide.md)。
2. 使用 `pnpm new-post -- <filename>` 创建文章。
3. 保持分类和标签命名稳定。

### 配置站点

1. 阅读 [配置说明](./developers/configuration.md)。
2. 修改 `src/config.ts`。
3. 配置结构变化时同步更新 `src/types/config.ts`。

### 交给 Agent 维护

1. Agent 先读 [AGENTS.md](../AGENTS.md)。
2. Agent 再读 [Agent Workflow](./agents/workflow.md) 和 [Project Map](./agents/project-map.md)。
3. 涉及用户或开发者行为的文档变更，仍需更新 `developers/` 下的中文文档。

## 目录结构

```text
docs/
├── README.md
├── developers/
│   ├── README.md
│   ├── architecture.md
│   ├── development.md
│   ├── content-guide.md
│   ├── configuration.md
│   ├── maintenance.md
│   ├── content-separation.md
│   ├── content-repository.md
│   ├── migration-guide.md
│   ├── deployment.md
│   └── auto-build-trigger.md
├── agents/
│   ├── README.md
│   ├── workflow.md
│   ├── project-map.md
│   ├── runtime-playbook.md
│   ├── runtime-requirements.md
│   ├── disclosure-policy.md
│   ├── failure-index.md
│   ├── execution-log.md
│   └── memory.json
└── assets/
    ├── editor/
    └── image/
```

Agent Workspace Spec 的规范性文件、JSON Schema 和公开示例位于 `spec/agent-workspace/`；项目实例 manifest 位于 `.agent-workspace/manifest.json`，本地 profile 位于被 Git 忽略的 `.agent-workspace/local/`。

## 维护规则

新增文档前先判断读者：

- 面向人类开发者、内容维护者、部署维护者：放入 `docs/developers/`，使用中文。
- 面向 AI Agent 的操作规则、上下文地图、执行流程：放入 `docs/agents/`，使用英文。
- 图片、HTML/CSS/JS 辅助文件等资产：放入 `docs/assets/`。
