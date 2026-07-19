import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(import.meta.dirname, "../../..");

describe("content preparation entrypoints", () => {
	it("routes build and development commands through one strict preparation command", () => {
		const packageJson = JSON.parse(
			fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
		) as { scripts: Record<string, string> };

		expect(packageJson.scripts["content:prepare"]).toBe(
			"node scripts/prepare-content.mjs",
		);
		expect(packageJson.scripts["sync-content"]).toBe(
			"pnpm content:prepare",
		);
		for (const script of ["build", "build:astro", "dev", "start"]) {
			expect(packageJson.scripts[script]).toContain(
				"pnpm content:prepare",
			);
			expect(packageJson.scripts[script]).not.toContain("|| true");
		}

		const playwrightConfig = fs.readFileSync(
			path.join(rootDir, "playwright.config.ts"),
			"utf8",
		);
		expect(playwrightConfig).toContain("pnpm content:prepare && astro dev");
		expect(playwrightConfig).not.toContain("sync-content.js || true");
	});
});
