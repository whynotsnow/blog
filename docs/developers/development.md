# 开发工作流

## 环境要求

- Node.js 18 或更新版本。
- pnpm 10，版本应与 `package.json` 中的 `packageManager` 保持一致。

## 安装依赖

```bash
pnpm install
```

## 本地开发

```bash
pnpm dev
```

`dev` 脚本会启动 `astro dev --host`。

`predev` 会先运行内容同步脚本。如果未配置内容分离，同步脚本会直接退出并继续使用本地内容。

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
pnpm format:check
```

常规代码变更优先运行 `pnpm check`。涉及 TypeScript 类型、服务层结构或声明文件时，再运行 `pnpm type-check`。

## 格式化

```bash
pnpm format
```

当前格式化配置会忽略 Markdown 和 Astro 文件，避免对文章内容和复杂 Astro 模板做大范围无关改动。

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
