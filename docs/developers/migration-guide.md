# 内容分离迁移指南

本指南描述本地内容与 pinned 外部内容仓库之间的迁移。迁移前先提交或备份两个仓库中的有效修改。

## 从本地内容迁移到外部仓库

1. 创建包含 `posts`、`spec`、`data`、`images` 四个目录的内容仓库。
2. 复制当前内容：

   ```bash
   cp -R src/content/posts/. /path/to/blog-content/posts/
   cp -R src/content/spec/. /path/to/blog-content/spec/
   cp -R src/data/. /path/to/blog-content/data/
   cp -R public/images/. /path/to/blog-content/images/
   ```

3. 在内容仓库提交并推送，记录 `git rev-parse HEAD` 返回的完整 SHA。
4. 在代码项目的本地 `.env` 中配置：

   ```bash
   ENABLE_CONTENT_SYNC=true
   CONTENT_REPO_URL=https://github.com/example/blog-content.git
   CONTENT_REPO_COMMIT_SHA=0123456789abcdef0123456789abcdef01234567
   CONTENT_DIR=./content
   ```

5. 运行 `pnpm content:prepare`。脚本会先完整准备和校验 release，再备份本地目录并安装受管理链接。
6. 运行 `pnpm build:astro`，确认日志中的 commit SHA 与计划发布的版本一致。

不要手动删除四个本地目录，也不要提交准备流程生成的链接或 `content/` 状态目录。

## 发布后续内容版本

1. 在内容仓库完成提交并推送。
2. 获取新的完整 SHA。
3. 更新部署环境中的 `CONTENT_REPO_COMMIT_SHA`。
4. 触发构建。

准备流程会复用已存在的 release，并通过单一 `current` 指针切换版本。fetch 或校验失败时，当前版本保持不变，但命令和构建仍会失败。

## 切回本地内容

1. 设置 `ENABLE_CONTENT_SYNC=false` 或移除该变量。
2. 运行 `pnpm content:prepare`。
3. 脚本会验证四份本地备份并事务性恢复原目录。
4. 运行 `git status --short`，确认没有意外内容修改。

如果受管理链接或备份只有一部分存在，脚本会拒绝猜测恢复方式。此时保留现场并检查 `CONTENT_DIR/local-backup` 与四个项目路径，不要用递归删除命令清理项目根目录。

## 验证清单

- `ENABLE_CONTENT_SYNC` 只使用小写字符串 `true` 或 `false`。
- URL 和完整 40 位 SHA 均已配置。
- 远端允许获取该 SHA。
- 四个顶层目录完整。
- `CONTENT_DIR` 位于项目根目录内且已被 Git 忽略。
- 运行环境支持 symlink 或 Windows junction。
- `pnpm content:prepare` 和 `pnpm build:astro` 均成功。
