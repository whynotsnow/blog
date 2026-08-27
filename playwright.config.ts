/// <reference types="node" />

import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4321);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const reuseExistingServer =
	!process.env.CI && process.env.PLAYWRIGHT_REUSE_SERVER === "1";

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 45_000,
	// Keep full-suite concurrency at the level used by the former two-file suite.
	// Affected suites remain fast because they execute only their owning spec.
	workers: 2,
	expect: {
		timeout: 5_000,
	},
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: `BLOG_CONTENT_MODE=test pnpm content:prepare && BLOG_CONTENT_MODE=test pnpm font:prepare && BLOG_CONTENT_MODE=test astro dev --host 127.0.0.1 --port ${port}`,
		url: baseURL,
		reuseExistingServer,
		timeout: 60_000,
	},
});
