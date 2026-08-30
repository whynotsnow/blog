import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "@playwright/test";

export const MERMAID_VERSION = "11.17.2" as const;
export const MERMAID_SECURITY_LEVEL = "strict" as const;
export const MERMAID_RUNTIME_URL: string = `/assets/js/mermaid-${MERMAID_VERSION}.min.js`;

const projectRoot = path.resolve(
	fileURLToPath(new URL("../..", import.meta.url)),
);
const defaultCacheDir = path.join(
	projectRoot,
	"node_modules",
	".cache",
	"blog-mermaid",
);
const mermaidRuntimePath = path.join(
	projectRoot,
	"public",
	"assets",
	"js",
	`mermaid-${MERMAID_VERSION}.min.js`,
);
const rendererVersion = "playwright-v1";
const browserCloseDelayMs = 250;

type MermaidConfig = {
	startOnLoad: false;
	theme: "default";
	themeVariables: {
		fontFamily: string;
		fontSize: string;
	};
	securityLevel: typeof MERMAID_SECURITY_LEVEL;
	errorLevel: "warn";
	logLevel: "error";
};

type MermaidBrowserRuntime = {
	initialize(config: MermaidConfig): void;
	render(id: string, code: string): Promise<{ svg: string }>;
};

export type MermaidPrerenderContext = {
	sourcePath?: string;
	diagramId: string;
	cacheDir?: string;
};

export type PrerenderedMermaidSvg = {
	svg: string;
	cacheKey: string;
};

let browserPromise: Promise<Browser> | undefined;
let closeBrowserTimer: NodeJS.Timeout | undefined;
let activeRenderCount = 0;

function getPrerenderMode(): "disabled" | "strict" | "fallback" {
	const override = process.env.BLOG_MERMAID_PRERENDER?.trim().toLowerCase();
	if (override === "false" || override === "0" || override === "off") {
		return "disabled";
	}
	if (override === "fallback") {
		return "fallback";
	}
	if (override === "true" || override === "1" || override === "strict") {
		return "strict";
	}
	return process.env.NODE_ENV === "production" ? "strict" : "disabled";
}

function getCacheDir(context: MermaidPrerenderContext): string {
	const override = process.env.BLOG_MERMAID_PRERENDER_CACHE_DIR?.trim();
	return context.cacheDir ?? override ?? defaultCacheDir;
}

function buildCacheKey(code: string): string {
	return createHash("sha256")
		.update(
			JSON.stringify({
				code,
				mermaidVersion: MERMAID_VERSION,
				rendererVersion,
				securityLevel: MERMAID_SECURITY_LEVEL,
				theme: "default",
				themeVariables: {
					fontFamily: "inherit",
					fontSize: "16px",
				},
			}),
		)
		.digest("hex");
}

function formatDiagramLabel(context: MermaidPrerenderContext): string {
	const sourcePath = context.sourcePath
		? path.relative(projectRoot, context.sourcePath)
		: "unknown markdown source";
	return `${sourcePath}#${context.diagramId}`;
}

async function getBrowser(): Promise<Browser> {
	if (closeBrowserTimer) {
		clearTimeout(closeBrowserTimer);
		closeBrowserTimer = undefined;
	}
	browserPromise ??= chromium.launch({ headless: true });
	return browserPromise;
}

function scheduleBrowserClose(): void {
	if (activeRenderCount > 0) {
		return;
	}
	if (closeBrowserTimer) {
		clearTimeout(closeBrowserTimer);
	}
	closeBrowserTimer = setTimeout(() => {
		if (activeRenderCount > 0) {
			return;
		}
		const browserToClose = browserPromise;
		browserPromise = undefined;
		closeBrowserTimer = undefined;
		void browserToClose?.then((browser) => browser.close());
	}, browserCloseDelayMs);
}

async function readCachedSvg(
	cacheDir: string,
	cacheKey: string,
): Promise<string | undefined> {
	try {
		return await fs.readFile(
			path.join(cacheDir, `${cacheKey}.svg`),
			"utf8",
		);
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			return undefined;
		}
		throw error;
	}
}

async function writeCachedSvg(
	cacheDir: string,
	cacheKey: string,
	svg: string,
): Promise<void> {
	await fs.mkdir(cacheDir, { recursive: true });
	await fs.writeFile(path.join(cacheDir, `${cacheKey}.svg`), svg, "utf8");
}

async function renderMermaidSvgWithPlaywright(
	code: string,
	cacheKey: string,
): Promise<string> {
	await fs.access(mermaidRuntimePath);
	activeRenderCount += 1;
	const browser = await getBrowser();
	const page = await browser.newPage({
		viewport: { width: 1600, height: 1200 },
		deviceScaleFactor: 1,
	});

	try {
		await page.setContent("<!doctype html><html><body></body></html>");
		await page.addScriptTag({ path: mermaidRuntimePath });

		return await page.evaluate(
			async ({
				diagramCode,
				renderId,
				securityLevel,
			}: {
				diagramCode: string;
				renderId: string;
				securityLevel: typeof MERMAID_SECURITY_LEVEL;
			}) => {
				const runtimeWindow = window as Window & {
					mermaid?: MermaidBrowserRuntime;
				};
				const mermaid = runtimeWindow.mermaid;
				if (!mermaid) {
					throw new Error("Mermaid runtime is unavailable");
				}

				mermaid.initialize({
					startOnLoad: false,
					theme: "default",
					themeVariables: {
						fontFamily: "inherit",
						fontSize: "16px",
					},
					securityLevel,
					errorLevel: "warn",
					logLevel: "error",
				});

				const { svg } = await mermaid.render(renderId, diagramCode);
				return svg;
			},
			{
				diagramCode: code,
				renderId: `mermaid-prerender-${cacheKey.slice(0, 16)}`,
				securityLevel: MERMAID_SECURITY_LEVEL,
			},
		);
	} finally {
		activeRenderCount = Math.max(0, activeRenderCount - 1);
		await page.close().catch(() => undefined);
		scheduleBrowserClose();
	}
}

export async function prerenderMermaidSvg(
	code: string,
	context: MermaidPrerenderContext,
): Promise<PrerenderedMermaidSvg | undefined> {
	const mode = getPrerenderMode();
	if (mode === "disabled") {
		return undefined;
	}

	const cacheKey = buildCacheKey(code);
	const cacheDir = getCacheDir(context);

	try {
		const cachedSvg = await readCachedSvg(cacheDir, cacheKey);
		if (cachedSvg) {
			return { svg: cachedSvg, cacheKey };
		}

		const svg = await renderMermaidSvgWithPlaywright(code, cacheKey);
		await writeCachedSvg(cacheDir, cacheKey, svg);
		return { svg, cacheKey };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "unknown Mermaid error";
		const detail = `Failed to prerender Mermaid diagram ${formatDiagramLabel(context)}: ${message}`;

		if (mode === "fallback") {
			console.warn(`[mermaid-prerender] ${detail}`);
			return undefined;
		}

		throw new Error(detail);
	}
}
