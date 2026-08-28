import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prerenderMermaidSvg } from "@/plugins/mermaid-prerender";

const originalPrerenderMode = process.env.BLOG_MERMAID_PRERENDER;
const originalCacheDir = process.env.BLOG_MERMAID_PRERENDER_CACHE_DIR;

let tempDir: string;

describe("Mermaid build-time prerendering", () => {
	beforeEach(async () => {
		tempDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "blog-mermaid-prerender-"),
		);
		process.env.BLOG_MERMAID_PRERENDER = "1";
		process.env.BLOG_MERMAID_PRERENDER_CACHE_DIR = tempDir;
	});

	afterEach(async () => {
		if (originalPrerenderMode === undefined) {
			delete process.env.BLOG_MERMAID_PRERENDER;
		} else {
			process.env.BLOG_MERMAID_PRERENDER = originalPrerenderMode;
		}

		if (originalCacheDir === undefined) {
			delete process.env.BLOG_MERMAID_PRERENDER_CACHE_DIR;
		} else {
			process.env.BLOG_MERMAID_PRERENDER_CACHE_DIR = originalCacheDir;
		}

		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it("renders Mermaid source to SVG and caches the output", async () => {
		const result = await prerenderMermaidSvg(
			`flowchart TD
  A[Markdown] --> B[SVG]`,
			{
				sourcePath: "tests/content/posts/fixture-markdown-mermaid.md",
				diagramId: "mermaid-diagram-0",
			},
		);

		expect(result?.cacheKey).toMatch(/^[a-f0-9]{64}$/);
		expect(result?.svg).toContain("<svg");
		expect(result?.svg).toContain("mermaid-prerender-");
		expect(result?.svg).not.toContain("flowchart TD");

		const cacheFile = path.join(tempDir, `${result?.cacheKey}.svg`);
		await expect(fs.readFile(cacheFile, "utf8")).resolves.toBe(result?.svg);

		const cached = await prerenderMermaidSvg(
			`flowchart TD
  A[Markdown] --> B[SVG]`,
			{
				sourcePath: "tests/content/posts/fixture-markdown-mermaid.md",
				diagramId: "mermaid-diagram-0",
			},
		);
		expect(cached).toEqual(result);
	});

	it("can be disabled for development fallback rendering", async () => {
		process.env.BLOG_MERMAID_PRERENDER = "false";

		await expect(
			prerenderMermaidSvg("flowchart TD\n  A --> B", {
				sourcePath: "tests/content/posts/fixture-markdown-mermaid.md",
				diagramId: "mermaid-diagram-0",
			}),
		).resolves.toBeUndefined();
	});
});
