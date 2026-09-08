import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

async function runBackfillPreparation(environment: NodeJS.ProcessEnv) {
	const root = fs.mkdtempSync(path.join(process.cwd(), ".tmp-backfill-"));
	const outputPath = path.join(root, "github-output.txt");
	try {
		await execFileAsync(
			process.execPath,
			["scripts/prepare-artifact-backfill.mjs"],
			{
				cwd: process.cwd(),
				env: {
					...process.env,
					GITHUB_OUTPUT: outputPath,
					...environment,
				},
				encoding: "utf8",
			},
		);
		return fs.readFileSync(outputPath, "utf8");
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
}

describe("historical artifact backfill inputs", () => {
	it("emits only the one or two explicitly complete slots", async () => {
		const output = await runBackfillPreparation({
			BACKFILL_1_ARTIFACT_ID: "artifact-1",
			BACKFILL_1_ARTIFACT_DIGEST: `sha256:${"1".repeat(64)}`,
			BACKFILL_1_RUN_ID: "123",
			BACKFILL_1_GITHUB_ARTIFACT_ID: "456",
			BACKFILL_2_ARTIFACT_ID: "artifact-2",
			BACKFILL_2_ARTIFACT_DIGEST: `sha256:${"2".repeat(64)}`,
			BACKFILL_2_RUN_ID: "789",
			BACKFILL_2_GITHUB_ARTIFACT_ID: "987",
		});
		expect(JSON.parse(output.slice("matrix=".length))).toEqual({
			include: [
				{
					artifactId: "artifact-1",
					artifactDigest: `sha256:${"1".repeat(64)}`,
					runId: "123",
					githubArtifactId: "456",
				},
				{
					artifactId: "artifact-2",
					artifactDigest: `sha256:${"2".repeat(64)}`,
					runId: "789",
					githubArtifactId: "987",
				},
			],
		});
	});

	it("rejects a partially filled optional slot", async () => {
		await expect(
			runBackfillPreparation({
				BACKFILL_1_ARTIFACT_ID: "artifact-1",
				BACKFILL_1_ARTIFACT_DIGEST: `sha256:${"1".repeat(64)}`,
				BACKFILL_1_RUN_ID: "123",
				BACKFILL_1_GITHUB_ARTIFACT_ID: "456",
				BACKFILL_2_ARTIFACT_ID: "artifact-2",
			}),
		).rejects.toMatchObject({
			stderr: expect.stringContaining(
				"backfill slot 2 must provide all four identity fields",
			),
		});
	});
});
