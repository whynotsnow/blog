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
pnpm test:smoke
pnpm format:check
pnpm lint
pnpm lint:md
```

常规代码变更优先运行 `pnpm check`。涉及 TypeScript 类型、服务层结构或声明文件时，再运行 `pnpm type-check`。
需要浏览器冒烟测试或 Codex 调试页面时，先运行 `pnpm test:smoke:install` 安装 Chromium，再运行 `pnpm test:smoke`。`test:smoke` 会通过 Playwright 自动启动 Astro dev server，不需要手动运行 `pnpm dev`。

如果 Codex 沙箱中的 Chromium 在启动阶段出现 `MachPortRendezvousServer Permission denied (1100)`，这表示浏览器进程被 macOS sandbox 拦截，页面断言尚未执行。不要在同一受限进程中反复重试，也不要把它记成页面测试失败。应在普通宿主 Terminal 中运行：

```bash
source .codex/env-setup.sh
pnpm test:smoke
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

提交前会运行 `.githooks/pre-commit`：

1. 自动格式化已暂存的 JavaScript、TypeScript、Svelte、CSS、JSON、YAML 等代码文件，并重新暂存格式化结果。
2. 如果已暂存文件同时存在未暂存改动，hook 会停止提交，避免自动格式化时把未准备提交的内容一起加入 commit。
3. 运行 `git diff --cached --check` 检查暂存内容的空白错误。
4. 运行 `astro check` 检查 Astro、Svelte 和 TypeScript 诊断；存在错误时提交会被阻止。

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

同步外部内容：

```bash
pnpm sync-content
```

## Git 注意事项

- 不要提交 `dist`、`node_modules`、`.pnpm-store` 等生成目录。
- 修改 `src/config.ts` 前确认这是站点私有配置，不是通用默认值。
- 避免把大范围格式化和功能改动混在同一次提交里。
