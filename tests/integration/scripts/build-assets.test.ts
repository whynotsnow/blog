import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	clearAstroCache,
	findMissingAstroAssets,
	verifyAstroAssets,
} from "../../../scripts/build-assets.mjs";

const tempDirectories: string[] = [];

function createTempDirectory() {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), "build-assets-"));
	tempDirectories.push(directory);
	return directory;
}

afterEach(() => {
	for (const directory of tempDirectories.splice(0)) {
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

describe("Astro build asset verification", () => {
	it("removes stale Astro content cache before production builds", () => {
		const rootDir = createTempDirectory();
		const cacheDir = path.join(rootDir, "node_modules", ".astro");
		fs.mkdirSync(cacheDir, { recursive: true });
		fs.writeFileSync(path.join(cacheDir, "data-store.json"), "{}");
		const logger = { log: vi.fn() };

		expect(clearAstroCache({ cacheDir, logger })).toBe(true);

		expect(fs.existsSync(cacheDir)).toBe(false);
		expect(logger.log).toHaveBeenCalledWith(
			"[build-assets] Removed stale Astro content cache",
		);
	});

	it("reports HTML references to missing generated Astro assets", () => {
		const outputDir = createTempDirectory();
		fs.mkdirSync(path.join(outputDir, "posts", "guide"), {
			recursive: true,
		});
		fs.mkdirSync(path.join(outputDir, "_astro"), { recursive: true });
		fs.writeFileSync(path.join(outputDir, "_astro", "ec.ok.css"), "");
		fs.writeFileSync(
			path.join(outputDir, "posts", "guide", "index.html"),
			'<link rel="stylesheet" href="/_astro/ec.missing.css"><script type="module" src="/_astro/ec.ok.css"></script>',
		);

		const missingAssets = findMissingAstroAssets({ outputDir });

		expect([...missingAssets.keys()]).toEqual(["_astro/ec.missing.css"]);
		expect(missingAssets.get("_astro/ec.missing.css")).toEqual([
			path.join("posts", "guide", "index.html"),
		]);
		expect(() =>
			verifyAstroAssets({ outputDir, logger: { log: vi.fn() } }),
		).toThrow("/_astro/ec.missing.css");
	});

	it("requires production scripts to clear cache and verify generated assets", () => {
		const packageJson = JSON.parse(
			fs.readFileSync(
				path.resolve(import.meta.dirname, "../../..", "package.json"),
				"utf8",
			),
		) as { scripts: Record<string, string> };

		for (const script of ["build", "build:astro"]) {
			const command = packageJson.scripts[script];
			expect(command).toContain(
				"node scripts/build-assets.mjs clear-astro-cache",
			);
			expect(command).toContain(
				"node scripts/build-assets.mjs verify-astro-assets",
			);
			expect(command.indexOf("clear-astro-cache")).toBeLessThan(
				command.indexOf("astro build"),
			);
			expect(command.indexOf("astro build")).toBeLessThan(
				command.indexOf("verify-astro-assets"),
			);
		}
	});
});
