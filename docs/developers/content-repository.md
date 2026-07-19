# 内容仓库结构

外部内容仓库是可选能力。当前项目默认使用代码仓库内的本地内容；只有明确启用同步时才读取外部仓库。

## 必需目录

```text
blog-content/
  posts/
  spec/
  data/
  images/
  README.md
```

四个目录全部必需，并且必须是真实目录：

| 目录 | 激活位置 | 内容 |
| --- | --- | --- |
| `posts` | `src/content/posts` | Markdown 文章及文章局部资源。 |
| `spec` | `src/content/spec` | 关于、友链等特殊页面内容。 |
| `data` | `src/data` | timeline、projects、skills、anime 等 TypeScript 数据。 |
| `images` | `public/images` | 文章、相册、日记等公共图片。 |

目录可以为空，但不能缺失，也不能使用顶层符号链接指向 checkout 外部。

## 发布一个内容版本

在内容仓库完成并提交修改：

```bash
git add posts spec data images
git commit -m "content: update articles"
git push
git rev-parse HEAD
```

将最后输出的完整 SHA 配置为代码仓库或部署环境中的 `CONTENT_REPO_COMMIT_SHA`。构建不会跟随远端 HEAD；发布新内容必须显式更新 SHA 并触发新构建。

## 连接项目

```bash
ENABLE_CONTENT_SYNC=true
CONTENT_REPO_URL=https://github.com/example/blog-content.git
CONTENT_REPO_COMMIT_SHA=0123456789abcdef0123456789abcdef01234567
CONTENT_DIR=./content
```

然后运行：

```bash
pnpm content:prepare
pnpm build:astro
```

成功日志会包含实际使用的内容 commit SHA。相同 SHA 再次准备时会复用已验证 release。

## 私有仓库

本地开发推荐使用 SSH agent；CI 和托管平台使用 Secret 注入的凭证。不要把 token、私钥或带凭证的真实 URL 写入 `.env.example`、文档或提交历史。

外部内容只支持 pinned 独立仓库模式，不支持 Git Submodule、branch/tag 自动跟随或本地/外部目录混用。
