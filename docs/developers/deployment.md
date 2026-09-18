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

workflow dispatch 的 `mode` 有三种，手动 dispatch 默认选 `candidate`：

- `candidate`：由 snow-base deployment intent 内部 dispatch，在 exact `main` commit 上完成 CI 和 Vercel prebuilt build，上传并重新下载到临时目录，通过 `scripts/normalize-vercel-artifact.mjs` 恢复为 `.vercel/output`，计算 post-round-trip digest，并通过固定 SHA 的公开 deployment approval Action 登记 `project=blog`、`target=site`、`artifactType=vercel-prebuilt` 的 v2 candidate，再回写 Candidate Run。该模式不部署生产。
- `selected-artifact`：由 snow-base Admin 传入已选 artifact 的 id、digest、GitHub run/name 和 request id。workflow 只下载并复算该 artifact，等待/消费对应审批，然后执行 Vercel prebuilt deploy；审批后不重新 build。
- `legacy-break-glass`：保留的旧 bearer 手动发布路径。只有 owner 在 GitHub Actions 手动选择此 mode，并填写 `break_glass_reason` 后才会进入；仍要求 full validation、构建产物 handoff、digest 校验、`production` Environment gate 和 owner approval。

`candidate` 和 `selected-artifact` 是由控制面调用的内部 workflow mode，不是用户必须按顺序手工执行的两个发布步骤。一次 Admin deployment intent 会在控制面内部复用或创建 candidate、绑定 artifact、等待 owner approval，再 dispatch selected-artifact。两种 mode 都 fail closed 校验 `blog/site` 的 project/target、exact commit、GitHub artifact identity 和 digest；selected-artifact 会 checkout Admin 指定的 `commit_sha`，而不是当前 workflow 事件的默认 branch HEAD。blog workflow 不接受 API、D1、R2 或 Worker Version 输入，也不 dispatch `snow-base/api` workflow。

candidate workflow 会在验证阶段回报 `in_progress`，在 artifact 登记后回报 `completed`；部署 workflow 会在 Vercel deploy 前由固定 SHA 的公开 deployment approval Action 回报 deployment run `in_progress`，部署完成后由 `scripts/report-deployment-run.mjs` 调用 `/api/v1/deployments/runs/update`，只接受响应中的精确 deployment run ID 并输出给后续 smoke。成功部署后使用该 ID 执行 `/` 和 `/robots.txt` 公开 smoke，再调用 `/api/v1/deployments/integration-evidence/smoke` 写入 run-bound evidence；smoke 或 evidence 失败时 workflow 失败。除 deployment run ID 外，这些 contract preflight、artifact registration、Candidate callback 和 selected-artifact approval request/wait/consume 都由固定 SHA 的公开 deployment approval Action 承接。每次回报都传递 request id、project、target、commit、GitHub run URL，以及 candidate/deployment artifact 的精确 id 和 digest；不得使用 request id 或 GitHub workflow run id 推导 deploymentRunId。

若一次业务需求同时修改 blog 与 `snow-base/api`，两者仍由 snow-base Admin 分别发起、审批、dispatch、验证和记录。可以在需求或审计记录中引用同一个业务编号，但 blog workflow 不实现联合 manifest、联合 approval、组件消费或 partial-success 状态，也不因此获得 API 部署权限。

## 生产部署流程

`snow build CI` workflow 的 `workflow_dispatch` 是唯一常规生产发布入口：

