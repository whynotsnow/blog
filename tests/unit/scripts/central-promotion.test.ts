import { execFile } from "node:child_process";
import http from "node:http";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

async function withServer(
	handler: (
		request: http.IncomingMessage,
		body: string,
	) => { status: number; body: string },
	callback: (baseUrl: string) => Promise<void>,
) {
	const server = http.createServer((request, response) => {
		const chunks: Buffer[] = [];
		request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
		request.on("end", () => {
			const result = handler(
				request,
				Buffer.concat(chunks).toString("utf8"),
			);
			response.writeHead(result.status, {
				connection: "close",
				"content-type": "application/json",
			});
			response.end(result.body);
		});
	});
	await new Promise<void>((resolve) =>
		server.listen(0, "127.0.0.1", resolve),
	);
	const address = server.address();
	if (!address || typeof address === "string")
		throw new Error("missing test server address");
	try {
		await callback(`http://127.0.0.1:${address.port}`);
	} finally {
		server.closeAllConnections?.();
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		);
	}
}

describe("central promotion client", () => {
	it("posts the exact artifact and approval identity", async () => {
		await withServer(
			(request, body) => {
				expect(request.url).toBe(
					"/api/v1/deployments/artifacts/artifact-123/central-promotion",
				);
				expect(request.headers.authorization).toBe(
					"Bearer fixture-token",
				);
				expect(JSON.parse(body)).toEqual({
					approvalId: "approval-123",
				});
				return {
					status: 200,
					body: JSON.stringify({
						ok: true,
						data: { status: "promoted" },
					}),
				};
			},
			async (baseUrl) => {
				await execFileAsync(
					process.execPath,
					["scripts/promote-deployment-artifact.mjs"],
					{
						cwd: process.cwd(),
						env: {
							...process.env,
							DEPLOY_APPROVAL_API_BASE_URL: baseUrl,
							DEPLOY_APPROVAL_TOKEN: "fixture-token",
							DEPLOY_APPROVAL_ARTIFACT_ID: "artifact-123",
							DEPLOY_APPROVAL_APPROVAL_ID: "approval-123",
						},
					},
				);
			},
		);
	});

	it("fails closed when central promotion rejects approval or identity", async () => {
		await withServer(
			() => ({
				status: 409,
				body: JSON.stringify({
					ok: false,
					error: { code: "artifact_identity_mismatch" },
				}),
			}),
			async (baseUrl) => {
				let stderr = "";
				try {
					await execFileAsync(
						process.execPath,
						["scripts/promote-deployment-artifact.mjs"],
						{
							cwd: process.cwd(),
							env: {
								...process.env,
								DEPLOY_APPROVAL_API_BASE_URL: baseUrl,
								DEPLOY_APPROVAL_TOKEN: "fixture-token",
								DEPLOY_APPROVAL_ARTIFACT_ID: "artifact-123",
								DEPLOY_APPROVAL_APPROVAL_ID: "approval-123",
							},
							encoding: "utf8",
						},
					);
				} catch (error) {
					stderr = String(error.stderr);
				}
				expect(stderr).toContain("artifact_identity_mismatch");
			},
		);
	});
});
