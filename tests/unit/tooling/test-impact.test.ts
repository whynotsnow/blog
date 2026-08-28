import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

type ImpactPlan = {
	groups: string[];
	unmatched: string[];
	riskEscalations: Array<{ reason: string; files: string[] }>;
};

function planFor(file: string, extraArgs: string[] = []): ImpactPlan {
	return JSON.parse(
		execFileSync(
			process.execPath,
			[
				"scripts/test-impact.mjs",
				`--file=${file}`,
				...extraArgs,
				"--mode=local",
				"--json",
			],
			{ cwd: process.cwd(), encoding: "utf8" },
		),
	) as ImpactPlan;
}

describe("impact-based validation selection", () => {
	it("selects the owning Music and Floating Tools checks", () => {
		const sourcePlan = planFor(
			"src/components/modules/music-player/MusicPlayer.svelte",
		);
		const testPlan = planFor("tests/e2e/features/floating-tools.spec.ts");

		expect(sourcePlan.groups).toEqual([
			"lint",
			"type",
			"declaration-type",
			"svelte-type",
			"astro",
			"design",
			"floating-tools",
		]);
		expect(testPlan.groups).toEqual(["test-type", "floating-tools"]);
		expect(sourcePlan.unmatched).toEqual([]);
		expect(testPlan.unmatched).toEqual([]);
	});

	it("keeps floating TOC changes on shell and post-detail checks", () => {
		const plan = planFor(
			"src/components/modules/floating-tools/FloatingTOC.astro",
		);

		expect(plan.groups).toEqual([
			"lint",
			"type",
			"declaration-type",
			"svelte-type",
			"astro",
			"design",
			"floating-tools",
			"post-detail",
		]);
		expect(plan.unmatched).toEqual([]);
	});

	it("keeps post TOC changes on the post-detail feature check", () => {
		const plans = [
			planFor("src/components/post-toc/TableOfContents.astro"),
			planFor("src/components/post-toc/toc-data.ts"),
			planFor("src/components/post-toc/toc-render.ts"),
			planFor("src/components/post-toc/toc-runtime.ts"),
			planFor("src/components/post-toc/toc-active.ts"),
			planFor("src/components/post-toc/toc-graph.ts"),
			planFor("src/components/post-toc/toc-desktop-state.ts"),
			planFor("src/components/post-toc/toc-desktop-presenter.ts"),
			planFor("src/components/post-toc/MobileTOC.svelte"),
		];

		for (const plan of plans) {
			expect(plan.groups).toEqual([
				"lint",
				"type",
				"declaration-type",
				"svelte-type",
				"astro",
				"post-detail",
			]);
			expect(plan.unmatched).toEqual([]);
		}
	});

	it("keeps Mermaid rendering changes on build and post-detail checks", () => {
		const plans = [
			planFor("src/plugins/rehype-mermaid.ts"),
			planFor("src/plugins/mermaid-prerender.ts"),
			planFor("src/plugins/mermaid-render-script.js"),
			planFor("src/styles/markdown-extend.styl"),
		];

		for (const plan of plans) {
			expect(plan.groups).toEqual([
				"lint",
				"type",
				"declaration-type",
				"astro",
				"astro-build",
				"integration",
				"post-detail",
			]);
			expect(plan.unmatched).toEqual([]);
		}
	});

	it("keeps local toolchain changes on fast checks with a CI full risk", () => {
		const plan = planFor("playwright.config.ts");

		expect(plan.groups).toEqual([
			"lint",
			"type",
			"declaration-type",
			"svelte-type",
			"script-type",
			"test-type",
			"unit",
			"astro",
		]);
		expect(plan.riskEscalations).toEqual([
			{
				reason: "ci full validation rule",
				files: ["playwright.config.ts"],
			},
		]);
	});

	it("treats E2E content fixtures as broad browser test data", () => {
		const plan = planFor("tests/content/posts/fixture-markdown-source.md");

		expect(plan.groups).toEqual([
			"test-type",
			"unit",
			"home",
			"page-support",
			"post-list",
			"post-detail",
			"activity-center",
			"floating-tools",
			"shell",
			"design-contract",
			"smoke",
		]);
		expect(plan.unmatched).toEqual([]);
	});

	it("treats content fixture route constants as broad browser support", () => {
		const plan = planFor("tests/support/content-fixtures.ts");

		expect(plan.groups).toEqual([
			"test-type",
			"home",
			"page-support",
			"post-list",
			"post-detail",
			"activity-center",
			"floating-tools",
			"shell",
			"design-contract",
			"smoke",
		]);
		expect(plan.unmatched).toEqual([]);
	});

	it("keeps CI toolchain changes on full validation", () => {
		expect(planFor("playwright.config.ts", ["--mode=ci"]).groups).toEqual([
			"full",
		]);
	});

	it("marks unavailable local bases as a full-validation risk", () => {
		const plan = JSON.parse(
			execFileSync(
				process.execPath,
				[
					"scripts/test-impact.mjs",
					"--base=0000000000000000000000000000000000000001",
					"--mode=local",
					"--json",
				],
				{ cwd: process.cwd(), encoding: "utf8" },
			),
		) as ImpactPlan;

		expect(plan.groups).toEqual([]);
		expect(plan.riskEscalations).toEqual([
			{
				reason: "unavailable base 0000000000000000000000000000000000000001",
				files: [],
			},
		]);
	});

	it("falls back to full validation when the CI base commit is unavailable", () => {
		const plan = JSON.parse(
			execFileSync(
				process.execPath,
				[
					"scripts/test-impact.mjs",
					"--mode=ci",
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

	it("keeps unclassified local paths as a risk without executing full", () => {
		const plan = planFor("unmapped/file.txt");

		expect(plan.groups).toEqual([]);
		expect(plan.unmatched).toEqual(["unmapped/file.txt"]);
		expect(plan.riskEscalations).toEqual([
			{
				reason: "unclassified path",
				files: ["unmapped/file.txt"],
			},
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
