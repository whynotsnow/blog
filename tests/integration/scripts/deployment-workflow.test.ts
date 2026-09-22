import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CANONICAL_GNU_TAR_OPTIONS } from "../../../scripts/vercel-archive.mjs";

const workflow = fs.readFileSync(
	path.resolve(import.meta.dirname, "../../../.github/workflows/CI.yml"),
	"utf8",
);
const backfillWorkflow = fs.readFileSync(
	path.resolve(
		import.meta.dirname,
		"../../../.github/workflows/backfill-vercel-artifacts.yml",
	),
	"utf8",
);
const canonicalWorkflowTarOptions = CANONICAL_GNU_TAR_OPTIONS.map((option) =>
	option.includes(" ")
		? `${option.slice(0, option.indexOf("=") + 1)}'${option.slice(option.indexOf("=") + 1)}'`
		: option,
).join(" ");
const canonicalDigestCommand = `tar ${canonicalWorkflowTarOptions} -cf - -C .vercel output | sha256sum | awk '{print $1}'`;
const deploymentApprovalAction =
	"whynotsnow/snow-base-deployment-approval-action@76c3396eaa0635ef8de2c8668b77d939a292cbac";
const deploymentRunReporter = fs.readFileSync(
	path.resolve(
		import.meta.dirname,
		"../../../scripts/report-deployment-run.mjs",
	),
	"utf8",
);
const serviceExchange = fs.readFileSync(
	path.resolve(
		import.meta.dirname,
		"../../../scripts/exchange-service-token.mjs",
	),
	"utf8",
);
const productionSmoke = fs.readFileSync(
	path.resolve(import.meta.dirname, "../../../scripts/production-smoke.mjs"),
	"utf8",
);
const smokeEvidenceReporter = fs.readFileSync(
	path.resolve(
		import.meta.dirname,
		"../../../scripts/report-deployment-smoke.mjs",
	),
	"utf8",
);
const approvalVerifier = fs.readFileSync(
	path.resolve(
		import.meta.dirname,
		"../../../scripts/verify-deployment-approval.mjs",
	),
	"utf8",
);
const artifactPromotion = fs.readFileSync(
	path.resolve(
		import.meta.dirname,
		"../../../scripts/promote-deployment-artifact.mjs",
	),
	"utf8",
);

function jobSection(jobName: string, nextJobName: string) {
	const start = workflow.indexOf(`    ${jobName}:`);
	const end = workflow.indexOf(`    ${nextJobName}:`, start);
	if (start < 0 || end < 0)
		throw new Error(`Missing workflow job: ${jobName}`);
	return workflow.slice(start, end);
}

