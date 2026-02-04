import fs from "fs";
import path from "path";

// 获取当前日期
function getDate() {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0");
	const day = String(today.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// 获取随机日期（用于模拟历史文章）
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

// 生成随机文章内容
function generateRandomContent(paragraphs = 3) {
	const loremIpsum = [
		"随着技术的不断发展，现代Web开发已经变得越来越复杂。前端框架的兴起让开发者能够构建更加交互式的用户界面。",
		"在过去的几年里，JavaScript生态系统经历了巨大的变化。从jQuery到React，再到现在的Next.js，开发工具和框架不断演进。",
		"性能优化是Web开发中一个永恒的话题。通过代码分割、懒加载和缓存策略，我们可以显著提升应用的加载速度和用户体验。",
		"响应式设计已经成为现代Web开发的标准实践。确保网站在各种设备上都能良好显示，对于吸引和保留用户至关重要。",
		"TypeScript的普及为JavaScript开发带来了类型安全。虽然增加了学习曲线，但它显著提高了代码的可维护性和可读性。",
		"服务器端渲染(SSR)和静态站点生成(SSG)技术使得构建高性能的Web应用变得更加容易。这些技术有助于改善SEO和初始加载时间。",
		"WebAssembly的出现为Web平台带来了新的可能性。现在我们可以使用C++、Rust等语言编写高性能的Web应用。",
		"微前端架构正在改变大型应用的组织方式。通过将应用拆分为更小的、独立的模块，团队可以独立开发和部署各自的部分。",
		"无服务器架构让开发者能够专注于业务逻辑，而不必担心基础设施管理。这种模式特别适合事件驱动的应用场景。",
		"人工智能和机器学习正在逐渐融入Web开发。从智能推荐到自动化测试，AI技术正在改变我们构建应用的方式。",
	];

	let content = "";
	for (let i = 0; i < paragraphs; i++) {
		const randomIndex = Math.floor(Math.random() * loremIpsum.length);
		content += loremIpsum[randomIndex] + "\n\n";
	}
	return content.trim();
}

// 生成随机标签
function generateRandomTags() {
	const tags = [
		"JavaScript",
		"TypeScript",
		"React",
		"Vue",
		"Next.js",
		"Node.js",
		"前端开发",
		"Web开发",
		"性能优化",
		"CSS",
		"HTML",
		"算法",
		"数据结构",
		"设计模式",
		"工程化",
		"测试",
		"部署",
		"DevOps",
	];

	const selectedTags = [];
	const numTags = Math.floor(Math.random() * 3) + 1; // 1-3个标签

	while (selectedTags.length < numTags) {
		const randomIndex = Math.floor(Math.random() * tags.length);
		const tag = tags[randomIndex];
		if (!selectedTags.includes(tag)) {
			selectedTags.push(tag);
		}
	}

	return selectedTags;
}

// 生成随机分类
function generateRandomCategory() {
	const categories = ["技术", "生活", "学习", "工作", "随笔", "教程"];
	const randomIndex = Math.floor(Math.random() * categories.length);
	return categories[randomIndex];
}

// 批量生成文章
async function generateBatchPosts(numPosts = 5, baseTitle = "测试文章") {
	const targetDir = "./src/content/posts/";

	// 确保目录存在
	if (!fs.existsSync(targetDir)) {
		fs.mkdirSync(targetDir, { recursive: true });
	}

	console.log(`开始生成 ${numPosts} 篇测试文章...\n`);

	for (let i = 1; i <= numPosts; i++) {
		const title = `${baseTitle} ${i}`;
		const fileName = `${baseTitle.replace(/\s+/g, "-")}-${i}.md`;
		const fullPath = path.join(targetDir, fileName);

		// 检查文件是否已存在
		if (fs.existsSync(fullPath)) {
			console.warn(`警告: 文件 ${fileName} 已存在，跳过...`);
			continue;
		}

		// 随机决定是否使用当前日期或历史日期
		const isRecent = Math.random() > 0.5;
		const publishedDate = isRecent ? getDate() : getRandomDate(30);

		// 随机决定是否为草稿
		const isDraft = Math.random() > 0.8;

		// 随机决定语言
		const lang = Math.random() > 0.5 ? "zh" : "en";

		// 生成文章内容
		const content = generateRandomContent(
			Math.floor(Math.random() * 5) + 2,
		);

		// 生成文章元数据
		const frontmatter = `---
title: ${title}
published: ${publishedDate}
description: '这是${title}的简要描述，用于测试目的。'
image: ''
tags: ${JSON.stringify(generateRandomTags())}
category: '${generateRandomCategory()}'
draft: ${isDraft}
lang: '${lang}'
---

${content}`;

		// 写入文件
		fs.writeFileSync(fullPath, frontmatter);
		console.log(`✓ 已创建: ${fileName}`);
	}

	console.log(`\n完成！共生成 ${numPosts} 篇测试文章。`);
}

// 生成特定主题的文章
async function generateThemePosts(themes = ["JavaScript", "React", "Node.js"]) {
	const targetDir = "./src/content/posts/";

	if (!fs.existsSync(targetDir)) {
		fs.mkdirSync(targetDir, { recursive: true });
	}

	console.log(`开始生成 ${themes.length} 个主题的测试文章...\n`);

	let count = 0;
	for (const theme of themes) {
		for (let i = 1; i <= 3; i++) {
			// 每个主题生成3篇文章
			count++;
			const title = `${theme} 学习笔记 ${i}`;
			const fileName = `${theme.toLowerCase()}-note-${i}.md`;
			const fullPath = path.join(targetDir, fileName);

			if (fs.existsSync(fullPath)) {
				console.warn(`警告: 文件 ${fileName} 已存在，跳过...`);
				continue;
			}

			const publishedDate = getRandomDate(60);
			const isDraft = Math.random() > 0.9;

			const content = `---
title: ${title}
published: ${publishedDate}
description: '关于${theme}的第${i}篇学习笔记，记录了一些重要概念和实践经验。'
image: ''
tags: ${JSON.stringify([theme, "学习", "笔记"])}
category: '技术'
draft: ${isDraft}
lang: 'zh'
---

# ${title}

## 引言
这篇笔记主要记录了我在学习${theme}过程中的一些心得和体会。

## 主要内容
1. 基础知识回顾
2. 核心概念解析
3. 实践案例分析
4. 常见问题解答

## 总结
通过学习${theme}，我深刻理解了其在现代Web开发中的重要性。${theme}不仅提供了强大的功能，还具有良好的生态系统支持。

---

*本文为测试文章，用于演示内容生成功能。*`;

			fs.writeFileSync(fullPath, content);
			console.log(`✓ 已创建: ${fileName}`);
		}
	}

	console.log(`\n完成！共生成 ${count} 篇主题测试文章。`);
}

// 清空测试文章（可选）
function clearTestPosts(prefix = "测试文章") {
	const targetDir = "./src/content/posts/";

	if (!fs.existsSync(targetDir)) {
		console.log("目录不存在，无需清理。");
		return;
	}

	const files = fs.readdirSync(targetDir);
	const testFiles = files.filter(
		(file) =>
			file.startsWith(prefix) ||
			file.includes("-note-") ||
			file.startsWith("javascript") ||
			file.startsWith("react") ||
			file.startsWith("node"),
	);

	if (testFiles.length === 0) {
		console.log("没有找到测试文章。");
		return;
	}

	console.log(`找到 ${testFiles.length} 篇测试文章，开始清理...\n`);

	let deletedCount = 0;
	for (const file of testFiles) {
		try {
			fs.unlinkSync(path.join(targetDir, file));
			console.log(`🗑️  已删除: ${file}`);
			deletedCount++;
		} catch (error) {
			console.error(`❌ 删除失败: ${file}`, error.message);
		}
	}

	console.log(`\n清理完成！共删除 ${deletedCount} 个文件。`);
}

// 主函数
async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log(`
使用说明:
  npm run generate-posts -- <command> [options]

可用命令:
  batch <数量> <基础标题>   生成指定数量的测试文章
  theme                    生成主题测试文章
  clear                    清理测试文章
  help                     显示帮助信息

示例:
  npm run generate-posts -- batch 10
  npm run generate-posts -- batch 5 "我的博客文章"
  npm run generate-posts -- theme
  npm run generate-posts -- clear
    `);
		return;
	}

	const command = args[0].toLowerCase();

	switch (command) {
		case "batch":
			const numPosts = parseInt(args[1]) || 5;
			const baseTitle = args[2] || "测试文章";
			await generateBatchPosts(numPosts, baseTitle);
			break;

		case "theme":
			const themes = args.slice(1);
			if (themes.length === 0) {
				// 使用默认主题
				await generateThemePosts();
			} else {
				await generateThemePosts(themes);
			}
			break;

		case "clear":
			const prefix = args[1] || "测试文章";
			clearTestPosts(prefix);
			break;

		case "help":
			console.log(`
批量生成测试文章脚本

功能:
  1. 批量生成随机文章，用于测试博客功能
  2. 生成特定主题的文章系列
  3. 清理已生成的测试文章

文章特性:
  • 随机发布日期（当前日期或历史日期）
  • 随机标签和分类
  • 随机语言（中文/英文）
  • 随机草稿状态
  • 真实的Lorem Ipsum内容

文件位置: ./src/content/posts/
      `);
			break;

		default:
			console.error(`未知命令: ${command}`);
			console.log("使用 'help' 命令查看使用说明。");
	}
}

// 运行主函数
main().catch(console.error);

// 批量生成随机文章：

// bash
// npm run generate-posts -- batch 10
// # 生成10篇标题为"测试文章 1"到"测试文章 10"的文章

// npm run generate-posts -- batch 5 "我的博客文章"
// # 生成5篇标题为"我的博客文章 1"到"我的博客文章 5"的文章
// 生成主题文章：

// bash
// npm run generate-posts -- theme
// # 生成JavaScript、React、Node.js各3篇主题文章

// npm run generate-posts -- theme Vue CSS HTML
// # 生成指定主题的文章
// 清理测试文章：

// bash
// npm run generate-posts -- clear
// # 清理所有测试文章

// npm run generate-posts -- clear "我的博客文章"
// # 清理指定前缀的测试文章
// 查看帮助：

// bash
// npm run generate-posts -- help
