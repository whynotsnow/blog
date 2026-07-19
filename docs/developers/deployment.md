# 部署指南

项目输出 Astro 静态站点。所有平台使用相同构建命令：

```bash
pnpm install --frozen-lockfile
pnpm build
```

构建产物位于 `dist`。

## 默认本地内容部署

当前项目和 CI 明确使用仓库内内容：

```bash
ENABLE_CONTENT_SYNC=false
```

不需要内容仓库权限。`pnpm build` 会先输出 `[content] mode=local`，再执行 Anime 数据准备、Astro build、Pagefind 和字体处理。

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

GitHub Actions 当前在 workflow 级别设置 `ENABLE_CONTENT_SYNC=false`。未来启用外部模式时，需要同时修改该值并通过 Secrets/Variables 注入 URL 和 SHA。

外部模式下，以下任一问题都会让 CI 失败：

- URL 或 SHA 缺失、格式错误。
- 远端认证或 SHA fetch 失败。
- checkout 的实际 HEAD 与配置 SHA 不一致。
- `posts`、`spec`、`data`、`images` 任一目录缺失或非法。
- release 提升、managed link 或 current 指针切换失败。

构建没有同步失败回退。只有明确的 `ENABLE_CONTENT_SYNC=false` 本地模式才使用仓库内内容。

## 内容更新触发构建

内容仓库的新提交不会自动改变已部署内容。发布流程必须：

1. 获取新内容提交的完整 SHA。
2. 更新部署环境的 `CONTENT_REPO_COMMIT_SHA`。
3. 触发代码项目构建。
4. 在构建日志中确认 `[content] mode=external commit=<sha>`。

Repository Dispatch、平台 Deploy Hook 或手动 workflow 都可以负责第 3 步，但事件负载必须最终转化为一个明确 SHA，不能只传 branch 名。

## 平台配置

Vercel、Netlify 和 Cloudflare Pages 均使用：

- Install Command：`pnpm install --frozen-lockfile`
- Build Command：`pnpm build`
- Output Directory：`dist`
- Node.js：项目支持的 LTS 版本

若平台不允许创建 symlink 或 Windows junction，不能启用外部内容模式；不要改成复制 fallback。

## 故障排查

先单独执行：

```bash
pnpm content:prepare
```

然后根据错误检查配置、权限、SHA 可达性和目录结构。构建成功但内容版本不符合预期时，以日志中的 commit SHA 为准，并与部署变量比较。

认证错误日志不得回传 token、Authorization header、私钥或完整的带凭证 URL。