describe("Vercel artifact workflow contract", () => {
	it("uses one metadata-normalizing digest command everywhere", () => {
		expect(CANONICAL_GNU_TAR_OPTIONS).toEqual([
			"--sort=name",
			"--mtime=UTC 1970-01-01",
			"--owner=0",
			"--group=0",
			"--numeric-owner",
			"--mode=0644",
			"--format=gnu",
		]);
		expect(CANONICAL_GNU_TAR_OPTIONS).not.toContain("--no-xattrs");
		expect(CANONICAL_GNU_TAR_OPTIONS).not.toContain("--no-acls");
		const commandMatches = workflow
			.split("\n")
			.filter((line) => line.includes(canonicalDigestCommand));

		expect(commandMatches).toHaveLength(4);
		expect(
			commandMatches.every((line) =>
				line.includes(canonicalDigestCommand),
			),
		).toBe(true);
	});

	it("stores the Vercel upload without ZIP compression for central streaming", () => {
		const buildJob = jobSection(
			"build-vercel-artifact",
			"deploy-production",
		);
		const uploadStep = buildJob.match(
			/ {12}- name: Upload Vercel artifact\n([\s\S]*?)(?=\n {12}- name:)/,
		)?.[1];
		expect(uploadStep).toBeDefined();
		expect(uploadStep).toContain("uses: actions/upload-artifact@v4");
		expect(uploadStep?.match(/^\s+compression-level: (.+)$/gm)).toEqual([
			"                  compression-level: 0",
		]);
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
			"node scripts/create-vercel-archive.mjs .vercel/output vercel-output.tar.gz vercel-output-metadata.json",
		);
		expect(buildJob).toContain("vercel-output.tar.gz");
		expect(buildJob).toContain("vercel-output-metadata.json");
		expect(buildJob).toContain(
			"node scripts/normalize-vercel-artifact.mjs .artifact-roundtrip .vercel/output",
		);
		expect(buildJob).toContain(
			"node scripts/verify-vercel-archive.mjs .artifact-roundtrip .vercel/output",
		);
		expect(
			workflow.match(/node scripts\/normalize-vercel-artifact\.mjs/g),
		).toHaveLength(4);
	});

	it("extracts exact-ID downloads directly into the canonical artifact root", () => {
		const downloadSteps = [
			...workflow.matchAll(
				/ {12}- name: [^\n]+\n {14}uses: actions\/download-artifact@v4\n([\s\S]*?)(?=\n {12}- name:)/g,
			),
		]
			.map((match) => match[1])
			.filter((step) => step.includes("artifact-ids:"));
		expect(downloadSteps).toHaveLength(2);
		for (const step of downloadSteps) {
			expect(step.match(/^\s+merge-multiple: (.+)$/gm)).toEqual([
				"                  merge-multiple: true",
			]);
		}
		expect(downloadSteps[0]).toContain(
			"artifact-ids: ${{ steps.upload.outputs.artifact-id }}",
		);
		expect(downloadSteps[0]).toContain("path: .artifact-roundtrip");
		expect(downloadSteps[1]).toContain(
			"artifact-ids: ${{ inputs.artifact_github_id }}",
		);
		expect(downloadSteps[1]).toContain("path: .artifact-download");
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
		expect(candidateJob).toContain(
			"node scripts/verify-vercel-archive.mjs .artifact-download .vercel/output",
		);
		expect(selectedJob).toContain(
			"node scripts/verify-vercel-archive.mjs .artifact-download .vercel/output",
		);
		expect(candidateJob).toContain(
			'"canonicalArchiveName":"vercel-output.tar.gz"',
		);
		expect(candidateJob).toContain(
			'"capability":"central-artifact-promotion"',
		);
	});

	it("uses the target-neutral snow-base callback contract", () => {
		expect(workflow).toContain("scripts/report-deployment-run.mjs");
		expect(workflow).toContain("scripts/production-smoke.mjs");
		expect(workflow).toContain("scripts/report-deployment-smoke.mjs");
		expect(workflow).toContain("id: classify-smoke");
		expect(workflow).toContain("failure-code=deployment_workflow_failed");
		expect(workflow).toContain("failure-code=smoke_skipped");
		expect(workflow).toContain("failure-code=smoke_outcome_unknown");
		expect(workflow).not.toContain(
			"steps.public-smoke.outputs.smoke-failure-code || 'deployment_workflow_failed'",
		);
		expect(workflow).not.toContain(
			"scripts/register-deployment-artifact.mjs",
		);
		expect(
			workflow.match(new RegExp(deploymentApprovalAction, "gu")),
		).toHaveLength(7);
		expect(workflow).toContain("operation: contract");
		expect(workflow).toContain("operation: register-artifact");
		expect(workflow).toContain("operation: candidate-callback");
		expect(workflow).toContain("operation: request-approval");
		expect(workflow).toContain("operation: consume-approval");
		expect(workflow).toContain("scripts/wait-deployment-approval.mjs");
		expect(workflow).not.toContain("operation: deployment-callback");
		expect(workflow).toContain("idempotency-key: ${{ inputs.request_id }}");
		expect(workflow).toContain(
			"approval-id: ${{ steps.request-approval.outputs.approval-id }}",
		);
		expect(workflow).toContain("always() && github.event_name");
		expect(deploymentRunReporter).toContain(
			"/api/v1/deployments/runs/update",
		);
		expect(deploymentRunReporter).toContain(
			"deployment-run-id=${deploymentRunId}",
		);
		expect(productionSmoke).toContain("/robots.txt");
		expect(productionSmoke).toContain("smoke-outcome=");
		expect(productionSmoke).toContain("smoke-failure-code=");
		expect(productionSmoke).toContain("public_smoke_http_status");
		expect(productionSmoke).toContain("public_smoke_marker_missing");
		expect(productionSmoke).toContain("public_smoke_request_failed");
		expect(smokeEvidenceReporter).toContain(
			"/api/v1/deployments/runs/${encodeURIComponent(deploymentRunId)}/smoke",
		);
		expect(smokeEvidenceReporter).toContain("deploymentRunId");
		expect(smokeEvidenceReporter).toContain(
			'outcome !== "succeeded" && outcome !== "failed"',
		);
		expect(smokeEvidenceReporter).toContain(
			'outcome === "failed" && !normalizedFailureCode',
		);
		expect(approvalVerifier).toContain(
			"DEPLOY_APPROVAL_WORKFLOW_MODE=legacy-break-glass",
		);
		expect(approvalVerifier).toContain(
			'workflowMode !== "legacy-break-glass"',
		);
		expect(smokeEvidenceReporter).toContain(
			"DEPLOY_APPROVAL_WORKFLOW_MODE 必须显式设置为 legacy-break-glass",
		);
		expect(artifactPromotion).toContain(
			"legacy fallback requires explicit workflow mode=legacy-break-glass",
		);
		expect(smokeEvidenceReporter).toContain(
			"succeeded smoke evidence 不得携带 failureCode",
		);
	});

	it("defaults manual dispatch away from legacy and keeps backfill on modern exchange", () => {
		const modeInput = workflow.slice(
			workflow.indexOf("            mode:"),
			workflow.indexOf("            project_slug:"),
		);
		const legacyJob = jobSection(
			"deploy-production",
			"register-site-candidate",
		);
		const backfillJob = backfillWorkflow.slice(
			backfillWorkflow.indexOf("    backfill:"),
		);

		expect(modeInput).toContain("default: candidate");
		expect(modeInput).toContain("- legacy-break-glass");
		expect(modeInput).not.toContain("default: production");
		expect(legacyJob).toContain("inputs.mode == 'legacy-break-glass'");
		expect(legacyJob).not.toContain("inputs.mode == ''");
		expect(legacyJob).toContain("break_glass_reason");
		expect(legacyJob).toContain(
			"DEPLOY_APPROVAL_WORKFLOW_MODE: legacy-break-glass",
		);

		expect(backfillJob).toContain("environment: production");
		expect(backfillJob).toContain(
			"DEPLOY_APPROVAL_WORKFLOW_MODE: historical-backfill",
		);
		expect(backfillJob).toContain(
			"SNOW_BASE_DEPLOYMENT_PROMOTION_EXCHANGE_SECRET",
		);
		expect(artifactPromotion).toContain("deployments:artifact-promote");
		expect(backfillJob).not.toContain("DEPLOY_APPROVAL_TOKEN:");
		expect(backfillJob).not.toContain("legacy-break-glass");
	});

	it("reports candidate completion after registration and deployment completion after Vercel", () => {
		const candidateJob = jobSection(
			"report-site-candidate-completion",
			"deploy-selected-artifact",
		);
		const selectedJob = selectedJobSection();
		const completionJob = selectedJob.slice(
			selectedJob.indexOf("report-selected-deployment-run-completion:"),
		);

		expect(
			candidateJob.indexOf(
				"needs.register-site-candidate.outputs.artifact-id",
			),
		).toBeGreaterThan(-1);
		expect(
			candidateJob.indexOf("operation: candidate-callback"),
		).toBeGreaterThan(-1);
		expect(
			selectedJob.indexOf(
				"DEPLOYMENT_CALLBACK_PHASE: deployment_started",
			),
		).toBeGreaterThan(
			selectedJob.indexOf("Consume selected artifact approval"),
		);
		expect(
			selectedJob.indexOf(
				"DEPLOYMENT_CALLBACK_PHASE: deployment_started",
			),
		).toBeLessThan(selectedJob.indexOf("Deploy Vercel production"));
		expect(selectedJob).toContain(
			"node scripts/promote-deployment-artifact.mjs",
		);
		expect(
			selectedJob.indexOf(
				"Upload selected artifact to central R2 archive",
			),
		).toBeGreaterThan(
			selectedJob.indexOf("Wait for selected artifact approval"),
		);
		expect(
			selectedJob.indexOf(
				"Upload selected artifact to central R2 archive",
			),
		).toBeLessThan(
			selectedJob.indexOf("Consume selected artifact approval"),
		);
		expect(selectedJob).toContain(
			"DEPLOY_APPROVAL_PROMOTION_PURPOSE: selected-production",
		);
		expect(selectedJob).toContain(
			"DEPLOY_APPROVAL_WORKFLOW_MODE: selected-artifact",
		);
		expect(selectedJob).toContain(
			"DEPLOY_APPROVAL_ARCHIVE_PATH: .artifact-download/vercel-output.tar.gz",
		);
		expect(
			selectedJob.indexOf("Consume selected artifact approval"),
		).toBeLessThan(selectedJob.indexOf("Deploy Vercel production"));
		expect(selectedJob).not.toContain("vercel@latest build");
		expect(
			workflow.indexOf("report-selected-deployment-run-completion:"),
		).toBeGreaterThan(workflow.indexOf("Deploy Vercel production"));
		expect(completionJob).toContain("id: report-deployment-run");
		expect(completionJob).toContain(
			"node scripts/report-deployment-run.mjs",
		);
		expect(completionJob).toContain(
			"steps.report-deployment-run.outputs.deployment-run-id",
		);
		expect(completionJob).toContain(
			"steps.classify-smoke.outputs.failure-code",
		);
		expect(
			completionJob.indexOf("node scripts/report-deployment-run.mjs"),
		).toBeLessThan(
			completionJob.indexOf("node scripts/production-smoke.mjs"),
		);
		expect(
			completionJob.indexOf("node scripts/production-smoke.mjs"),
		).toBeLessThan(
			completionJob.indexOf("node scripts/report-deployment-smoke.mjs"),
		);
	});

	it("isolates run-update callbacks from the deployment approval token", () => {
		const selectedJob = selectedJobSection();
		const legacyProductionJob = jobSection(
			"deploy-production",
			"register-site-candidate",
		);
		const deploymentSecretPreflight = selectedJob.slice(
			selectedJob.indexOf(
				"            - name: Validate deployment secrets",
			),
			selectedJob.indexOf(
				"            - name: Download selected GitHub artifact",
			),
		);
		const startCallback = selectedJob.slice(
			selectedJob.indexOf(
				"            - name: Report deployment run in progress",
			),
			selectedJob.indexOf("            - name: Deploy Vercel production"),
		);
		const completionJobStart = workflow.indexOf(
			"    report-selected-deployment-run-completion:",
		);
		const completionJob = workflow.slice(completionJobStart);
		const completionCallback = completionJob.slice(
			completionJob.indexOf(
				"            - name: Report deployment run completion",
			),
			completionJob.indexOf(
				"            - name: Run public production smoke",
			),
		);

		for (const callbackStep of [startCallback, completionCallback]) {
			expect(callbackStep).toContain(
				"node scripts/report-deployment-run.mjs",
			);
			expect(callbackStep).toContain(
				"SNOW_BASE_DEPLOYMENT_RUN_CREDENTIAL_ID: ${{ vars.SNOW_BASE_DEPLOYMENT_RUN_CREDENTIAL_ID }}",
			);
			expect(callbackStep).toContain(
				"SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET: ${{ secrets.SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET }}",
			);
			expect(callbackStep).not.toContain("DEPLOY_APPROVAL_TOKEN");
		}
		expect(deploymentSecretPreflight).toContain(
			"SNOW_BASE_DEPLOYMENT_RUN_CREDENTIAL_ID",
		);
		expect(deploymentSecretPreflight).toContain(
			"SNOW_BASE_DEPLOYMENT_RUN_CREDENTIAL_ID: ${{ vars.SNOW_BASE_DEPLOYMENT_RUN_CREDENTIAL_ID }}",
		);
		expect(deploymentSecretPreflight).toContain(
			"SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET",
		);
		expect(deploymentSecretPreflight).toContain(
			"SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET: ${{ secrets.SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET }}",
		);
		expect(deploymentSecretPreflight).not.toContain(
			"DEPLOY_APPROVAL_TOKEN",
		);
		expect(deploymentSecretPreflight).toContain(
			"grep -Eq '^[A-Za-z0-9_-]{43}$'",
		);
		expect(serviceExchange).toContain("/api/v1/service/exchange/token");
		expect(deploymentRunReporter).toContain(
			"DEPLOYMENT_REQUESTED_CAPABILITIES: runUpdateCapability",
		);
		expect(deploymentRunReporter).toContain(
			"/api/v1/deployments/runs/update",
		);
		expect(legacyProductionJob).toContain(
			"DEPLOY_APPROVAL_TOKEN: ${{ secrets.DEPLOY_APPROVAL_TOKEN }}",
		);
		expect(legacyProductionJob).toContain(
			"DEPLOY_APPROVAL_WORKFLOW_MODE: legacy-break-glass",
		);
		expect(workflow).toContain(
			"SNOW_BASE_DEPLOYMENT_APPROVAL_CREDENTIAL_ID",
		);
		expect(workflow).toContain(
			"SNOW_BASE_DEPLOYMENT_PROMOTION_CREDENTIAL_ID",
		);
		expect(serviceExchange).toContain("DEPLOYMENT_REQUESTED_CAPABILITIES");
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