1. owner 确认目标 commit 已经在 `origin/main`，并且需要发布。
2. 在 snow-base Admin 选择已验证的 `blog/site` candidate；Admin 会以 `mode=selected-artifact`、精确的 artifact identity、`commit_sha` 和 `request_id` dispatch 本 workflow。仅在需要兼容旧路径时，才在 GitHub Actions 手动运行 `snow build CI`，目标分支选择 `main`，显式选择 `mode=legacy-break-glass` 并填写 `break_glass_reason`。未显式选择 legacy mode 时使用默认 `candidate`，不会部署生产。
3. workflow 强制选择 full validation，执行 Agent Workspace、Markdown、ESLint、Design、Astro、TypeScript、Unit、Integration、完整 Playwright E2E 和完整生产构建。
4. `CI Summary` job 汇总所有验证 job；任何失败、取消或未知结果都会阻止生产发布。
5. candidate/legacy-break-glass 模式的 `Build Vercel Artifact` job 校验当前 commit 等于 `origin/main`，预检 Vercel production secrets，拉取 Vercel production 项目设置，并用 Vercel CLI 生成 `.vercel/output` prebuilt 输出；selected-artifact 模式不运行该 job。
6. workflow 通过 GitHub Actions artifact 上传 `.vercel/output`，保留 7 天；`Build Vercel Artifact` 随后下载到临时目录，并通过 `scripts/normalize-vercel-artifact.mjs` 识别实际 artifact root，归一化为 `.vercel/output/config.json`。
7. workflow 对重新下载后的 `.vercel/output` 使用固定的 GNU tar canonical command 计算 `sha256:` digest，作为本次待部署 Vercel prebuilt artifact 的不可变摘要。该命令固定排序、时间、owner/group、权限和 tar 格式，排除 artifact 往返造成的元数据差异。
8. `Production Deploy` job 下载该 GitHub Actions artifact 到临时目录，使用同一个归一化脚本恢复 `.vercel/output`，再用完全相同的 canonical command 复算 digest，并要求它与 `Build Vercel Artifact` 输出的 digest 完全一致。
9. candidate 模式登记 artifact 后停止，owner 在 `snow-base` Admin 的部署产物/候选列表中选择它；selected-artifact 模式复用该 immutable identity，使用当前 v2 artifact-bound approval 协议。
10. owner 在 `snow-base` Admin 核对 `projectSlug=blog`、`target=site`、commit SHA、Vercel prebuilt artifact digest、candidate run 和当前 selected run URL 后批准或拒绝；Admin 以 `request_id` 和 workflow `run-name` 进行对账。
11. selected-artifact 在审批通过后消费普通审批，并且只用下载且 digest 校验通过的 `.vercel/output` 执行 Vercel production prebuilt deploy；部署失败时不得报告成功，下一次发布必须重新发起审批。
12. 部署完成后由 workflow 回写 `/api/v1/deployments/runs/update`，只接受响应中的精确
    `data.id` 作为 `deploymentRunId`；没有该 ID 时不得继续后续 smoke。
13. 仅在 Vercel 部署成功后访问生产站点首页和 `/robots.txt`，再将成功或带脱敏
    `failureCode` 的失败结果写入 `/api/v1/deployments/integration-evidence/smoke`。smoke 或 evidence
    回写失败时 workflow 失败，不报告成功。成功 evidence 不携带 `failureCode`；真实 smoke 失败使用
    `public_smoke_http_status`、`public_smoke_marker_missing` 或 `public_smoke_request_failed`，跳过使用
    `smoke_skipped`，deployment workflow 或 deployment run 回写失败使用 `deployment_workflow_failed`。

审批绑定：

```text
projectSlug=blog
target=site
commitSha=<40 位 Git commit SHA>
artifactType=vercel-prebuilt
artifactDigest=sha256:<.vercel/output digest>
```

当前 `blog/site` 目标按 `snow-base` 部署审批接入规范使用 `v2` artifact-bound approval：审批和消费同时绑定 `projectSlug`、`target`、`commitSha` 和 Vercel prebuilt artifact digest。candidate 和 selected-artifact 的 contract 调用统一使用 `whynotsnow/snow-base-deployment-approval-action@76c3396eaa0635ef8de2c8668b77d939a292cbac`；selected-artifact 先按同一 artifact identity 复用/请求 approval，再等待并消费该 approval，不重新创建第二份产物或审批。selected-artifact 对 v2 artifact 登记和审批接口 fail closed，不能回退到 v1.1；仅保留的 legacy/break-glass `production` 模式允许兼容旧接口行为。

当前 workflow 使用 GitHub Actions artifact handoff 解耦构建验证和部署：`Build Vercel Artifact` job 是唯一会执行 `vercel build --prod` 的生产产物 job，并以 artifact 上传/下载往返后、经 `scripts/normalize-vercel-artifact.mjs` 归一化的目录表示产出 digest；`Production Deploy` job 不运行构建、不运行测试，只下载已上传的 artifact、归一化为 `.vercel/output`、使用同一 canonical tar command 复算、等待 snow-base Admin 审批，并执行 `vercel deploy --prebuilt --prod`。上传前目录的 digest 不属于 candidate identity，因为 GitHub artifact 往返可能规范化文件元数据或目录层级。

CI 失败、取消、超时或无法确认成功时，生产部署 job 不得进入 Vercel production deploy。审批被拒绝、过期、超时、已消费、artifact digest 不一致、下载 artifact 缺少 `.vercel/output/config.json` 或字段不匹配时，workflow 必须在生产发布前失败。审批已消费后如果后续部署失败，下一次发布必须重新发起 workflow 和审批。

若业务需求同时涉及 `snow-base/api`，blog 侧只记录自己的 selected run、Vercel deployment、站点可访问性、关键静态路由和实际调用 API 的代表性链路；API 侧由 snow-base Admin 单独记录自己的 run 与 endpoint smoke。两侧可引用同一业务需求编号，但不共享部署成功状态。

## GitHub Environment 配置

GitHub repository 的 `production` environment 需要配置以下 secrets/variables：

