import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflow = fs.readFileSync(
	path.resolve(import.meta.dirname, "../../../.github/workflows/CI.yml"),
	"utf8",
);
const canonicalDigestCommand =
	"tar --sort=name --mtime='UTC 1970-01-01' --owner=0 --group=0 --numeric-owner --mode=0644 --format=gnu -cf - -C .vercel output | sha256sum | awk '{print $1}'";
const deploymentApprovalAction =
	"whynotsnow/snow-base-deployment-approval-action@76c3396eaa0635ef8de2c8668b77d939a292cbac";

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
		expect(workflow).not.toContain(
			"scripts/report-deployment-candidate.mjs",
		);
		expect(workflow).not.toContain("scripts/report-deployment-run.mjs");
		expect(workflow).not.toContain(
			"scripts/register-deployment-artifact.mjs",
		);
		expect(
			workflow.match(new RegExp(deploymentApprovalAction, "gu")),
		).toHaveLength(10);
		expect(workflow).toContain("operation: contract");
		expect(workflow).toContain("operation: register-artifact");
		expect(workflow).toContain("operation: candidate-callback");
		expect(workflow).toContain("operation: request-approval");
		expect(workflow).toContain("operation: wait-approval");
		expect(workflow).toContain("operation: consume-approval");
		expect(workflow).toContain("operation: deployment-callback");
		expect(workflow).toContain("idempotency-key: ${{ inputs.request_id }}");
		expect(workflow).toContain(
			"approval-id: ${{ steps.request-approval.outputs.approval-id }}",
		);
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
			candidateJob.indexOf("operation: candidate-callback"),
		).toBeGreaterThan(-1);
		expect(
			selectedJob.indexOf("phase: deployment_started"),
		).toBeGreaterThan(
			selectedJob.indexOf("Consume selected artifact approval"),
		);
		expect(selectedJob.indexOf("phase: deployment_started")).toBeLessThan(
			selectedJob.indexOf("Deploy Vercel production"),
		);
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
