# 内容仓库更新触发构建

外部内容仓库的新提交不会自动改变部署。触发事件必须携带要发布的完整 commit SHA，代码仓库不能在构建时重新解析 branch 或远端 HEAD。

## Repository Dispatch

内容仓库可以在提交后向代码仓库发送 `repository_dispatch`。事件负载至少包含当前 SHA：

```yaml
- name: Trigger site build
  env:
    GH_TOKEN: ${{ secrets.DISPATCH_TOKEN }}
    SITE_REPOSITORY: example/blog
    CONTENT_SHA: ${{ github.sha }}
  run: >-
    gh api repos/$SITE_REPOSITORY/dispatches
    --method POST
    --field event_type=content-updated
    --field client_payload[content_sha]=$CONTENT_SHA
```

`DISPATCH_TOKEN` 必须保存在内容仓库的 Actions Secret 中。使用满足目标仓库 dispatch 权限的最小权限 token，不要把 token 写进 workflow、日志或文档示例值。

## 代码仓库消费事件

部署 workflow 需要显式监听事件，并把 payload 写入内容准备环境。生产发布仍必须走受控 `snow build CI` 生产发布路径，并在 full validation 成功、真正部署前通过 `snow-base` Admin 审批；不要让内容仓库直接调用平台 Deploy Hook 或依赖 Vercel Git 自动部署发布生产。

```yaml
on:
  repository_dispatch:
    types: [content-updated]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      ENABLE_CONTENT_SYNC: "true"
      CONTENT_REPO_URL: ${{ secrets.CONTENT_REPO_URL }}
      CONTENT_REPO_COMMIT_SHA: ${{ github.event.client_payload.content_sha }}
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

当前项目 CI 明确设置 `ENABLE_CONTENT_SYNC=false`。正式启用 dispatch 前，需要把目标 build job 改为上述 external 配置；不要同时保留 workflow 级别的 `false` 覆盖。

如果该 dispatch 目标是生产部署，workflow 还必须保留完整 CI 与部署审批步骤：

```yaml
- name: Compute canonical Vercel artifact digest
  run: |
    node scripts/normalize-vercel-artifact.mjs .artifact-download .vercel/output
    digest="sha256:$(tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner --mode=0644 --format=gnu -cf - -C .vercel output | sha256sum | awk '{print $1}')"
    echo "DEPLOY_APPROVAL_ARTIFACT_DIGEST=${digest}" >> "$GITHUB_ENV"

- name: Preflight deployment approval contract
  uses: whynotsnow/snow-base-deployment-approval-action@c87a2dc06f9c5b20b6d29e48ebd6294cecb704d1
  with:
    operation: contract
    token: ${{ secrets.DEPLOY_APPROVAL_TOKEN }}
    project-slug: blog
    target: site
```

审批通过后才允许执行平台 production deploy。实际的 `snow build CI` selected-artifact 路径还会用同一固定 SHA 的 Action 完成 artifact-bound approval request/wait/consume 和 deployment callback；dispatch payload 中的 content SHA 只决定内容版本，不替代代码仓库 commit 和 Vercel prebuilt artifact digest 的部署审批。

仓库内 `vercel.json` 已配置 `ignoreCommand`，当 Vercel Git 自动构建来自 `main` 分支时跳过构建。受控发布 workflow 不使用自定义非 secret 变量放行，而是在本仓库完成 full validation、通过 `snow-base` 审批后，用 Vercel CLI prebuilt deploy 发布。

## 验证

1. 在内容仓库推送一次提交。
2. 确认 dispatch payload 中的 SHA 是 40 位完整值。
3. 确认代码仓库 build job 被触发。
4. 在构建日志中确认 `[content] mode=external commit=<sha>` 与 payload 一致。

如果触发成功但构建失败，应修复权限、SHA 可达性或目录结构。不要改成跟随 HEAD，也不要添加同步失败回退。

更多部署约束见 [部署指南](./deployment.md#内容更新触发构建)。
