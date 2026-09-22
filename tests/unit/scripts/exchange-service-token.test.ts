import { describe, expect, it } from "vitest";
import { exchangeServiceToken } from "../../../scripts/exchange-service-token.mjs";

const apiBaseUrl = "https://api.example.test";
const credentialId = "cred_blog_approval";
const exchangeSecret = "S".repeat(43);
const accessToken = "T".repeat(43);
const nowMs = 1_000_000;

function environment() {
	return {
		DEPLOY_APPROVAL_API_BASE_URL: apiBaseUrl,
		DEPLOYMENT_CREDENTIAL_ID: credentialId,
		DEPLOYMENT_EXCHANGE_SECRET: exchangeSecret,
		DEPLOYMENT_REQUESTED_CAPABILITIES:
			"deployments:verify,deployments:request",
	};
}

describe("generic deployment Service Exchange helper", () => {
	it("requests only the sorted capabilities and validates the current token lifetime", async () => {
		const fetchImpl: typeof fetch = async (_input, init) => {
			const body = JSON.parse(String(init?.body));
			return Response.json({
				operationId: body.exchangeRequest.operationId,
				tokenType: "Bearer",
				accessToken,
				principal: { namespace: "snow-service" },
				capabilities: ["deployments:request", "deployments:verify"],
				expiresAt: 1_900,
			});
		};

		const result = await exchangeServiceToken({
			env: environment(),
			fetchImpl,
			now: () => nowMs,
			operationPrefix: "blog-test",
		});

		expect(result).toMatchObject({
			accessToken,
			apiBaseUrl,
			capabilities: ["deployments:request", "deployments:verify"],
			expiresAt: 1_900,
		});
	});

	it("rejects a response with broader authority", async () => {
		const fetchImpl: typeof fetch = async (_input, init) => {
			const body = JSON.parse(String(init?.body));
			return Response.json({
				operationId: body.exchangeRequest.operationId,
				tokenType: "Bearer",
				accessToken,
				principal: { namespace: "snow-service" },
				capabilities: [
					"deployments:request",
					"deployments:run-update",
					"deployments:verify",
				],
				expiresAt: 1_600,
			});
		};

		await expect(
			exchangeServiceToken({
				env: environment(),
				fetchImpl,
				now: () => nowMs,
			}),
		).rejects.toThrow("Service exchange capabilities were unexpected.");
	});
});
