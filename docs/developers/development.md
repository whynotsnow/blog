# 开发工作流

## 环境要求

- Node.js 22 或更新版本。本仓库提供 `.nvmrc`，在安装了 nvm 的设备上优先运行 `nvm use`。
- pnpm 10，版本应与 `package.json` 中的 `packageManager` 保持一致。

本项目通过 nvm 固定 Node 入口，通过 Corepack 启动 `package.json` 中声明的 pnpm 版本。若本机全局 PATH 中存在其他 pnpm 版本，不要为本项目单独配置 `.pnpm-store`，优先使用 Corepack：

```bash
nvm use
npm uninstall -g pnpm
corepack enable
corepack install
corepack pnpm --version
```

如果曾经通过 `npm i -g pnpm` 或 Homebrew 安装过 pnpm，应先移除全局 pnpm，避免全局命令优先于 Corepack shim 并绕过 `packageManager` 字段。卸载后重新运行 `corepack enable && corepack install`，确认 `which pnpm` 指向当前 nvm Node 目录下的 Corepack 代理。

在 Codex 或临时 shell 中，可以先进入项目环境：

```bash
source .codex/env-setup.sh
```

该脚本会通过 Corepack 使用 `package.json` 中声明的 pnpm 版本，不会要求修改系统全局 pnpm。

pnpm store 使用 pnpm 的用户级默认目录，不在项目内设置 `store-dir=.pnpm-store`。如果历史环境导致 `ERR_PNPM_UNEXPECTED_STORE`，先确认当前入口：

```bash
nvm use
corepack pnpm --version
corepack pnpm store path
```

确认无误后重建依赖目录，而不是修改 `pnpm-lock.yaml`：

```bash
rm -rf node_modules
corepack pnpm install
```

## 安装依赖

```bash
corepack pnpm install
```

## 本地开发

```bash
corepack pnpm dev
```

`dev` 脚本会依次准备 Content 和字体子集，再启动 `astro dev --host`。字体准备使用输入 Hash 缓存；源字体、配置和字符集没有变化时不会重复压缩。

`predev` 会先运行环境校验；`dev` 会在启动前运行内容同步脚本。如果未配置内容分离，同步脚本会直接退出并继续使用本地内容。必须保持 `content:prepare → font:prepare → astro dev` 的顺序，否则外部 Content 中的新字符不会进入字体子集。

字体相关命令：

```bash
pnpm font:prepare
pnpm font:check
```

`font:prepare` 生成或复用 `.font-build/*.woff2`；`font:check` 只校验缓存产物是否与当前字体源、配置和字符集一致。开发过程中新增文章字符后，可重新运行 `pnpm font:prepare` 或重启 Dev Server。

## 构建

```bash
pnpm build
```

构建流程：

1. `content:prepare`
2. `scripts/update-anime.mjs`
3. `font:prepare`
4. `astro build`
5. `pagefind --site dist`

字体子集必须在 `astro build` 之前生成。Astro Font API 从 `.font-build/` 读取 WOFF2，生成带 Hash 的 `/_astro/fonts/` 产物；原始 TTF 存放在 `scripts/fonts/source/`，不能放在 `src/assets/` 或 `public/`，避免被 Vite/Astro 当作可发布静态资源复制到 `dist/_astro/`。

如果启用了外部服务，构建可能依赖对应环境变量或网络访问。

## 检查

```bash
pnpm check
pnpm type-check
pnpm type-check:scripts
pnpm type-check:svelte
pnpm type-check:tests
pnpm type-check:declarations
pnpm test:fast
pnpm test:smoke
pnpm test:e2e:full
pnpm test:plan
pnpm test:affected
pnpm test:plan:ci
pnpm test:affected:ci
pnpm test:impact:check
pnpm format:check
pnpm lint
pnpm lint:md
```

