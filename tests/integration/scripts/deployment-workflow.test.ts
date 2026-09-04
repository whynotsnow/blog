import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflow = fs.readFileSync(
	path.resolve(import.meta.dirname, "../../../.github/workflows/CI.yml"),
	"utf8",
);
const candidateCallback = fs.readFileSync(
	path.resolve(
		import.meta.dirname,
		"../../../scripts/report-deployment-candidate.mjs",
	),
	"utf8",
);
const deploymentCallback = fs.readFileSync(
	path.resolve(
		import.meta.dirname,
		"../../../scripts/report-deployment-run.mjs",
	),
	"utf8",
);

const canonicalDigestCommand =
	"tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner --mode=0644 --format=gnu -cf - -C .vercel output | sha256sum | awk '{print $1}'";

function jobSection(jobName: string, nextJobName: string) {
	const start = workflow.indexOf(`    ${jobName}:`);
	const end = workflow.indexOf(`    ${nextJobName}:`, start);
	if (start < 0 || end < 0)
		throw new Error(`Missing workflow job: ${jobName}`);
	return workflow.slice(start, end);
}

describe("Vercel artifact workflow contract", () => {
	it("uses one metadata-normalizing digest command everywhere", () => {
		const commandMatches = workflow.match(
			/tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner --mode=0644 --format=gnu -cf - -C \.vercel output \| sha256sum \| awk '\{print \$1\}'/g,
		);

		expect(commandMatches).toHaveLength(4);
		expect(
			commandMatches?.every(
				(command) => command === canonicalDigestCommand,
			),
		).toBe(true);
	});

	it("computes the build output digest only after upload and round-trip download", () => {
		const buildJob = jobSection(
			"build-vercel-artifact",
			"deploy-production",
		);

		expect(buildJob.indexOf("Upload Vercel artifact")).toBeGreaterThan(-1);
		expect(
			buildJob.indexOf("Clear pre-upload output before round-trip"),
		).toBeGreaterThan(buildJob.indexOf("Upload Vercel artifact"));
		expect(
			buildJob.indexOf(
				"Re-download uploaded artifact for canonical digest",
			),
		).toBeGreaterThan(
			buildJob.indexOf("Clear pre-upload output before round-trip"),
		);
		expect(
			buildJob.indexOf("Compute post-round-trip Vercel artifact digest"),
		).toBeGreaterThan(
			buildJob.indexOf(
				"Re-download uploaded artifact for canonical digest",
			),
		);
		expect(buildJob).toContain(
			"artifact-ids: ${{ steps.upload.outputs.artifact-id }}",
		);
		expect(buildJob).toContain(
			"node scripts/normalize-vercel-artifact.mjs .artifact-roundtrip .vercel/output",
		);
		expect(
			workflow.match(/node scripts\/normalize-vercel-artifact\.mjs/g),
		).toHaveLength(4);
	});

	it("keeps candidate and selected deployment verification fail-closed", () => {
		const candidateJob = jobSection(
			"register-site-candidate",
			"deploy-selected-artifact",
		);
		const selectedJob = selectedJobSection();

		expect(candidateJob).toContain(canonicalDigestCommand);
		expect(candidateJob).toContain(
			'if [ "$actual" != "$EXPECTED_ARTIFACT_DIGEST" ]',
		);
		expect(selectedJob).toContain(canonicalDigestCommand);
		expect(selectedJob).toContain(
			'test "$actual" = "${{ inputs.artifact_digest }}"',
		);
		expect(selectedJob).toContain(
			"node scripts/normalize-vercel-artifact.mjs .artifact-download .vercel/output",
		);
	});

	it("uses the target-neutral snow-base callback contract", () => {
		expect(workflow).toContain("scripts/report-deployment-candidate.mjs");
		expect(workflow).toContain("scripts/report-deployment-run.mjs");
		expect(candidateCallback).toContain(
			"/api/v1/deployments/candidate-runs",
		);
		expect(deploymentCallback).toContain("/api/v1/deployments/runs/update");
		expect(candidateCallback).toContain("artifactId, artifactDigest");
		expect(deploymentCallback).toContain("requestId");
		expect(deploymentCallback).toContain("githubRunUrl");
		expect(workflow).toContain("DEPLOYMENT_CALLBACK_STATUS: in_progress");
		expect(workflow).toContain("DEPLOYMENT_CALLBACK_STATUS: completed");
		expect(workflow).toContain("always() && github.event_name");
	});

	it("reports candidate completion after registration and deployment completion after Vercel", () => {
		const candidateJob = jobSection(
			"report-site-candidate-completion",
			"deploy-selected-artifact",
		);
		const selectedJob = selectedJobSection();

		expect(
			candidateJob.indexOf(
				"needs.register-site-candidate.outputs.artifact-id",
			),
		).toBeGreaterThan(-1);
		expect(
			candidateJob.indexOf("Report Candidate completion"),
		).toBeGreaterThan(-1);
		expect(
			selectedJob.indexOf("Report deployment run in progress"),
		).toBeGreaterThan(selectedJob.indexOf("Verify deployment approval"));
		expect(
			selectedJob.indexOf("Report deployment run in progress"),
		).toBeLessThan(selectedJob.indexOf("Deploy Vercel production"));
		expect(
			workflow.indexOf("report-selected-deployment-run-completion:"),
		).toBeGreaterThan(workflow.indexOf("Deploy Vercel production"));
	});

	it("normalizes direct and nested artifact roots into .vercel/output", () => {
		const root = fs.mkdtempSync(
			path.join(process.cwd(), ".tmp-vercel-artifact-test-"),
		);
		try {
			for (const layout of ["direct", "output", ".vercel/output"]) {
				const source = path.join(root, layout);
				const sourceRoot = path.join(root, layout.split("/")[0]);
				const destination = path.join(
					root,
					`${layout.replaceAll("/", "-")}-normalized`,
				);
				fs.mkdirSync(path.join(source, "assets"), { recursive: true });
				fs.writeFileSync(
					path.join(source, "config.json"),
					`{"layout":"${layout}"}\n`,
				);
				fs.writeFileSync(
					path.join(source, "assets/index.html"),
					"<!doctype html>\n",
				);
				execFileSync(
					process.execPath,
					[
						"scripts/normalize-vercel-artifact.mjs",
						sourceRoot,
						destination,
					],
					{ cwd: process.cwd(), stdio: "ignore" },
				);
				expect(
					fs.existsSync(path.join(destination, "config.json")),
				).toBe(true);
				expect(
					fs.existsSync(path.join(destination, "assets/index.html")),
				).toBe(true);
			}
		} finally {
			fs.rmSync(root, { recursive: true, force: true });
		}
	});
});

function selectedJobSection() {
	const start = workflow.indexOf("    deploy-selected-artifact:");
	if (start < 0)
		throw new Error("Missing workflow job: deploy-selected-artifact");
	return workflow.slice(start);
}
