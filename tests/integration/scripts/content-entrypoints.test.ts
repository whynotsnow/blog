import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(import.meta.dirname, "../../..");

describe("build preparation entrypoints", () => {
	it("prepares content and fonts before every Astro runtime", () => {
		const packageJson = JSON.parse(
			fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
		) as { scripts: Record<string, string> };

		expect(packageJson.scripts["content:prepare"]).toBe(
			"node scripts/prepare-content.mjs",
		);
		expect(packageJson.scripts["dev-content:prepare"]).toBe(
			"node scripts/prepare-dev-content.mjs",
		);
		expect(packageJson.scripts["sync-content"]).toBe(
			"pnpm content:prepare",
		);
		expect(packageJson.scripts["font:prepare"]).toBe(
			"node scripts/fonts/index.mjs",
		);
		for (const script of [
			"build",
			"build:astro",
			"build:dev-content",
			"dev",
			"dev:prod-content",
			"start",
		]) {
			const command = packageJson.scripts[script];
			expect(command).not.toContain("|| true");
			expect(command.indexOf("pnpm content:prepare")).toBeLessThan(
				command.indexOf("pnpm font:prepare"),
			);
			expect(command.indexOf("pnpm font:prepare")).toBeLessThan(
				command.indexOf("astro "),
			);
		}
		expect(packageJson.scripts["dev"]).toContain(
			"pnpm dev-content:prepare",
		);
		expect(packageJson.scripts["dev"]).toContain(
			"BLOG_CONTENT_MODE=development astro dev --host",
		);
		expect(packageJson.scripts["build:dev-content"]).toContain(
			"pnpm dev-content:prepare",
		);
		expect(packageJson.scripts["build:dev-content"]).toContain(
			"BLOG_CONTENT_MODE=development astro build",
		);
		expect(packageJson.scripts["dev:prod-content"]).toContain(
			"BLOG_CONTENT_MODE=production astro dev --host",
		);

		const playwrightConfig = fs.readFileSync(
			path.join(rootDir, "playwright.config.ts"),
			"utf8",
		);
		expect(playwrightConfig).toContain("BLOG_CONTENT_MODE=test");
		expect(playwrightConfig).toContain(
			"pnpm content:prepare && BLOG_CONTENT_MODE=test pnpm font:prepare && BLOG_CONTENT_MODE=test astro dev",
		);
		expect(playwrightConfig).not.toContain("sync-content.js || true");
	});
});
