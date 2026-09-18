import { describe, expect, it, vi } from "vitest";
import { reportDeploymentRun } from "../../../scripts/report-deployment-run.mjs";

const apiBaseUrl = "https://api.example.test";
const credentialId = "cred_blog_deployment_run";
const exchangeSecret = "S".repeat(43);
const accessToken = "T".repeat(43);
const issuedAtMs = 1_000_000;

function environment(overrides: Record<string, string | undefined> = {}) {
	return {
		DEPLOY_APPROVAL_API_BASE_URL: apiBaseUrl,
		SNOW_BASE_DEPLOYMENT_RUN_CREDENTIAL_ID: credentialId,
		SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET: exchangeSecret,
		DEPLOY_APPROVAL_PROJECT: "blog",
		DEPLOY_APPROVAL_TARGET: "site",
		DEPLOY_APPROVAL_COMMIT_SHA: "a".repeat(40),
		DEPLOY_APPROVAL_REQUEST_ID: "approval_request_123",
		DEPLOYMENT_ARTIFACT_ID: "artifact_123",
		DEPLOYMENT_ARTIFACT_DIGEST: `sha256:${"b".repeat(64)}`,
		GITHUB_RUN_ID: "123456",
		GITHUB_SERVER_URL: "https://github.com",
		GITHUB_REPOSITORY: "whynotsnow/blog",
		DEPLOYMENT_CALLBACK_STATUS: "in_progress",
		DEPLOYMENT_CALLBACK_PHASE: "deployment_started",
		...overrides,
	};
}

function exchangeResult(
	operationId: string,
	overrides: Record<string, unknown> = {},
) {
	return {
		operationId,
		tokenType: "Bearer",
		accessToken,
		principal: { namespace: "snow-service" },
		capabilities: ["deployments:run-update"],
		expiresAt: issuedAtMs / 1000 + 600,
		...overrides,
	};
}

describe("deployment run Service Exchange callback", () => {
	it("uses one short-lived run-update token and returns the exact run ID", async () => {
		const calls: Array<{ url: string; init: RequestInit }> = [];
		const fetchImpl: typeof fetch = async (input, init) => {
			const call = { url: String(input), init: init ?? {} };
			calls.push(call);
			if (calls.length === 1) {
				const body = JSON.parse(String(call.init.body));
				return Response.json(
					exchangeResult(body.exchangeRequest.operationId),
				);
			}
			return Response.json({ ok: true, data: { id: "run_0123456789" } });
		};
		const output: string[] = [];

		const deploymentRunId = await reportDeploymentRun({
			env: environment({
				DEPLOY_APPROVAL_TOKEN: "legacy-approval-token-must-not-be-used",
				GITHUB_OUTPUT: "/tmp/github-output",
			}),
			fetchImpl,
			now: () => issuedAtMs,
			appendOutput: async (path, value) => {
				output.push(`${path}:${value}`);
			},
		});

		expect(deploymentRunId).toBe("run_0123456789");
		expect(calls).toHaveLength(2);
		expect(calls[0]?.url).toBe(
			`${apiBaseUrl}/api/v1/service/exchange/token`,
		);
		expect(new Headers(calls[0]?.init.headers).get("authorization")).toBe(
			`Snow-Service-Exchange ${exchangeSecret}`,
		);
		const exchangeBody = JSON.parse(String(calls[0]?.init.body));
		expect(exchangeBody.exchangeRequest).toMatchObject({
			credentialId,
			purpose: "api-token",
			requestedCapabilities: ["deployments:run-update"],
			issuedAt: 1000,
			expiresAt: 1060,
		});
		expect(exchangeBody.exchangeRequest.operationId).toMatch(
			/^blog-deployment-run-/u,
		);
		expect(calls[1]?.url).toBe(
			`${apiBaseUrl}/api/v1/deployments/runs/update`,
		);
		expect(new Headers(calls[1]?.init.headers).get("authorization")).toBe(
			`Bearer ${accessToken}`,
		);
		expect(JSON.parse(String(calls[1]?.init.body))).toMatchObject({
			projectSlug: "blog",
			target: "site",
			status: "in_progress",
			phase: "deployment_started",
		});
		expect(output).toEqual([
			"/tmp/github-output:deployment-run-id=run_0123456789\n",
		]);
	});

	it("fails closed when the exchange response grants broader authority", async () => {
		let requestCount = 0;
		const fetchImpl: typeof fetch = async (_input, init) => {
			requestCount += 1;
			const body = JSON.parse(String(init?.body));
			return Response.json(
				exchangeResult(body.exchangeRequest.operationId, {
					capabilities: [
						"deployments:run-update",
						"deployments:request",
					],
				}),
			);
		};

		await expect(
			reportDeploymentRun({
				env: environment(),
				fetchImpl,
				now: () => issuedAtMs,
			}),
		).rejects.toThrow("Service exchange capabilities were unexpected.");
		expect(requestCount).toBe(1);
	});

	it("fails closed when the exchanged token lifetime is outside contract", async () => {
		const fetchImpl: typeof fetch = async (_input, init) => {
			const body = JSON.parse(String(init?.body));
			return Response.json(
				exchangeResult(body.exchangeRequest.operationId, {
					expiresAt: issuedAtMs / 1000 + 1200,
				}),
			);
		};

		await expect(
			reportDeploymentRun({
				env: environment(),
				fetchImpl,
				now: () => issuedAtMs,
			}),
		).rejects.toThrow("Service exchange token lifetime was unexpected.");
	});

	it("does not fall back to the legacy approval token when Service Exchange configuration is missing", async () => {
		const fetchImpl = vi.fn<typeof fetch>();

		await expect(
			reportDeploymentRun({
				env: environment({
					SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET: undefined,
					DEPLOY_APPROVAL_TOKEN:
						"legacy-approval-token-must-not-be-used",
				}),
				fetchImpl,
			}),
		).rejects.toThrow("SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET");
		expect(fetchImpl).not.toHaveBeenCalled();
	});
});
