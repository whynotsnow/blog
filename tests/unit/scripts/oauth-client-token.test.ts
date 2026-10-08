import { describe, expect, it } from "vitest";
import { requestOAuthClientToken } from "../../../scripts/oauth-client-token.mjs";

const apiBaseUrl = "https://api.example.test";
const clientId = "cli_blog_approval";
const clientSecret = "S".repeat(43);
const accessToken = "T".repeat(43);
const nowMs = 1_000_000;

function environment() {
	return {
		DEPLOY_APPROVAL_API_BASE_URL: apiBaseUrl,
		DEPLOYMENT_OAUTH_CLIENT_ID: clientId,
		DEPLOYMENT_OAUTH_CLIENT_SECRET: clientSecret,
		DEPLOYMENT_OAUTH_SCOPES: "deployments:verify,deployments:request",
	};
}

describe("deployment OAuth Client Credentials helper", () => {
	it("requests only the sorted scopes and validates the token lifetime", async () => {
		const fetchImpl: typeof fetch = async (input, init) => {
			expect(String(input)).toBe(`${apiBaseUrl}/api/v1/oauth/token`);
			expect(init?.method).toBe("POST");
			expect(new Headers(init?.headers).get("content-type")).toBe(
				"application/x-www-form-urlencoded",
			);
			const credentials = Buffer.from(
				new Headers(init?.headers)
					.get("authorization")
					?.slice("Basic ".length) ?? "",
				"base64",
			).toString();
			expect(credentials).toBe(
				`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`,
			);
			const body = new URLSearchParams(String(init?.body));
			expect(body.get("grant_type")).toBe("client_credentials");
			expect(body.get("resource")).toBe("snow-public-api");
			expect(body.get("scope")).toBe(
				"deployments:request deployments:verify",
			);
			return Response.json({
				access_token: accessToken,
				token_type: "Bearer",
				expires_in: 900,
				scope: "deployments:request deployments:verify",
			});
		};

		const result = await requestOAuthClientToken({
			env: environment(),
			fetchImpl,
			now: () => nowMs,
		});

		expect(result).toEqual({
			accessToken,
			apiBaseUrl,
			scopes: ["deployments:request", "deployments:verify"],
			expiresAt: 1_900,
		});
	});

	it("rejects a response with broader authority", async () => {
		await expect(
			requestOAuthClientToken({
				env: environment(),
				now: () => nowMs,
				fetchImpl: async () =>
					Response.json({
						access_token: accessToken,
						token_type: "Bearer",
						expires_in: 900,
						scope: "deployments:request deployments:run-update deployments:verify",
					}),
			}),
		).rejects.toThrow("OAuth token scopes were unexpected.");
	});

	it("does not expose token endpoint error text", async () => {
		await expect(
			requestOAuthClientToken({
				env: environment(),
				fetchImpl: async () =>
					Response.json(
						{ error: "sensitive upstream diagnostic" },
						{ status: 400 },
					),
			}),
		).rejects.toMatchObject({
			message: "OAuth token endpoint returned HTTP 400.",
		});
	});
});
