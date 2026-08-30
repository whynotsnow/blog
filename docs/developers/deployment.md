# 部署指南

项目输出 Astro 静态站点。常规生产部署必须走 GitHub Actions `snow build CI` workflow 的手动生产发布路径，并在完整 CI 校验成功、真正发布前通过 `snow-base` Admin 部署审批。不要从本机、Vercel Dashboard 或平台 Git 自动部署入口直接发布生产。

本地和 CI 使用相同构建命令验证静态产物：

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm build
```

构建产物位于 `dist`。

## 默认本地内容部署

当前项目和 CI 明确使用仓库内内容：

```bash
ENABLE_CONTENT_SYNC=false
```

不需要内容仓库权限。`pnpm build` 会先输出 `[content] mode=local`，再执行 Anime 数据准备、Astro build、Mermaid 构建期 SVG 预渲染、Pagefind 和字体处理。Mermaid 预渲染使用 Playwright Chromium，CI workflow 会在构建前安装浏览器；本机全新环境首次构建前也需要执行一次 `pnpm exec playwright install chromium`。

## Pinned 外部内容部署

要启用外部内容，部署环境必须同时配置：

```bash
ENABLE_CONTENT_SYNC=true
CONTENT_REPO_URL=https://github.com/example/blog-content.git
CONTENT_REPO_COMMIT_SHA=0123456789abcdef0123456789abcdef01234567
CONTENT_DIR=./content
```

`CONTENT_REPO_COMMIT_SHA` 必须是远端可获取的完整 commit SHA。构建不会解析 branch、tag 或远端 HEAD。

私有仓库的凭证应由平台 Secret 或 SSH agent 提供。不要把 token 写入代码仓库环境文件。准备日志会隐藏仓库 URL，只输出最终 commit SHA。

## CI/CD 行为

GitHub Actions 当前在 `snow build CI` workflow 级别设置 `ENABLE_CONTENT_SYNC=false`。未来启用外部模式时，需要同时修改该值并通过 Secrets/Variables 注入 URL 和 SHA。

`snow build CI` 是唯一 CI/CD workflow：

- `pull_request` 和 `push` 使用 impact plan 选择必要验证。
- `schedule` 和 `workflow_dispatch` 使用 full validation。
- `workflow_dispatch` 且分支为 `main` 时，只有 `ci-summary` 确认所有选中验证 job 成功后，才会进入 `Production Deploy` job。
- production secrets 只在 `Production Deploy` job 中使用，不暴露给 PR、push 或 schedule 验证 job。

外部模式下，以下任一问题都会让 CI 失败：

- URL 或 SHA 缺失、格式错误。
- 远端认证或 SHA fetch 失败。
- checkout 的实际 HEAD 与配置 SHA 不一致。
- `posts`、`spec`、`data`、`images` 任一目录缺失或非法。
- release 提升、managed link 或 current 指针切换失败。

构建没有同步失败回退。只有明确的 `ENABLE_CONTENT_SYNC=false` 本地模式才使用仓库内内容。

## 生产部署流程

`snow build CI` workflow 的 `workflow_dispatch` 是唯一常规生产发布入口：

1. owner 确认目标 commit 已经在 `origin/main`，并且需要发布。
2. 在 GitHub Actions 手动运行 `snow build CI`，目标分支选择 `main`。
3. workflow 强制选择 full validation，执行 Agent Workspace、Markdown、ESLint、Design、Astro、TypeScript、Unit、Integration、完整 Playwright E2E 和完整生产构建。
4. `CI Summary` job 汇总所有验证 job；任何失败、取消或未知结果都会阻止生产发布。
5. `Production Deploy` job 校验当前 commit 等于 `origin/main`，并预检 production environment secrets。
6. workflow 拉取 Vercel production 项目设置，并用 Vercel CLI 生成 prebuilt 输出。
7. workflow 调用 `scripts/verify-deployment-approval.mjs`，向 `snow-base` API 创建或复用审批请求。
8. owner 打开 `snow-base` Admin -> `部署` -> `审批列表`，核对 `projectSlug=blog`、`target=site`、commit SHA 和 GitHub run 来源后批准或拒绝。
9. 审批通过后，workflow 消费该审批并执行 Vercel production prebuilt deploy。
10. 部署完成后访问生产站点，记录脱敏验证结论。

审批绑定：

```text
projectSlug=blog
target=site
commitSha=<40 位 Git commit SHA>
```

CI 失败、取消、超时或无法确认成功时，生产部署 job 不得进入 Vercel production deploy。审批被拒绝、过期、超时、已消费或字段不匹配时，workflow 必须在生产发布前失败。审批已消费后如果后续部署失败，下一次发布必须重新发起 workflow 和审批。

## GitHub Environment Secrets

GitHub repository 的 `production` environment 需要配置：

- `DEPLOY_APPROVAL_TOKEN`：来自 `snow-base` Admin 的 deployment approval service token，只包含 `deployments:request` 和 `deployments:verify` scope。
- `VERCEL_TOKEN`：用于从 GitHub Actions 发布当前 Vercel 项目。
- `VERCEL_ORG_ID`：Vercel org 或 team 标识。
- `VERCEL_PROJECT_ID`：Vercel project 标识。

`snow build CI` 的 `Production Deploy` job 会在发布前预检这些 secret 名称。缺少任一项时，workflow 会在审批和生产发布前失败，并只输出缺失的 secret 名称，不输出任何 secret 值。

不要把 token 明文、Access cookie/JWT、Authorization header、Vercel token、审批 token、完整带凭证 URL 或生产原始日志写入 Git、sidecar、issue、截图或聊天记录。若平台 token 无法做到严格项目级最小权限，必须通过 GitHub environment、禁用平台自动部署、短 TTL/轮换和审计记录降低风险。

## 平台权限收窄

当前问题：Vercel Git Integration 的默认行为会在连接 Git 仓库后自动为分支 push 创建部署；如果 Production Branch 是 `main`，那么推送到 `main` 可能直接触发 production deployment，从而绕过 `snow-base` Admin 审批。

本仓库在 `vercel.json` 中配置了 `ignoreCommand`：

```json
"ignoreCommand": "node scripts/vercel-ignore-build.mjs"
```

该脚本只信任 Vercel Git 上下文中的系统变量 `VERCEL_GIT_COMMIT_REF`：

```text
VERCEL_GIT_COMMIT_REF=main -> exit 0，跳过 Vercel Git 自动构建
其他分支或非 Vercel Git 上下文 -> exit 1，允许构建继续
```

不要使用自定义非 secret 环境变量作为生产发布放行开关。普通变量不是受控授权通道，容易被其他构建上下文误设；生产发布授权只能来自 `snow-base` Admin 审批和 GitHub Actions production environment secrets。

Vercel 项目仍应在 Dashboard 中关闭、断开或通过项目设置阻断 Git 自动生产部署；仓库内 `ignoreCommand` 是代码侧防线，避免平台设置漂移后 `main` push 绕过审批。常规生产发布只允许 GitHub Actions `snow build CI` 的 `Production Deploy` job 持有部署 secret。

GitHub workflow 使用最小权限：

```yaml
permissions:
  contents: read
