import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, ".font-build/manifest.json");

function runFontCommand(...args: string[]) {
	return execFileSync(
		process.execPath,
		["scripts/fonts/index.mjs", ...args],
		{
			cwd: rootDir,
			encoding: "utf8",
		},
	);
}

describe("font build pipeline", () => {
	it("produces deterministic, current WOFF2 packages", () => {
		runFontCommand();
		const firstManifest = fs.readFileSync(manifestPath, "utf8");

		expect(runFontCommand("--check")).toContain("Font build check passed");

		runFontCommand();
		expect(fs.readFileSync(manifestPath, "utf8")).toBe(firstManifest);
	});
});
