# 部署指南

项目输出 Astro 静态站点。常规生产部署必须由 `snow-base` Admin 选择 `blog/site` candidate 并 dispatch GitHub Actions `snow build CI` 的 `selected-artifact` 路径，在完整 CI 校验、Vercel prebuilt 产物 digest 校验和 artifact-bound approval 后发布。不要从本机、Vercel Dashboard 或平台 Git 自动部署入口直接发布生产。

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
- `workflow_dispatch` 且分支为 `main` 时，只有 `ci-summary` 确认所有选中验证 job 成功后，才会进入候选产物登记或生产部署 job。
- production secrets 只在 production environment 下的候选登记和 selected/兼容生产部署 job 中使用，不暴露给 PR、push 或 schedule 验证 job。

外部模式下，以下任一问题都会让 CI 失败：

- URL 或 SHA 缺失、格式错误。
- 远端认证或 SHA fetch 失败。
- checkout 的实际 HEAD 与配置 SHA 不一致。
- `posts`、`spec`、`data`、`images` 任一目录缺失或非法。
- release 提升、managed link 或 current 指针切换失败。

构建没有同步失败回退。只有明确的 `ENABLE_CONTENT_SYNC=false` 本地模式才使用仓库内内容。

## snow-base Admin 管理的部署流程

当前 blog/site 的生产部署由 `snow-base` Admin 发起和控制。blog 仓库是站点执行面，不负责管理或部署 `snow-base/api`；blog 的 GitHub Environment secret 只允许站点 workflow 使用。

workflow dispatch 的 `mode` 有三种：

- `candidate`：在 exact `main` commit 上完成 CI 和 Vercel prebuilt build，上传 `.vercel/output`，计算 digest，并通过 `scripts/register-deployment-artifact.mjs` 登记 `project=blog`、`target=site`、`artifactType=vercel-prebuilt` 的 v2 candidate。该模式不部署生产。
- `selected-artifact`：由 snow-base Admin 传入已选 artifact 的 id、digest、GitHub run/name 和 request id。workflow 只下载并复算该 artifact，等待/消费对应审批，然后执行 Vercel prebuilt deploy；审批后不重新 build。
- `production`：保留的 legacy/break-glass 手动发布路径，仍要求 full validation、构建产物 handoff、digest 校验和 owner approval，并且必须提供 `break_glass_reason`。

`candidate` 和 `selected-artifact` 必须使用 `main`，并 fail closed 校验 `blog/site` 的 project/target、exact commit、GitHub artifact identity 和 digest。selected-artifact 会 checkout Admin 指定的 `commit_sha`，而不是当前 workflow 事件的默认 branch HEAD；blog workflow 不接受 API、D1、R2 或 Worker Version 输入，也不 dispatch `snow-base/api` workflow。

若一次业务需求同时修改 blog 与 `snow-base/api`，两者仍由 snow-base Admin 分别发起、审批、dispatch、验证和记录。可以在需求或审计记录中引用同一个业务编号，但 blog workflow 不实现联合 manifest、联合 approval、组件消费或 partial-success 状态，也不因此获得 API 部署权限。

## 生产部署流程

`snow build CI` workflow 的 `workflow_dispatch` 是唯一常规生产发布入口：

1. owner 确认目标 commit 已经在 `origin/main`，并且需要发布。
2. 在 snow-base Admin 选择已验证的 `blog/site` candidate；Admin 会以 `mode=selected-artifact`、精确的 artifact identity、`commit_sha` 和 `request_id` dispatch 本 workflow。仅在需要兼容旧路径时，才在 GitHub Actions 手动运行 `snow build CI`，目标分支选择 `main`，保持 `mode=production` 并填写 `break_glass_reason`。
3. workflow 强制选择 full validation，执行 Agent Workspace、Markdown、ESLint、Design、Astro、TypeScript、Unit、Integration、完整 Playwright E2E 和完整生产构建。
4. `CI Summary` job 汇总所有验证 job；任何失败、取消或未知结果都会阻止生产发布。
5. candidate/production 模式的 `Build Vercel Artifact` job 校验当前 commit 等于 `origin/main`，预检 Vercel production secrets，拉取 Vercel production 项目设置，并用 Vercel CLI 生成 `.vercel/output` prebuilt 输出；selected-artifact 模式不运行该 job。
6. workflow 对 `.vercel/output` 计算 `sha256:` digest，作为本次待部署 Vercel prebuilt artifact 的不可变摘要。
7. workflow 通过 GitHub Actions artifact 上传 `.vercel/output`，保留 7 天。
8. `Production Deploy` job 下载该 GitHub Actions artifact 到 `.vercel/output`，复算 digest，并要求它与 `Build Vercel Artifact` 输出的 digest 完全一致。
9. candidate 模式登记 artifact 后停止，owner 在 `snow-base` Admin 的部署产物/候选列表中选择它；selected-artifact 模式复用该 immutable identity，使用当前 v2 artifact-bound approval 协议。
10. owner 在 `snow-base` Admin 核对 `projectSlug=blog`、`target=site`、commit SHA、Vercel prebuilt artifact digest、candidate run 和当前 selected run URL 后批准或拒绝；Admin 以 `request_id` 和 workflow `run-name` 进行对账。
11. selected-artifact 在审批通过后消费普通审批，并且只用下载且 digest 校验通过的 `.vercel/output` 执行 Vercel production prebuilt deploy；部署失败时不得报告成功，下一次发布必须重新发起审批。
12. 部署完成后访问生产站点，记录脱敏验证结论。

