import { describe, expect, it } from "vitest";
import { waitForDeploymentApproval } from "../../../scripts/wait-deployment-approval.mjs";

const nowMs = 1_000_000;
const environment = {
	DEPLOY_APPROVAL_API_BASE_URL: "https://api.example.test",
	DEPLOYMENT_CREDENTIAL_ID: "cred_blog_approval",
	DEPLOYMENT_EXCHANGE_SECRET: "S".repeat(43),
	DEPLOY_APPROVAL_PROJECT: "blog",
	DEPLOY_APPROVAL_TARGET: "site",
	DEPLOY_APPROVAL_COMMIT_SHA: "a".repeat(40),
	DEPLOY_APPROVAL_REQUEST_ID: "approval_request_123",
	DEPLOYMENT_ARTIFACT_ID: "artifact_123",
	DEPLOYMENT_ARTIFACT_DIGEST: `sha256:${"b".repeat(64)}`,
	DEPLOY_APPROVAL_WAIT_SECONDS: "1",
	DEPLOY_APPROVAL_POLL_SECONDS: "5",
};

describe("deployment approval waiter", () => {
	it("re-exchanges a token before reading the exact approval identity", async () => {
		const calls: string[] = [];
		const fetchImpl: typeof fetch = async (input, init) => {
			calls.push(String(input));
			if (calls.length === 1) {
				const body = JSON.parse(String(init?.body));
				return Response.json({
					operationId: body.exchangeRequest.operationId,
					tokenType: "Bearer",
					accessToken: "T".repeat(43),
					principal: { namespace: "snow-service" },
					capabilities: ["deployments:request", "deployments:verify"],
					expiresAt: 1_600,
				});
			}
			return Response.json({
				ok: true,
				data: {
					id: "approval_request_123",
					projectSlug: "blog",
					target: "site",
					commitSha: "a".repeat(40),
					artifactId: "artifact_123",
					artifactDigest: `sha256:${"b".repeat(64)}`,
					status: "approved",
				},
			});
		};

		const approval = await waitForDeploymentApproval({
			env: environment,
			fetchImpl,
			now: () => nowMs,
			sleep: async () => {},
		});

		expect(approval.status).toBe("approved");
		expect(calls).toEqual([
			"https://api.example.test/api/v1/service/exchange/token",
			"https://api.example.test/api/v1/deployments/requests/approval_request_123",
		]);
	});
});
