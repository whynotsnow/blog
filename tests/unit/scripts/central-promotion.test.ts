import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const fixtureToken = "fixture-token-must-not-be-logged";

async function withServer(
	handler: (
		request: http.IncomingMessage,
		body: Buffer,
	) => { status: number; body: string },
	callback: (baseUrl: string) => Promise<void>,
) {
	const server = http.createServer((request, response) => {
		const chunks: Buffer[] = [];
		request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
		request.on("end", () => {
			const result = handler(request, Buffer.concat(chunks));
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

function sha256(bytes: Buffer) {
	return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function withArchive(
	callback: (fixture: {
		archivePath: string;
		archive: Buffer;
		archiveDigest: string;
	}) => Promise<void>,
) {
	const root = fs.mkdtempSync(path.join(process.cwd(), ".tmp-promotion-"));
	const archivePath = path.join(root, "vercel-output.tar.gz");
	const archive = Buffer.from("abcdefghij", "utf8");
	fs.writeFileSync(archivePath, archive);
	try {
		await callback({
			archivePath,
			archive,
			archiveDigest: sha256(archive),
		});
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
}

function promotionEnv(
	baseUrl: string,
	archivePath: string,
	archiveDigest: string,
	overrides: NodeJS.ProcessEnv = {},
) {
	return {
		...process.env,
		DEPLOY_APPROVAL_API_BASE_URL: baseUrl,
		DEPLOY_APPROVAL_WORKFLOW_MODE: "legacy",
		DEPLOY_APPROVAL_TOKEN: fixtureToken,
		DEPLOY_APPROVAL_ARTIFACT_ID: "artifact-123",
		DEPLOY_APPROVAL_ARTIFACT_DIGEST: `sha256:${"1".repeat(64)}`,
		DEPLOY_APPROVAL_APPROVAL_ID: "approval-123",
		DEPLOY_APPROVAL_ARCHIVE_PATH: archivePath,
		DEPLOY_APPROVAL_ARCHIVE_DIGEST: archiveDigest,
		DEPLOY_APPROVAL_ARCHIVE_SIZE_BYTES: "10",
		DEPLOY_APPROVAL_PROMOTION_PURPOSE: "selected-production",
		...overrides,
	};
}

describe("multipart promotion client", () => {
	it("uploads exact bounded parts and completes the same artifact identity", async () => {
		await withArchive(async ({ archivePath, archive, archiveDigest }) => {
			const requests: string[] = [];
			await withServer(
				(request, body) => {
					requests.push(`${request.method} ${request.url}`);
					expect(request.headers.authorization).toBe(
						`Bearer ${fixtureToken}`,
					);
					if (
						request.method === "POST" &&
						request.url?.endsWith("/multipart")
					) {
						expect(JSON.parse(body.toString("utf8"))).toEqual({
							artifactDigest: `sha256:${"1".repeat(64)}`,
							archiveDigest,
							archiveSizeBytes: 10,
							purpose: "selected-production",
							approvalId: "approval-123",
						});
						return {
							status: 200,
							body: JSON.stringify({
								ok: true,
								data: {
									uploadId: "upload1234567890",
									reused: false,
									partSizeBytes: 4,
									maxParts: 3,
								},
							}),
						};
					}
					const part = request.url?.match(/\/part\/(\d+)$/u);
					if (request.method === "PUT" && part) {
						const partNumber = Number(part[1]);
						const expected = archive.subarray(
							(partNumber - 1) * 4,
							Math.min(partNumber * 4, archive.length),
						);
						expect(body).toEqual(expected);
						expect(request.headers["x-artifact-digest"]).toBe(
							`sha256:${"1".repeat(64)}`,
						);
						expect(request.headers["x-part-sha256"]).toBe(
							sha256(expected),
						);
						expect(request.headers["content-length"]).toBe(
							String(expected.length),
						);
						return {
							status: 200,
							body: JSON.stringify({
								ok: true,
								data: { partNumber },
							}),
						};
					}
					expect(request.method).toBe("POST");
					expect(request.url).toContain("/upload1234567890/complete");
					expect(JSON.parse(body.toString("utf8"))).toEqual({
						artifactDigest: `sha256:${"1".repeat(64)}`,
						archiveDigest,
						archiveSizeBytes: 10,
						partCount: 3,
					});
					return {
						status: 200,
						body: JSON.stringify({
							ok: true,
							data: { artifact: { archiveStatus: "promoted" } },
						}),
					};
				},
				async (baseUrl) => {
					await execFileAsync(
						process.execPath,
						["scripts/promote-deployment-artifact.mjs"],
						{
							cwd: process.cwd(),
							env: promotionEnv(
								baseUrl,
								archivePath,
								archiveDigest,
							),
						},
					);
				},
			);
			expect(requests).toEqual([
				"POST /api/v1/deployments/artifacts/artifact-123/promotion/multipart",
				"PUT /api/v1/deployments/artifacts/artifact-123/promotion/multipart/upload1234567890/part/1",
				"PUT /api/v1/deployments/artifacts/artifact-123/promotion/multipart/upload1234567890/part/2",
				"PUT /api/v1/deployments/artifacts/artifact-123/promotion/multipart/upload1234567890/part/3",
				"POST /api/v1/deployments/artifacts/artifact-123/promotion/multipart/upload1234567890/complete",
			]);
		});
	});

	it("accepts an identity-exact already promoted archive without uploading parts", async () => {
		await withArchive(async ({ archivePath, archiveDigest }) => {
			let requestCount = 0;
			await withServer(
				(request, body) => {
					requestCount += 1;
					expect(request.url).toBe(
						"/api/v1/deployments/artifacts/artifact-123/promotion/multipart",
					);
					expect(JSON.parse(body.toString("utf8"))).toEqual({
						artifactDigest: `sha256:${"1".repeat(64)}`,
						archiveDigest,
						archiveSizeBytes: 10,
						purpose: "historical-backfill",
					});
					return {
						status: 200,
						body: JSON.stringify({
							ok: true,
							data: {
								uploadId: null,
								reused: true,
								artifact: { archiveStatus: "promoted" },
							},
						}),
					};
				},
				async (baseUrl) => {
					await execFileAsync(
						process.execPath,
						["scripts/promote-deployment-artifact.mjs"],
						{
							cwd: process.cwd(),
							env: promotionEnv(
								baseUrl,
								archivePath,
								archiveDigest,
								{
									DEPLOY_APPROVAL_APPROVAL_ID: "",
									DEPLOY_APPROVAL_PROMOTION_PURPOSE:
										"historical-backfill",
								},
							),
						},
					);
				},
			);
			expect(requestCount).toBe(1);
		});
	});

	it("fails closed with a stable code and never logs the token", async () => {
		await withArchive(async ({ archivePath, archiveDigest }) => {
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
								env: promotionEnv(
									baseUrl,
									archivePath,
									archiveDigest,
								),
								encoding: "utf8",
							},
						);
					} catch (error) {
						stderr = String((error as { stderr?: string }).stderr);
					}
					expect(stderr).toContain("artifact_identity_mismatch");
					expect(stderr).not.toContain(fixtureToken);
				},
			);
		});
	});

	it("does not fall back to the legacy token without explicit legacy mode", async () => {
		await withArchive(async ({ archivePath, archiveDigest }) => {
			let requestCount = 0;
			await withServer(
				() => {
					requestCount += 1;
					return {
						status: 500,
						body: JSON.stringify({ ok: false }),
					};
				},
				async (baseUrl) => {
					let stderr = "";
					try {
						await execFileAsync(
							process.execPath,
							["scripts/promote-deployment-artifact.mjs"],
							{
								cwd: process.cwd(),
								env: promotionEnv(
									baseUrl,
									archivePath,
									archiveDigest,
									{
										DEPLOY_APPROVAL_WORKFLOW_MODE:
											"selected-artifact",
										DEPLOY_APPROVAL_TOKEN: fixtureToken,
										DEPLOYMENT_CREDENTIAL_ID: "",
										DEPLOYMENT_EXCHANGE_SECRET: "",
									},
								),
								encoding: "utf8",
							},
						);
					} catch (error) {
						stderr = String((error as { stderr?: string }).stderr);
					}
					expect(stderr).toContain("complete Service Exchange");
					expect(stderr).not.toContain(fixtureToken);
					expect(requestCount).toBe(0);
				},
			);
		});
	});
});