- `DEPLOY_APPROVAL_TOKEN`（secret）：现有 legacy/break-glass deployment service token。普通 Candidate、selected-artifact、artifact promotion、smoke evidence 和 backfill 路径已改用下列独立 exchange Credential；selected-artifact 不再读取或校验该 token。该 token 在 rollback window 内保留，不在本次迁移中删除或撤销。只有手动选择 `mode=legacy-break-glass` 的 job 才能通过显式 `DEPLOY_APPROVAL_WORKFLOW_MODE=legacy-break-glass` 使用它；该 job 仍要求非空 `break_glass_reason`、`production` Environment gate 和 owner approval，直到 rollback 验证、迁移后 smoke 与 owner 确认完成。
- `SNOW_BASE_DEPLOYMENT_APPROVAL_CREDENTIAL_ID`（variable）：Snow Admin 中 `blog-production-deployment-approval` Service Credential ID。该 Credential 只授予 `deployments:request` 和 `deployments:verify`，用于 contract、artifact registration、approval request/status 和 approval consume。
- `SNOW_BASE_DEPLOYMENT_APPROVAL_EXCHANGE_SECRET`（secret）：上述 approval Credential 的 exchange secret。workflow 在每个短操作前重新换取约 10 分钟有效的 Bearer token；轮询 approval 时也按次轮换，避免 15 分钟等待跨越 token TTL。
- `SNOW_BASE_DEPLOYMENT_RUN_CREDENTIAL_ID`（variable）：Snow Admin 中专用于 Blog deployment run callback 的 Service Credential ID。该 Credential 只授予 `deployments:run-update`。
- `SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET`（secret）：上述 Service Credential 的 exchange secret。Reporter 每次 callback 使用它向 `/api/v1/service/exchange/token` 申请单一 `deployments:run-update`、约 10 分钟有效的短效 token，然后调用 `/api/v1/deployments/runs/update`。
- `SNOW_BASE_DEPLOYMENT_PROMOTION_CREDENTIAL_ID`（variable）：Snow Admin 中 `blog-production-deployment-promotion` Service Credential ID。该 Credential 只授予 `deployments:artifact-promote`，用于 selected-artifact promotion 和历史 backfill。
- `SNOW_BASE_DEPLOYMENT_PROMOTION_EXCHANGE_SECRET`（secret）：上述 promotion Credential 的 exchange secret。promotion 客户端在 multipart init、part upload 和 complete 前按请求换取短效 token。
- `VERCEL_TOKEN`：用于从 GitHub Actions 发布当前 Vercel 项目。
- `VERCEL_ORG_ID`：Vercel org 或 team 标识。
- `VERCEL_PROJECT_ID`：Vercel project 标识。

`snow build CI` 的 selected-artifact job 会在请求/消费审批前预检 modern exchange Credential、exchange secret 和 Vercel secret 的存在和格式；legacy `DEPLOY_APPROVAL_TOKEN` 不在该 preflight 范围内。缺少任一 modern 项时，workflow 会失败并只输出缺失或格式无效的变量/secret 名称，不输出任何 secret 值。exchange 响应还必须验证 `snow-service` principal、唯一 capability 和约 10 分钟 TTL；不符合时 fail closed。历史 artifact backfill workflow 固定以 `historical-backfill` mode 使用 `deployments:artifact-promote` Exchange；exchange 缺失或失败会停止任务，不会回退 `DEPLOY_APPROVAL_TOKEN`。GitHub Actions artifact 和 candidate `expiresAt` 当前统一为 7 天；Admin 选择和 dispatch 必须在 candidate 过期前完成。

