# 内容分离

项目支持两种互斥的内容来源：仓库内本地内容，以及由完整 Git commit SHA 锁定的外部内容仓库。默认使用本地内容。

## 本地模式

未设置 `ENABLE_CONTENT_SYNC`，或明确设置为 `false`：

```bash
ENABLE_CONTENT_SYNC=false
```

`pnpm content:prepare` 只输出 `[content] mode=local`，不执行 Git。构建直接使用：

- `src/content/posts`
- `src/content/spec`
- `src/data`
- `public/images`

如果工作区此前启用了外部模式，准备命令会事务性恢复首次启用时保存的本地目录。

## Pinned 外部模式

外部模式必须同时提供仓库地址和完整 40 位 commit SHA：

```bash
ENABLE_CONTENT_SYNC=true
CONTENT_REPO_URL=https://github.com/example/blog-content.git
CONTENT_REPO_COMMIT_SHA=0123456789abcdef0123456789abcdef01234567
CONTENT_DIR=./content
```

不接受 branch、tag 或缩写 SHA。这样同一代码提交与同一内容 SHA 的重复构建会得到相同内容输入。

外部仓库必须包含四个真实目录：

```text
posts/
spec/
data/
images/
```

任一目录缺失或是顶层符号链接时，准备失败。不支持部分目录来自外部、其余目录来自本地的混合模式。

## 准备与切换模型

`CONTENT_DIR` 是 ignored 状态目录，不是可直接编辑的 checkout：

```text
content/
  staging/
  releases/<commit-sha>/
  current -> releases/<commit-sha>
  local-backup/
```

准备流程依次执行：

1. 在 staging 中初始化 Git 仓库。
2. 通过参数数组获取指定 SHA，并 detached checkout。
3. 校验实际 `HEAD` 与配置 SHA 一致。
4. 校验四个内容目录。
5. 将 checkout 提升为 immutable release。
6. 原子替换 `current` 指针。

项目四个内容目录是指向 `current` 子目录的受管理 symlink 或 Windows junction。首次安装链接使用可回滚事务；后续版本升级只切换一个 `current` 指针。当前和前一个 release 会保留，旧 staging 与更早 release 会清理。

运行环境必须支持 symlink 或 junction。外部模式不会降级为复制，因为复制无法维持同一原子切换契约。

## 命令

| 命令 | 行为 |
| --- | --- |
| `pnpm content:prepare` | 准备配置锁定的内容版本。 |
| `pnpm sync-content` | 上述命令的兼容别名。 |
| `pnpm dev` | 准备内容后启动开发服务器。 |
| `pnpm build:astro` | 准备内容后执行 Astro 构建。 |
| `pnpm build` | 准备内容后执行完整生产构建。 |

`pnpm check` 和 pre-commit 不访问远端，避免普通静态检查产生网络或工作区切换副作用。

## 失败策略与安全

- 本地模式不会尝试远端同步。
- 外部模式中的配置、fetch、SHA、目录、链接或切换失败都会返回非零状态。
- 构建命令没有 `|| true`，不会使用旧内容或本地内容继续构建。
- 日志只记录 `mode=external commit=<sha>`，不会输出可能包含凭证的仓库 URL。
- 私有仓库凭证必须放在部署平台 Secret 或 SSH 配置中，不要写入仓库文件。

排查时先单独运行：

```bash
pnpm content:prepare
```

确认环境变量、远端是否允许按 SHA fetch、四目录是否完整，以及运行环境是否支持链接。不要删除项目根目录或手动拼接清理命令；`CONTENT_DIR` 必须解析到项目根目录内的专用目录。
