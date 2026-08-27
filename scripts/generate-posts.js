import fs from "fs";
import path from "path";

const TARGETS = {
	test: "./tests/content/posts/",
	content: "./src/content/posts/",
};
const TARGET_NAMES = Object.keys(TARGETS);
const TARGET_ALIASES = {
	fixture: "test",
};

const TEST_CATEGORY = "测试内容";
const TEST_TAGS = ["测试内容", "内容验证"];

function getDate() {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0");
	const day = String(today.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getRandomDate(daysOffset = 30) {
	const today = new Date();
	const randomDaysAgo = Math.floor(Math.random() * daysOffset);
	const date = new Date(today);
	date.setDate(today.getDate() - randomDaysAgo);

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function parseOptions(args) {
	/** @type {{ target: string; confirmContentClear: boolean; rest: string[] }} */
	const options = {
		target: "test",
		confirmContentClear: false,
		rest: [],
	};

	for (const arg of args) {
		if (arg.startsWith("--target=")) {
			options.target = arg.slice("--target=".length);
			continue;
		}
		if (arg === "--confirm-content-clear") {
			options.confirmContentClear = true;
			continue;
		}
		options.rest.push(arg);
	}

	options.target = TARGET_ALIASES[options.target] ?? options.target;

	if (!TARGET_NAMES.includes(options.target)) {
		throw new Error(
			`未知 target: ${options.target}。可用值: test, content`,
		);
	}

	return options;
}

function getTargetDir(target) {
	return TARGETS[target];
}

function generateRandomContent(paragraphs = 3) {
	const paragraphsPool = [
		"这是一篇测试内容文章，用于验证博客内容管线、分类页和文章详情页的稳定行为。",
		"测试内容不应进入生产构建。它只在显式测试模式下被 Astro Content Collection 读取。",
		"通过固定的分类、标签和文章结构，E2E 可以验证功能契约，而不依赖生产文章当前写法。",
		"当生产文章的标题、slug、分类或标签发生变化时，测试夹具仍然保持稳定。",
		"如果测试需要覆盖分页、TOC 或阅读进度，应优先扩展 fixture，而不是新增生产占位文章。",
	];

	const content = [];
	for (let i = 0; i < paragraphs; i++) {
		const randomIndex = Math.floor(Math.random() * paragraphsPool.length);
		content.push(paragraphsPool[randomIndex]);
	}
	return content.join("\n\n");
}

function generateRandomTags(extraTags = []) {
	const tags = [
		...TEST_TAGS,
		...extraTags,
		"分页样本",
		"TOC样本",
		"Markdown",
		"导航",
	];
	const selectedTags = [];
	const numTags = Math.floor(Math.random() * 2) + 2;

	while (selectedTags.length < numTags) {
		const randomIndex = Math.floor(Math.random() * tags.length);
		const tag = tags[randomIndex];
		if (!selectedTags.includes(tag)) selectedTags.push(tag);
	}

	return selectedTags;
}

async function generateBatchPosts(
	numPosts = 5,
	baseTitle = "测试内容文章",
	target = "test",
) {
	const targetDir = getTargetDir(target);

	if (!fs.existsSync(targetDir)) {
		fs.mkdirSync(targetDir, { recursive: true });
	}

	console.log(`开始生成 ${numPosts} 篇测试内容文章到 ${targetDir}\n`);

	for (let i = 1; i <= numPosts; i++) {
		const title = `${baseTitle} ${i}`;
		const fileName = `fixture-${baseTitle.replace(/\s+/g, "-")}-${i}.md`;
		const fullPath = path.join(targetDir, fileName);

		if (fs.existsSync(fullPath)) {
			console.warn(`警告: 文件 ${fileName} 已存在，跳过。`);
			continue;
		}

		const isRecent = Math.random() > 0.5;
		const publishedDate = isRecent ? getDate() : getRandomDate(30);
		const content = generateRandomContent(
			Math.floor(Math.random() * 5) + 2,
		);

		const frontmatter = `---
title: ${title}
published: ${publishedDate}
description: '这是${title}的测试内容摘要。'
image: ''
tags: ${JSON.stringify(generateRandomTags())}
category: '${TEST_CATEGORY}'
draft: false
lang: 'zh_CN'
---

${content}
`;

		fs.writeFileSync(fullPath, frontmatter);
		console.log(`已创建: ${fileName}`);
	}

	console.log(`\n完成。target=${target}`);
}

async function generateThemePosts(
	themes = ["JavaScript", "React", "Node.js"],
	target = "test",
) {
	const targetDir = getTargetDir(target);

	if (!fs.existsSync(targetDir)) {
		fs.mkdirSync(targetDir, { recursive: true });
	}

	console.log(
		`开始生成 ${themes.length} 个主题的测试内容文章到 ${targetDir}\n`,
	);

	let count = 0;
	for (const theme of themes) {
		for (let i = 1; i <= 3; i++) {
			count++;
			const title = `${theme} 测试内容 ${i}`;
			const fileName = `${theme.toLowerCase()}-fixture-${i}.md`;
			const fullPath = path.join(targetDir, fileName);

			if (fs.existsSync(fullPath)) {
				console.warn(`警告: 文件 ${fileName} 已存在，跳过。`);
				continue;
			}

			const content = `---
title: ${title}
published: ${getRandomDate(60)}
description: '用于验证 ${theme} 主题标签、分类筛选和文章列表行为的测试内容。'
image: ''
tags: ${JSON.stringify(generateRandomTags([theme]))}
category: '${TEST_CATEGORY}'
draft: false
lang: 'zh_CN'
---

# ${title}

## 引言

这篇文章是测试内容，不是生产内容。

## 主要内容

1. 分类筛选样本
2. 标签筛选样本
3. 列表排序样本
4. 文章详情样本

## 总结

测试内容只应通过显式测试内容源进入 E2E。
`;

			fs.writeFileSync(fullPath, content);
			console.log(`已创建: ${fileName}`);
		}
	}

	console.log(`\n完成。共生成 ${count} 篇主题测试内容文章。target=${target}`);
}

function clearTestPosts(
	prefix = "测试内容文章",
	target = "test",
	options = {},
) {
	if (target === "content" && !options.confirmContentClear) {
		throw new Error(
			"拒绝清理生产内容目录。若确实需要，请显式传入 --target=content --confirm-content-clear。",
		);
	}

	const targetDir = getTargetDir(target);
	if (!fs.existsSync(targetDir)) {
		console.log("目录不存在，无需清理。");
		return;
	}

	const files = fs.readdirSync(targetDir);
	const testFiles = files.filter(
		(file) =>
			file.startsWith(prefix) ||
			file.includes("-fixture-") ||
			file.startsWith("javascript-fixture") ||
			file.startsWith("react-fixture") ||
			file.startsWith("node.js-fixture"),
	);

	if (testFiles.length === 0) {
		console.log("没有找到测试内容文章。");
		return;
	}

	console.log(
		`找到 ${testFiles.length} 篇测试内容文章，开始清理 ${targetDir}\n`,
	);

	let deletedCount = 0;
	for (const file of testFiles) {
		try {
			fs.unlinkSync(path.join(targetDir, file));
			console.log(`已删除: ${file}`);
			deletedCount++;
		} catch (error) {
			console.error(`删除失败: ${file}`, error.message);
		}
	}

	console.log(`\n清理完成。共删除 ${deletedCount} 个文件。target=${target}`);
}

function printHelp() {
	console.log(`
批量生成测试内容文章

使用:
  pnpm generate-posts -- <command> [options]

可用命令:
  batch <数量> <基础标题>        生成指定数量的测试内容文章
  theme [主题...]               生成主题测试内容文章
  clear [前缀]                  清理测试内容文章
  help                          显示帮助信息

选项:
  --target=test                 写入 tests/content/posts，默认值
  --target=content              写入 src/content/posts，仅用于明确的生产内容调试
  --target=fixture              兼容旧参数，等同于 --target=test
  --confirm-content-clear       允许 clear 清理生产内容目录中的匹配文件

示例:
  pnpm generate-posts -- batch 10
  pnpm generate-posts -- batch 5 "分页夹具"
  pnpm generate-posts -- theme
  pnpm generate-posts -- theme Vue CSS HTML
  pnpm generate-posts -- clear
`);
}

async function main() {
	const args = process.argv.slice(2).filter((arg) => arg !== "--");
	if (args.length === 0) {
		printHelp();
		return;
	}

	const command = args[0].toLowerCase();
	const options = parseOptions(args.slice(1));

	switch (command) {
		case "batch": {
			const numPosts = parseInt(options.rest[0]) || 5;
			const baseTitle = options.rest[1] || "测试内容文章";
			await generateBatchPosts(numPosts, baseTitle, options.target);
			break;
		}

		case "theme": {
			const themes = options.rest.length
				? options.rest
				: ["JavaScript", "React", "Node.js"];
			await generateThemePosts(themes, options.target);
			break;
		}

		case "clear": {
			const prefix = options.rest[0] || "测试内容文章";
			clearTestPosts(prefix, options.target, options);
			break;
		}

		case "help":
			printHelp();
			break;

		default:
			console.error(`未知命令: ${command}`);
			printHelp();
			process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
