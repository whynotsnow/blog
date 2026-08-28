---
title: Coding Agent 三件套总览
published: 2026-08-28
updated: 2026-08-28
description: 从当前博客的工程化演进出发，说明为什么需要 agent-docs、agent-workspace 和 agent-project-sidecar 三个 skill 协同工作。
image: ''
author: whynotsnow
lang: zh_CN
tags: [Coding Agent, Agent Docs, Agent Workspace, Sidecar, 工程化]
category: 博客技术
draft: false
pinned: false
priority: 76
recommendScore: 64
comment: true
---

这个博客从 Mizuki 8.2 基线继续演进之后，已经不再是一个“改配置、调样式、加页面”的主题 fork。现在它有独立的 `service layer`、`content pipeline`、`Design System`、`runtime modules`、`impact-based testing`、`Agent Workspace Spec` 和相邻的 `planning sidecar`。这些结构让项目更可维护，也让 Coding Agent 面临更高的上下文要求。

如果没有明确的项目记忆，Agent 很容易重复犯同样的错误：把页面逻辑写回 route page、绕过 Content Store 直接查内容、把 runtime state 放进 service、把一次性运行日志写进公开文档，或者在没有 sidecar 授权的情况下直接实现计划项。

因此，当前项目把三个 skill 作为长期维护的基础设施：

- [agent-docs](https://github.com/whynotsnow/agent-skills/tree/main/skills/agent-docs)
- [agent-workspace](https://github.com/whynotsnow/agent-skills/tree/main/skills/agent-workspace)
- [agent-project-sidecar](https://github.com/whynotsnow/agent-skills/tree/main/skills/agent-project-sidecar)

它们维护在 [whynotsnow/agent-skills](https://github.com/whynotsnow/agent-skills)，目标不是让 Agent 多背几条规则，而是把 AI-assisted maintenance 变成可追踪、可验证、可恢复的工程流程。

## 这个系列

本文是总览，后面三篇分别介绍每个 skill：

| 文章 | 关注点 |
| --- | --- |
| [agent-docs：让项目文档有稳定 owner](/posts/agent-docs-skill/) | README、AGENTS、`docs/developers/` 和 `docs/agents/` 的职责边界。 |
| [agent-workspace：让 Agent 操作有本地契约](/posts/agent-workspace-skill/) | `.agent-workspace/manifest.json`、project-local tooling、public knowledge 和 local state。 |
| [agent-project-sidecar：让计划与执行可追踪](/posts/agent-project-sidecar-skill/) | `../blog.plan`、plan items、decisions、runs、validation notes 和 handoffs。 |

三篇专题不是孤立教程。它们共同回答一个问题：当一个项目越来越复杂时，Coding Agent 应该如何知道“该读什么、能改什么、如何验证、哪里记录”。

## 三个 skill 的分工

`agent-docs` 负责文档结构。它判断什么内容应该留在 README，什么内容应该进入开发者文档，什么内容应该写给 Agent，什么内容不应该被写进公开仓库。

`agent-workspace` 负责工作区契约。它让 Agent 能识别一个项目公开声明了哪些知识、有哪些本地工具、哪些 runtime observation 属于私有状态，以及如何使用项目自己的 validator。

`agent-project-sidecar` 负责计划和执行记录。它把 plans、decisions、runs、validation notes 和 handoffs 放到相邻 sidecar 中，避免产品源码仓库被过程记录淹没。

这三个 skill 对应三个不同层级：

| 层级 | 负责对象 | 不负责对象 |
| --- | --- | --- |
| `agent-docs` | 长期项目文档和读者分区 | 计划项状态、运行记录全文、本地机器状态 |
| `agent-workspace` | 工作区 manifest、公开知识、local tooling、disclosure boundary | 具体计划看板、业务功能实现 |
| `agent-project-sidecar` | planning records、execution traceability、handoff | 产品源码、正式项目文档、部署配置 |

## 一次任务如何流动

在当前博客中，一次非平凡 Coding Agent 任务通常按下面的顺序运行：

1. 从 `AGENTS.md` 进入，确认仓库强制规则。
2. 按任务范围读取 `docs/agents/workflow.md`、`project-map.md`、`runtime-playbook.md` 或对应 `docs/developers/` 文档。
3. 如果任务来自 sidecar，运行 `pnpm --silent plan:status --json`，只执行 `ready` 或 `running` 的 item。
4. 实现时遵守 `service layer`、`Design layer`、`runtime module` 和 `content pipeline` 的 ownership boundary。
5. 运行 `pnpm test:plan` 获取 impact-based validation plan。
6. 按计划运行最小充分验证，例如 `pnpm lint:md`、`pnpm check`、`pnpm test:integration`、`pnpm build:astro` 或 Playwright smoke。
7. 如果改动触及 Agent Workspace 文件或公开记忆，运行 `node .agent-workspace/tools/agent-workspace.mjs validate`。
8. 如果产生了可复用失败模式，写入合适的 Agent 文档；如果是计划执行证据，写入 sidecar，而不是塞进 README。

这个流程看起来比“直接改代码”更重，但它解决的是长期维护问题。项目越复杂，随手修复越容易制造下一次误解。

## 三者配合的关键边界

三者最重要的配合点是 ownership boundary。

README 是项目入口，不是变更流水账。`docs/developers/` 是人类维护者的中文文档，不承担 Agent 私有运行细节。`docs/agents/` 是 Agent 可复用知识，不存储未脱敏日志。`.agent-workspace/local/` 可以帮助当前 Agent 理解本地环境，但不能被复制到公开文件。`../blog.plan` 记录计划和执行证据，但不拥有产品源码。

当这些边界清晰后，Agent 就不会把所有信息都混进一个地方。它会知道：

- 项目身份和快速开始写进 README。
- 架构、配置、部署、内容维护写进 `docs/developers/`。
- Agent workflow、project map、runtime failures 写进 `docs/agents/`。
- 本地能力和隐私状态留在 `.agent-workspace/local/`。
- 计划、决策、验证证据和 handoff 留在 sidecar。

## 对 Mizuki 重构的意义

这个博客相对 Mizuki 8.2 的变化，不只是新功能数量更多，而是维护模型变了。原模板更像一个功能丰富的静态博客主题；当前项目更像一个可持续演进的 content engineering system。

Coding Agent 三件套让这种演进有了配套治理：

- `agent-docs` 保证文档不会随功能扩展失去 owner。
- `agent-workspace` 保证 Agent 不会凭经验猜测项目运行边界。
- `agent-project-sidecar` 保证计划和执行证据不会污染产品源码。

这也是当前项目接近 `Mizuki 9.0.0` 级别迭代的重要原因：它不只是在页面和样式上重构，也在把 AI-assisted development、validation、documentation 和 planning 纳入正式工程规范。
