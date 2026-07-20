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
		expect(packageJson.scripts["sync-content"]).toBe(
			"pnpm content:prepare",
		);
		expect(packageJson.scripts["font:prepare"]).toBe(
			"node scripts/fonts/index.mjs",
		);
		for (const script of ["build", "build:astro", "dev", "start"]) {
			const command = packageJson.scripts[script];
			expect(command).not.toContain("|| true");
			expect(command.indexOf("pnpm content:prepare")).toBeLessThan(
				command.indexOf("pnpm font:prepare"),
			);
			expect(command.indexOf("pnpm font:prepare")).toBeLessThan(
				command.indexOf("astro "),
			);
		}

		const playwrightConfig = fs.readFileSync(
			path.join(rootDir, "playwright.config.ts"),
			"utf8",
		);
		expect(playwrightConfig).toContain(
			"pnpm content:prepare && pnpm font:prepare && astro dev",
		);
		expect(playwrightConfig).not.toContain("sync-content.js || true");
	});
});