先运行 `pnpm test:plan` 查看本地快速模式的改动影响范围；需要自动执行选择结果时运行 `pnpm test:affected`。本地模式不会自动执行 `verify:full`，无法分类或建议完整回归的路径会以风险提示输出。CI 或远程 Push 场景使用 `pnpm test:plan:ci` 与 `pnpm test:affected:ci`，此时高风险路径会升级到完整回归。`pnpm test:impact:check` 会确认 `src/components/modules/**` 与 `tests/e2e/**` 均已录入 Impact Map，避免新增模块在 CI 中静默回退到全量验证。`pnpm type-check` 检查纯 TypeScript 项目，`pnpm type-check:scripts` 使用 `tsconfig.scripts.json` 对 Node 脚本执行 `checkJs` 检查，`pnpm type-check:declarations` 使用 `--isolatedDeclarations` 检查导出声明边界，已接入 CI Quality Checks，但不会在本地 precommit 中阻塞提交。`pnpm type-check:svelte` 使用 `svelte-check` 检查 `.svelte` 组件脚本、模板和 Props 诊断，`pnpm type-check:tests` 检查 Unit、Integration、Playwright 和测试配置。`pnpm test:fast` 运行 Vitest 快速层。

需要浏览器冒烟测试时，先运行 `pnpm test:smoke:install` 安装 Chromium，再运行 `pnpm test:smoke`。该命令只运行关键路由；完整浏览器回归使用 `pnpm test:e2e:full`。Playwright 会自动启动 Astro dev server，不需要手动运行 `pnpm dev`。为避免复用旧的 Vite/Astro 状态，Playwright 默认不会复用已有本地服务；只有确认当前服务是刚启动且状态可信时，才使用 `PLAYWRIGHT_REUSE_SERVER=1 pnpm test:e2e:full`。

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

## 代码注释与可读性

代码注释主要服务人类开发者，新增注释统一使用中文。必要的英文技术词可以保留，例如 `ContentStore`、`Swup`、`ViewModel`、`requestAnimationFrame`、`TOC indicator` 和 `iframe`。

优先注释维护者容易误改的关键点：核心状态机、缓存或索引边界、路由规则、跨模块事件契约、动画时序和性能保护。注释应简短解释“为什么这样做”或“这里的边界是什么”，不需要给每个函数补完整 JSDoc。

避免复述代码本身，例如“获取元素”“初始化变量”“遍历列表”这类注释。AI Agent 的操作约束和架构记忆继续放在 `AGENTS.md`、`docs/agents/*` 和相关开发者文档中，不写进业务代码注释。

## Git hooks

依赖安装后会通过 `prepare` 自动执行 `scripts/install-git-hooks.mjs`，将本仓库的 Git hooks 路径设置为 `.githooks`。

提交前会运行 `.githooks/pre-commit`，并按照 staged 文件选择静态门禁：

1. 自动格式化已暂存的 JavaScript、TypeScript、Svelte、CSS、JSON、YAML 等代码文件，并重新暂存格式化结果。
2. 如果已暂存文件同时存在未暂存改动，hook 会停止提交，避免自动格式化时把未准备提交的内容一起加入 commit。
3. 运行 `git diff --cached --check` 检查暂存内容的空白错误。
4. Markdown 文件运行 markdownlint；代码文件只对 staged 目标运行 ESLint。
5. Design、Astro/内容、source TypeScript 和 Svelte component 门禁仅在对应范围变化时运行；Astro 检查会把 `hint` 级诊断也作为提交阻塞项，Svelte component 门禁使用 `svelte-check --tsconfig ./tsconfig.json --threshold error` 对齐 VSCode Svelte Language Server 的 error 级组件诊断。
6. 测试和测试配置变化时运行独立的 `tsconfig.tests.json` 检查；`tests/tsconfig.json` 只服务编辑器项目发现，继承同一套测试类型配置。

GitHub Pull Request 与普通 `main` Push CI 都使用 `tests/impact-map.json` 的 CI 模式，按 Git Diff 选择 Quality、Fast Tests、Browser Tests 和 Astro Build。依赖、测试基础设施、跨模块基础设施、未分类路径等高风险改动在 CI 中仍会升级为全量验证；每周定时任务和手动 Workflow Dispatch 固定运行全部门禁，作为影响映射的兜底。

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
