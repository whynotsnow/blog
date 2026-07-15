# 开发者文档

本目录面向人类开发者、内容维护者和部署维护者，所有文档使用中文编写。

## 基础理解

| 文档 | 说明 |
| --- | --- |
| [项目架构](./architecture.md) | 项目结构、内容管线、路由、配置入口和扩展原则。 |
| [Design System](./design-system.md) | Design token、Theme、Pattern、Legacy 迁移和验证规则。 |
| [开发工作流](./development.md) | 本地环境、命令、构建、检查和常用任务。 |
| [测试策略](./testing.md) | 按改动影响面选择测试、测试分层、升级条件和 CI 分工。 |
| [维护指南](./maintenance.md) | 定期检查、依赖更新、生成文件和高风险区域。 |

## 内容与配置

| 文档 | 说明 |
| --- | --- |
| [内容编写指南](./content-guide.md) | 文章 frontmatter、分类标签、草稿、资源和 schema 变更。 |
| [配置说明](./configuration.md) | 站点配置、环境变量、特色页面和 URL 工具。 |

## 内容分离与部署

| 文档 | 说明 |
| --- | --- |
| [内容分离](./content-separation.md) | 外部内容仓库配置、私有仓库和故障排查。 |
| [内容仓库结构](./content-repository.md) | 分离内容仓库的推荐目录结构。 |
| [内容迁移指南](./migration-guide.md) | 从单仓库迁移到分离内容仓库。 |
| [部署指南](./deployment.md) | 静态平台部署和 CI/CD 配置。 |
| [自动构建触发](./auto-build-trigger.md) | 内容更新后触发重新部署的快速参考。 |

## 维护规则

- 新增开发者文档放在本目录。
- 文件名使用小写 kebab-case。
- 涉及 Agent 执行规则的内容，同步更新 `../agents/` 下的英文文档。
