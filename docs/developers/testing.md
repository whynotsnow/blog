# 测试策略

本项目采用按改动影响面选择测试的策略。目标不是减少必要验证，而是让最接近问题的测试层先提供反馈，把完整回归保留给跨模块、高风险和主干场景。

## 基本流程

1. 列出本次任务实际修改的文件，不把工作区中无关的用户改动纳入范围。
2. 将改动归类为文档、纯逻辑、内容与 schema、Feature UI、共享 Shell 与 Design、工具链与依赖。
3. 运行能够直接证明行为的最低测试层。
4. 如果改动使用共享契约，补充对应 Contract 测试。
5. 命中升级条件时运行完整回归。

## 测试分层

| 层级 | 用途 |
| --- | --- |
| L0 | 格式、Markdown、暂存区空白和 Agent Workspace 公开边界 |
| L1 | ESLint、TypeScript、Astro Check 和 Design Check |
| L2 | resolver、排序、URL、配置归一化等 Unit 测试 |
| L3 | Content Store、Service ViewModel、静态路径和构建脚本 Integration 测试 |
| L4 | 单一 Feature 的 Playwright E2E |
| L5 | Page Shell、导航、响应式、Design 等跨页面 Contract E2E |
| L6 | 全部测试与完整生产构建 |

纯函数和 Service 数据转换应优先在 L2/L3 验证，只有依赖浏览器渲染、DOM、响应式 CSS、导航或本地存储时才进入 Playwright。

## 完整回归升级条件

以下情况必须升级到 L6：

- 跨功能修改 `src/services/core`、内容 schema、共享 URL、全局布局、导航生命周期、Design foundations 或全局样式入口；
- 修改依赖、lockfile、Astro/TypeScript/Playwright 配置、构建编排、影响映射或 CI 选择逻辑；
- 同时影响三个及以上互不相关的 Feature；
- 影响映射无法识别发生变化的 runtime 路径；
- 已选择的测试暴露出预期之外的跨模块依赖；
- main、定时回归或发布验证。

Pull Request 可以运行受影响测试，但 main 和定时任务仍需保留完整回归作为映射遗漏的安全网。

## 测试代码组织

Playwright 测试按行为所有者拆分为 `smoke`、`shell`、`features` 和 `contracts`。共享 route、viewport 和 fixture 数据放在 `tests/fixtures`，无 Feature 断言的浏览器 helper 放在 `tests/support`。同一行为不应同时在 smoke 和 Feature 套件中重复做详细断言。

## 常用命令

```bash
pnpm test:plan
pnpm test:affected
pnpm test:fast
pnpm test:smoke
pnpm test:e2e:shell
pnpm test:e2e:full
pnpm build:astro
pnpm verify:full
```

- `test:plan` 只输出当前工作区改动对应的验证组和原因。
- `test:affected` 根据 `tests/impact-map.json` 执行受影响验证；无法分类的路径会升级到 `verify:full`。
- `test:smoke` 只负责关键路由可用性，不等于完整浏览器回归。
- `build:astro` 不运行 Pagefind、字体压缩和完整 Build 编排。
- `verify:full` 用于依赖、工具链、CI、未知影响、main 和发布场景。

Pre-commit 只对 staged 文件运行相关静态门禁，不执行浏览器测试。Pull Request CI 使用同一影响映射选择 Fast、Browser 和 Build job；push 到 `main` 与手动完整验证仍运行 L6。

每次交付应说明改动分类、实际运行的命令、未运行的更高测试层，以及是否命中完整回归升级条件。只运行 test discovery 或部分文件时，不能声称完整套件已经通过。