审批绑定：

```text
projectSlug=blog
target=site
commitSha=<40 位 Git commit SHA>
artifactType=vercel-prebuilt
artifactDigest=sha256:<.vercel/output digest>
```

当前 `blog/site` 目标按 `snow-base` 部署审批接入规范使用 `v2` artifact-bound approval：审批和消费同时绑定 `projectSlug`、`target`、`commitSha` 和 Vercel prebuilt artifact digest。candidate 通过 `scripts/register-deployment-artifact.mjs` 登记，selected-artifact 复用该 immutable identity。selected-artifact 对 v2 artifact 登记和审批接口 fail closed，不能回退到 v1.1；仅保留的 legacy/break-glass `production` 模式允许兼容旧接口行为。

当前 workflow 使用 GitHub Actions artifact handoff 解耦构建验证和部署：`Build Vercel Artifact` job 是唯一会执行 `vercel build --prod` 的生产产物 job；`Production Deploy` job 不运行构建、不运行测试，只下载已上传的 `.vercel/output`、复算 digest、等待 snow-base Admin 审批，并执行 `vercel deploy --prebuilt --prod`。

CI 失败、取消、超时或无法确认成功时，生产部署 job 不得进入 Vercel production deploy。审批被拒绝、过期、超时、已消费、artifact digest 不一致、下载 artifact 缺少 `.vercel/output/config.json` 或字段不匹配时，workflow 必须在生产发布前失败。审批已消费后如果后续部署失败，下一次发布必须重新发起 workflow 和审批。

若业务需求同时涉及 `snow-base/api`，blog 侧只记录自己的 selected run、Vercel deployment、站点可访问性、关键静态路由和实际调用 API 的代表性链路；API 侧由 snow-base Admin 单独记录自己的 run 与 endpoint smoke。两侧可引用同一业务需求编号，但不共享部署成功状态。

## GitHub Environment Secrets

GitHub repository 的 `production` environment 需要配置：

- `DEPLOY_APPROVAL_TOKEN`：来自 `snow-base` Admin 的 deployment approval service token。blog standalone 路径只使用 `deployments:request`、`deployments:verify`；该 token 不包含 `deployments:run-update`，也不包含 Cloudflare、Worker、D1、R2 或 snow-base API 部署权限。
- `VERCEL_TOKEN`：用于从 GitHub Actions 发布当前 Vercel 项目。
- `VERCEL_ORG_ID`：Vercel org 或 team 标识。
- `VERCEL_PROJECT_ID`：Vercel project 标识。

`snow build CI` 的生产 jobs 会在发布前预检这些 secret 名称。缺少任一项时，workflow 会在审批和生产发布前失败，并只输出缺失的 secret 名称，不输出任何 secret 值。GitHub Actions artifact 和 candidate `expiresAt` 当前统一为 7 天；Admin 选择和 dispatch 必须在 candidate 过期前完成。

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
  actions: read
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
tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner -cf - -C .vercel output | sha256sum
actions/upload-artifact -> actions/download-artifact
tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner -cf - -C .vercel output | sha256sum
node scripts/verify-deployment-approval.mjs
pnpm dlx vercel@latest deploy --prebuilt --prod --yes --token "$VERCEL_TOKEN"
```

`vercel deploy --prebuilt` 发布的是 `Build Vercel Artifact` job 生成、上传，并由 `Production Deploy` job 下载且复算 digest 一致的 `.vercel/output`。审批步骤必须位于 full validation、`vercel build`、artifact upload/download 和 digest 校验之后、`vercel deploy --prebuilt --prod` 之前。digest 只是审批对象的一部分，不替代 owner approval。受控 workflow 不依赖 `ignoreCommand` 的自定义放行变量；它通过 Vercel CLI 的 prebuilt deploy 通道发布已构建产物。

## 故障排查

先单独执行：

```bash
pnpm content:prepare
```

然后根据错误检查配置、权限、SHA 可达性和目录结构。构建成功但内容版本不符合预期时，以日志中的 commit SHA 为准，并与部署变量比较。

认证错误日志不得回传 token、Authorization header、私钥或完整的带凭证 URL。
