import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

type ImpactPlan = {
	groups: string[];
	unmatched: string[];
};

function planFor(file: string): ImpactPlan {
	return JSON.parse(
		execFileSync(
			process.execPath,
			["scripts/test-impact.mjs", `--file=${file}`, "--json"],
			{ cwd: process.cwd(), encoding: "utf8" },
		),
	) as ImpactPlan;
}

describe("impact-based validation selection", () => {
	it("selects the owning Music and Floating Tools checks", () => {
		const sourcePlan = planFor(
			"src/features/music-player/MusicPlayer.svelte",
		);
		const testPlan = planFor("tests/e2e/features/floating-tools.spec.ts");

		expect(sourcePlan.groups).toEqual([
			"lint",
			"type",
			"astro",
			"design",
			"floating-tools",
		]);
		expect(testPlan.groups).toEqual(["test-type", "floating-tools"]);
		expect(sourcePlan.unmatched).toEqual([]);
		expect(testPlan.unmatched).toEqual([]);
	});

	it("keeps cross-cutting toolchain changes on full validation", () => {
		expect(planFor("playwright.config.ts").groups).toEqual(["full"]);
	});

	it("falls back to full validation when the base commit is unavailable", () => {
		const plan = JSON.parse(
			execFileSync(
				process.execPath,
				[
					"scripts/test-impact.mjs",
					"--base=0000000000000000000000000000000000000001",
					"--json",
				],
				{ cwd: process.cwd(), encoding: "utf8" },
			),
		) as { commands: Array<{ reasons: string[] }>; groups: string[] };

		expect(plan.groups).toEqual(["full"]);
		expect(plan.commands[0]?.reasons).toEqual([
			"unavailable base 0000000000000000000000000000000000000001",
		]);
	});

	it("classifies every guarded Feature and E2E path", () => {
		expect(() =>
			execFileSync(
				process.execPath,
				["scripts/test-impact.mjs", "--check-coverage"],
				{ cwd: process.cwd(), encoding: "utf8" },
			),
		).not.toThrow();
	});
});