不要把 token 明文、Access cookie/JWT、Authorization header、Vercel token、审批 token、完整带凭证 URL 或生产原始日志写入 Git、sidecar、issue、截图或聊天记录。GitHub Actions artifact 下载只使用 `GITHUB_TOKEN`，不向 Blog Credential 增加 `deployments:artifact-download`。若平台 token 无法做到严格项目级最小权限，必须通过 GitHub environment、禁用平台自动部署、短 TTL/轮换和审计记录降低风险。

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
actions/upload-artifact -> actions/download-artifact -> scripts/normalize-vercel-artifact.mjs -> .vercel/output
tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner --mode=0644 --format=gnu -cf - -C .vercel output | sha256sum | awk '{print $1}'
whynotsnow/snow-base-deployment-approval-action@76c3396eaa0635ef8de2c8668b77d939a292cbac (contract / register-artifact / request-approval / consume-approval / candidate-callback)
scripts/wait-deployment-approval.mjs (按轮询重新 exchange approval token，并校验完整 artifact identity)
pnpm dlx vercel@latest deploy --prebuilt --prod --yes --token "$VERCEL_TOKEN"
```

`Build Vercel Artifact` job 还会从 exact `.vercel/output` 生成固定规则的
`vercel-output.tar.gz` 与 `vercel-output-metadata.json`，并和部署所需的 `.vercel/output` 一起上传。
该上传步骤显式设置 `actions/upload-artifact@v4` 的 `compression-level: 0`，以 ZIP store 模式
封装 prebuilt files 和已压缩的 canonical archive。这是 central streaming contract 的性能与内存边界：
中央按流选取 canonical archive，避免额外 ZIP deflate/inflate 的 CPU 与缓冲开销；不改变 source
artifact digest 或 archive digest，只改变外层 ZIP 的编码与大小。容量限制仍需覆盖完整 ZIP，不能只按
内嵌 gzip 大小估算。
按 exact artifact ID 下载时必须设置 `merge-multiple: true`，让 gzip、metadata 与 `.vercel/output`
直接位于指定下载根目录。否则 `download-artifact@v4` 会增加 artifact-name 子目录，即使只有一个 ID；
output normalization 的递归查找会成功，但严格根目录 archive 复验会 fail closed。该设置只统一解包
路径，不放宽 artifact ID 选择或 digest/metadata 校验。
archive 使用 GNU tar 的 name sort、epoch mtime、numeric owner/group、0644 mode 与 gzip `-n -9`；
source artifact digest 和 archive SHA-256 都登记在 artifact metadata 中。常规 selected-artifact
workflow 下载并复验同一个 GitHub Artifact 后，按 `wait approval -> multipart promotion -> consume
approval -> deployment callback -> vercel deploy` 顺序运行。blog runner 使用
`scripts/promote-deployment-artifact.mjs` 将已复验的同一 `vercel-output.tar.gz` 分片上传：先以 artifact
ID、source/archive digest、archive size、`selected-production` purpose 和 approval ID 初始化，再按服务端
返回的 part size 上传各 part，最后以相同 identity 和 part count 完成归档。当前契约每片上限为 8 MiB、
最多 64 片；客户端仍以 init 响应为准并在超限时 fail closed。只有 complete 返回
`archiveStatus=promoted`，或 init 返回 identity-exact 的 promoted reuse，workflow 才能消费 approval。
blog 不持有 R2/D1 权限，也不在 promotion 后重新构建。任何 identity、digest、size、part、approval 或
complete 校验失败都会停止消费 approval 和 Vercel 部署。

`.github/workflows/backfill-vercel-artifacts.yml` 是独立的历史补档入口，只能通过
`workflow_dispatch` 在 `main` 上显式运行。一次必须提供一个完整 slot，可选第二个；每个 slot 包含中央
artifact ID、已登记 source digest、exact GitHub run ID 和 exact GitHub artifact ID。workflow 逐个下载
legacy artifact、normalize `.vercel/output`、重建并复验 deterministic canonical archive，再以
`historical-backfill` purpose 执行同一 multipart promotion。它不会扫描历史记录，也不 request、wait、
consume approval 或执行 deploy；snow-base 只允许已有成功 deployment run 和 used approval 的同一
artifact identity 进入该 purpose。

大 ZIP 的 normalize、tar/gzip 和 SHA-256 工作必须留在 GitHub runner。不要恢复由 Cloudflare Free-plan
Worker 下载 raw ZIP、转换 archive 或整包缓冲大 gzip 的路径，也不要依赖 Paid plan 的 `limits.cpu_ms`
扩容来掩盖该边界。

生产 artifact/digest 只使用 GitHub Ubuntu runner 上的 GNU tar canonical path。macOS 本地缺少
GNU tar 时，archive fixture 会使用 deterministic portable ustar writer 复验内容与 metadata；该
fallback 不会生成生产 Candidate，也不属于生产 digest contract。

保留的 legacy/break-glass `legacy-break-glass` job 才使用
`node scripts/verify-deployment-approval.mjs` 兼容旧接口，并显式设置
`DEPLOY_APPROVAL_WORKFLOW_MODE=legacy-break-glass`；它不是 selected-artifact 的常规入口，也不是手动 dispatch 默认值。
`promote-deployment-artifact.mjs` 与 `report-deployment-smoke.mjs` 的旧 token fallback 同样只在显式
`legacy-break-glass` mode 下可用；selected-artifact 和 historical-backfill 必须提供完整的 exchange Credential 配置，
缺失时 fail closed，不得静默回退旧 token。旧 token 只能作为 owner 记录
`break_glass_reason` 后的人工 rollback 手段，不能由 modern workflow 自动 fallback。
受控 workflow 不依赖 `ignoreCommand` 的自定义放行变量；它通过 Vercel CLI 的 prebuilt deploy 通道
发布已构建产物。

## 故障排查

先单独执行：

```bash
pnpm content:prepare
```

然后根据错误检查配置、权限、SHA 可达性和目录结构。构建成功但内容版本不符合预期时，以日志中的 commit SHA 为准，并与部署变量比较。

认证错误日志不得回传 token、Authorization header、私钥或完整的带凭证 URL。