```

GitHub `production` environment 至少限制到 `main` 分支，并集中保存生产部署 secret。若仓库启用了 branch protection 或 ruleset，应要求普通 CI 通过后才允许目标 commit 进入发布路径。

本机 `vercel deploy --prod`、Vercel Dashboard 手工发布、临时平台 token 发布、平台 Deploy Hook 直发生产等路径都不是常规发布入口。

## Break-glass

只有 owner 在当前会话明确授权紧急例外，并说明原因、目标 commit、部署目标、验证要求和回滚要求后，才允许使用不经过 `snow build CI` 生产发布路径的发布方式。

break-glass 发布必须记录脱敏发布结论，至少包含：

- 目标 commit；
- 发布目标；
- 授权摘要；
- 实际发布方式；
- 验证结论；
- 是否需要恢复审批链路或轮换 secret。

不能因为本机 Vercel CLI 登录态、平台 Dashboard 可用或 GitHub Actions 暂时不可用，就自行绕过审批。

## 内容更新触发构建

内容仓库的新提交不会自动改变已部署内容。发布流程必须：

1. 获取新内容提交的完整 SHA。
2. 更新部署环境的 `CONTENT_REPO_COMMIT_SHA`。
3. 触发代码项目构建。
4. 在构建日志中确认 `[content] mode=external commit=<sha>`。

Repository Dispatch 或手动 workflow 可以负责第 3 步，但事件负载必须最终转化为一个明确 SHA，不能只传 branch 名。平台 Deploy Hook 不得直接发布生产；如后续启用内容仓库自动触发，应触发受控 `snow build CI` 生产发布路径，并仍通过 full validation 和 `snow-base` 审批。

## 平台配置

Vercel、Netlify 和 Cloudflare Pages 均使用：

- Install Command：`pnpm install --frozen-lockfile`
- Build Command：`pnpm build`
- Output Directory：`dist`
- Node.js：项目支持的 LTS 版本

若平台不允许创建 symlink 或 Windows junction，不能启用外部内容模式；不要改成复制 fallback。

当前生产发布 job 使用 Vercel CLI：

```bash
pnpm dlx vercel@latest pull --yes --environment=production --token "$VERCEL_TOKEN"
pnpm dlx vercel@latest build --prod --yes --token "$VERCEL_TOKEN"
node scripts/verify-deployment-approval.mjs
pnpm dlx vercel@latest deploy --prebuilt --prod --yes --token "$VERCEL_TOKEN"
```

`vercel deploy --prebuilt` 发布的是前一步 `vercel build` 生成的 `.vercel/output`，审批步骤必须位于 full validation 和 `vercel build` 之后、`vercel deploy --prebuilt --prod` 之前。受控 workflow 不依赖 `ignoreCommand` 的自定义放行变量；它通过 Vercel CLI 的 prebuilt deploy 通道发布已构建产物。

## 故障排查

先单独执行：

```bash
pnpm content:prepare
```

然后根据错误检查配置、权限、SHA 可达性和目录结构。构建成功但内容版本不符合预期时，以日志中的 commit SHA 为准，并与部署变量比较。

认证错误日志不得回传 token、Authorization header、私钥或完整的带凭证 URL。
