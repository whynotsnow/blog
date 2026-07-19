# 开发工作流

## 环境要求

- Node.js 18 或更新版本。
- pnpm 10，版本应与 `package.json` 中的 `packageManager` 保持一致。

本项目通过 `scripts/check-env.mjs` 校验 pnpm 版本。若本机全局 PATH 中存在其他 pnpm 版本，优先使用 Corepack 启动项目声明的版本：

```bash
corepack enable
corepack install
corepack pnpm --version
```

在 Codex 或临时 shell 中，可以先进入项目环境：

```bash
source .codex/env-setup.sh
```

该脚本会通过 Corepack 使用 `package.json` 中声明的 pnpm 版本，不会要求修改系统全局 pnpm。

## 安装依赖

```bash
pnpm install
```

## 本地开发

```bash
pnpm dev
```

`dev` 脚本会启动 `astro dev --host`。

`predev` 会先运行环境校验；`dev` 会在启动前运行内容同步脚本。如果未配置内容分离，同步脚本会直接退出并继续使用本地内容。

## 构建

```bash
pnpm build
```

构建流程：

1. `scripts/update-anime.mjs`
2. `astro build`
3. `pagefind --site dist`
4. `scripts/compress-fonts.js`

如果启用了外部服务，构建可能依赖对应环境变量或网络访问。

## 检查

```bash
pnpm check
pnpm type-check
pnpm type-check:tests
pnpm type-check:declarations
pnpm test:fast
pnpm test:smoke
pnpm test:e2e:full
pnpm test:plan
pnpm test:affected
pnpm test:impact:check
pnpm format:check
pnpm lint
pnpm lint:md
```

先运行 `pnpm test:plan` 查看改动影响范围；需要自动执行选择结果时运行 `pnpm test:affected`。`pnpm test:impact:check` 会确认 `src/features/**` 与 `tests/e2e/**` 均已录入 Impact Map，避免新增模块静默回退到全量验证。`pnpm type-check` 检查 `src`，`pnpm type-check:tests` 检查 Unit、Integration、Playwright 和测试配置。`pnpm test:fast` 运行 Vitest 快速层。

需要浏览器冒烟测试时，先运行 `pnpm test:smoke:install` 安装 Chromium，再运行 `pnpm test:smoke`。该命令只运行关键路由；完整浏览器回归使用 `pnpm test:e2e:full`。Playwright 会自动启动 Astro dev server，不需要手动运行 `pnpm dev`。

如果 Codex 沙箱中的 Chromium 在启动阶段出现 `MachPortRendezvousServer Permission denied (1100)`，这表示浏览器进程被 macOS sandbox 拦截，页面断言尚未执行。不要在同一受限进程中反复重试，也不要把它记成页面测试失败。应在普通宿主 Terminal 中运行：

```bash
source .codex/env-setup.sh
pnpm test:e2e:full
```

当当前 Codex 会话提供宿主 Terminal 控制能力时，Agent 可以通过该通道执行上述命令；否则由本机 Terminal 或 CI 执行。仅把 Playwright 指向系统 Chrome executable 不一定能绕过进程级 sandbox，因此不能作为默认修复。
JavaScript、TypeScript、Astro 或 Svelte 代码质量检查运行 `pnpm lint`，需要自动修复可修复问题时运行 `pnpm lint:fix`。
文档结构和 Markdown 格式变更运行 `pnpm lint:md`，当前检查范围包括 `AGENTS.md`、`README.md` 和 `docs/**/*.md`，初始规则只启用 `MD031`。

## 格式化

```bash
pnpm format
```

当前格式化配置会忽略 Markdown 和 Astro 文件，避免对文章内容和复杂 Astro 模板做大范围无关改动。
Markdown 规范检查由 `markdownlint-cli2` 单独处理，不会自动重写文章内容。需要自动修复 fenced code block 空行时运行 `pnpm lint:md:fix`。

## Git hooks

依赖安装后会通过 `prepare` 自动执行 `scripts/install-git-hooks.mjs`，将本仓库的 Git hooks 路径设置为 `.githooks`。

提交前会运行 `.githooks/pre-commit`，并按照 staged 文件选择静态门禁：

1. 自动格式化已暂存的 JavaScript、TypeScript、Svelte、CSS、JSON、YAML 等代码文件，并重新暂存格式化结果。
2. 如果已暂存文件同时存在未暂存改动，hook 会停止提交，避免自动格式化时把未准备提交的内容一起加入 commit。
3. 运行 `git diff --cached --check` 检查暂存内容的空白错误。
4. Markdown 文件运行 markdownlint；代码文件只对 staged 目标运行 ESLint。
5. Design、Astro/Svelte/内容和 source TypeScript 门禁仅在对应范围变化时运行。
6. 测试和测试配置变化时运行独立的 `tsconfig.tests.json` 检查。

GitHub Pull Request 与普通 `main` Push CI 都使用 `tests/impact-map.json`，按 Git Diff 选择 Quality、Fast Tests、Browser Tests 和 Astro Build。依赖、测试基础设施、跨模块基础设施、未分类路径等高风险改动仍会升级为全量验证；每周定时任务和手动 Workflow Dispatch 固定运行全部门禁，作为影响映射的兜底。

也可以手动运行：

```bash
pnpm precommit
```

## 常用任务

创建文章：

```bash
pnpm new-post -- my-new-post
```

生成本地测试文章：

```bash
pnpm generate-posts
```

准备配置中锁定的外部内容版本：

```bash
pnpm content:prepare
```

`pnpm sync-content` 是同一命令的兼容别名。未启用外部内容时，两个命令都只确认 `mode=local`，不会执行 Git 或修改本地内容。

## Git 注意事项

- 不要提交 `dist`、`node_modules`、`.pnpm-store` 等生成目录。
- 修改 `src/config.ts` 前确认这是站点私有配置，不是通用默认值。
- 避免把大范围格式化和功能改动混在同一次提交里。
