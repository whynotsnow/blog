import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflow = fs.readFileSync(
	path.resolve(
		import.meta.dirname,
		"../../../.github/workflows/backfill-vercel-artifacts.yml",
	),
	"utf8",
);

describe("historical artifact backfill workflow contract", () => {
	it("is manual-only and accepts at most two explicit complete slots", () => {
		expect(workflow).toContain("    workflow_dispatch:");
		expect(workflow).not.toMatch(/^\s+(push|pull_request|schedule):/mu);
		expect(workflow).toContain("slot_1_artifact_id:");
		expect(workflow).toContain("slot_2_artifact_id:");
		expect(workflow).not.toContain("slot_3_artifact_id:");
		expect(workflow).toContain("scripts/prepare-artifact-backfill.mjs");
		expect(workflow).toContain("max-parallel: 1");
	});

	it("downloads exact legacy artifacts and performs only historical promotion", () => {
		expect(workflow).toContain("run-id: ${{ matrix.runId }}");
		expect(workflow).toContain(
			"artifact-ids: ${{ matrix.githubArtifactId }}",
		);
		expect(workflow).toContain("merge-multiple: true");
		expect(workflow).toContain(
			"node scripts/normalize-vercel-artifact.mjs .artifact-download .vercel/output",
		);
		expect(workflow).toContain(
			"node scripts/create-vercel-archive.mjs .vercel/output .canonical/vercel-output.tar.gz .canonical/vercel-output-metadata.json",
		);
		expect(workflow).toContain(
			"DEPLOY_APPROVAL_PROMOTION_PURPOSE: historical-backfill",
		);
		expect(workflow).toContain(
			"DEPLOY_APPROVAL_WORKFLOW_MODE: historical-backfill",
		);
		expect(workflow).toContain(
			"node scripts/promote-deployment-artifact.mjs",
		);
		expect(
			workflow.indexOf("Verify registered source artifact digest"),
		).toBeLessThan(
			workflow.indexOf(
				"Upload historical artifact to central R2 archive",
			),
		);
		expect(workflow).toContain(
			'run: test "$ACTUAL_SOURCE_DIGEST" = "$EXPECTED_SOURCE_DIGEST"',
		);
		expect(workflow).not.toContain("request-approval");
		expect(workflow).not.toContain("wait-approval");
		expect(workflow).not.toContain("consume-approval");
		expect(workflow).not.toContain("vercel deploy");
		expect(workflow).not.toContain("DEPLOY_APPROVAL_APPROVAL_ID");
	});
});
