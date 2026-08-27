import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	ContentOverlayError,
	prepareDevelopmentContent,
} from "../../scripts/prepare-dev-content.mjs";

const tempDirectories: string[] = [];

function createTempProject() {
	const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "content-overlay-"));
	tempDirectories.push(rootDir);
	return rootDir;
}

function writePost(rootDir: string, relativePath: string, frontmatter = "") {
	const fullPath = path.join(rootDir, relativePath);
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });
	fs.writeFileSync(
		fullPath,
		`---
title: ${path.basename(relativePath)}
published: 2026-08-28
${frontmatter || "category: 测试内容"}
---

测试内容。
`,
	);
}

afterEach(() => {
	for (const directory of tempDirectories.splice(0)) {
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

describe("development content overlay", () => {
	it("merges production posts and test posts into one overlay", () => {
		const rootDir = createTempProject();
		writePost(
			rootDir,
			"src/content/posts/production-post.md",
			"category: 博客技术",
		);
		writePost(rootDir, "tests/content/posts/fixture-post.md");
		const logger = { log: vi.fn() };

		const result = prepareDevelopmentContent({ rootDir, logger });

		expect(result.filesCopied).toBe(2);
		expect(
			fs.existsSync(
				path.join(rootDir, "src/.content-dev/posts/production-post.md"),
			),
		).toBe(true);
		expect(
			fs.existsSync(
				path.join(rootDir, "src/.content-dev/posts/fixture-post.md"),
			),
		).toBe(true);
	});

	it("fails with a clear suggestion when overlay file paths collide", () => {
		const rootDir = createTempProject();
		writePost(rootDir, "src/content/posts/shared.md", "category: 博客技术");
		writePost(rootDir, "tests/content/posts/shared.md");

		expect(() => prepareDevelopmentContent({ rootDir })).toThrow(
			/overlay 文件路径冲突[\s\S]*建议: 重命名测试内容文件/,
		);
	});

	it("fails when a test alias points at a production default slug", () => {
		const rootDir = createTempProject();
		writePost(
			rootDir,
			"src/content/posts/production-post.md",
			"category: 博客技术",
		);
		writePost(
			rootDir,
			"tests/content/posts/fixture-post.md",
			"alias: production-post",
		);

		expect(() => prepareDevelopmentContent({ rootDir })).toThrow(
			/文章 canonical URL 冲突[\s\S]*建议: 调整测试文章 alias/,
		);
	});

	it("fails when an alias repeats its own default slug", () => {
		const rootDir = createTempProject();
		writePost(
			rootDir,
			"src/content/posts/production-post.md",
			"category: 博客技术",
		);
		writePost(
			rootDir,
			"tests/content/posts/fixture-post.md",
			"alias: fixture-post",
		);

		expect(() => prepareDevelopmentContent({ rootDir })).toThrow(
			/文章 alias 与自身默认 slug 重复[\s\S]*建议: 移除这个 alias/,
		);
	});

	it("fails when two category names resolve to the same slug", () => {
		const rootDir = createTempProject();
		writePost(
			rootDir,
			"src/content/posts/production-post.md",
			"category: Technology",
		);
		writePost(
			rootDir,
			"tests/content/posts/fixture-post.md",
			"category: 技术",
		);

		expect(() => prepareDevelopmentContent({ rootDir })).toThrow(
			/分类 slug 冲突 "tech"[\s\S]*建议: 为测试分类配置独立 slug/,
		);
	});

	it("exposes structured issues for callers", () => {
		const rootDir = createTempProject();
		writePost(rootDir, "src/content/posts/shared.md", "category: 博客技术");
		writePost(rootDir, "tests/content/posts/shared.md");

		try {
			prepareDevelopmentContent({ rootDir });
		} catch (error) {
			expect(error).toBeInstanceOf(ContentOverlayError);
			expect((error as ContentOverlayError).issues[0]).toContain("建议:");
		}
	});
});
