import { createHash } from "node:crypto";
import { open, stat } from "node:fs/promises";
import { exchangeServiceToken } from "./exchange-service-token.mjs";

const apiBaseUrl = (
	process.env.DEPLOY_APPROVAL_API_BASE_URL ?? "https://api.whynotsnow.com"
).replace(/\/+$/, "");
const legacyToken = process.env.DEPLOY_APPROVAL_TOKEN;
const exchangeCredentialId = process.env.DEPLOYMENT_CREDENTIAL_ID;
const exchangeSecret = process.env.DEPLOYMENT_EXCHANGE_SECRET;
const artifactId = process.env.DEPLOY_APPROVAL_ARTIFACT_ID?.trim();
const artifactDigest = process.env.DEPLOY_APPROVAL_ARTIFACT_DIGEST?.trim();
const archivePath = process.env.DEPLOY_APPROVAL_ARCHIVE_PATH?.trim();
const archiveDigest = process.env.DEPLOY_APPROVAL_ARCHIVE_DIGEST?.trim();
const archiveSizeBytes = Number(
	process.env.DEPLOY_APPROVAL_ARCHIVE_SIZE_BYTES ?? "",
);
const purpose = process.env.DEPLOY_APPROVAL_PROMOTION_PURPOSE?.trim();
const approvalId = process.env.DEPLOY_APPROVAL_APPROVAL_ID?.trim();
const digestPattern = /^sha256:[a-f0-9]{64}$/u;
const uploadIdPattern = /^[a-zA-Z0-9_-]{16,128}$/u;
const maximumPartSizeBytes = 8 * 1024 * 1024;
const maximumPartCount = 64;

/** @param {string} message @returns {never} */
function fail(message) {
	console.error(`[artifact-promotion] ${message}`);
	process.exit(1);
}

if (!legacyToken && !exchangeCredentialId && !exchangeSecret)
	fail("missing deployment approval token or service exchange configuration");
if (!artifactId || artifactId.length > 128) fail("invalid artifact id");
if (!artifactDigest || !digestPattern.test(artifactDigest))
	fail("invalid artifact digest");
if (!archivePath) fail("missing canonical archive path");
if (!archiveDigest || !digestPattern.test(archiveDigest))
	fail("invalid archive digest");
if (!Number.isSafeInteger(archiveSizeBytes) || archiveSizeBytes <= 0)
	fail("invalid archive size");
if (purpose !== "selected-production" && purpose !== "historical-backfill")
	fail("invalid promotion purpose");
if (purpose === "selected-production" && !approvalId)
	fail("selected production requires an approval id");
if (purpose === "historical-backfill" && approvalId)
	fail("historical backfill must not provide an approval id");

/** @param {string} path */
async function hashArchive(path) {
	const hash = createHash("sha256");
	const handle = await open(path, "r");
	try {
		for await (const chunk of handle.createReadStream({
			autoClose: false,
		})) {
			hash.update(chunk);
		}
	} finally {
		await handle.close();
	}
	return `sha256:${hash.digest("hex")}`;
}

/**
 * @param {string} path
 * @param {RequestInit} init
 */
async function requestJson(path, init) {
	const token =
		exchangeCredentialId || exchangeSecret
			? (
					await exchangeServiceToken({
						env: {
							...process.env,
							DEPLOYMENT_CREDENTIAL_ID: exchangeCredentialId,
							DEPLOYMENT_EXCHANGE_SECRET: exchangeSecret,
							DEPLOYMENT_REQUESTED_CAPABILITIES:
								"deployments:artifact-promote",
						},
						operationPrefix: "blog-deployment-artifact-promotion",
					})
				).accessToken
			: legacyToken;
	let response;
	try {
		response = await fetch(`${apiBaseUrl}${path}`, {
			...init,
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				...init.headers,
			},
		});
	} catch {
		fail("promotion request failed");
	}
	const body = await response.json().catch(() => null);
	if (!response.ok || body?.ok !== true) {
		const code =
			body?.error && typeof body.error === "object" && body.error.code
				? String(body.error.code)
				: `http_${response.status}`;
		fail(`promotion rejected: ${code}`);
	}
	return body.data;
}

const archiveStats = await stat(archivePath).catch(() => null);
if (!archiveStats?.isFile()) fail("canonical archive does not exist");
if (archiveStats.size !== archiveSizeBytes)
	fail("canonical archive size changed before upload");
if ((await hashArchive(archivePath)) !== archiveDigest)
	fail("canonical archive digest changed before upload");

const artifactPath = `/api/v1/deployments/artifacts/${encodeURIComponent(artifactId)}/promotion/multipart`;
const identity = { artifactDigest, archiveDigest, archiveSizeBytes };
const started = await requestJson(artifactPath, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		...identity,
		purpose,
		...(approvalId ? { approvalId } : {}),
	}),
});

if (
	started?.reused === true &&
	started?.artifact?.archiveStatus === "promoted"
) {
	console.log("canonical artifact archive already promoted; upload reused");
	process.exit(0);
}

const uploadId = typeof started?.uploadId === "string" ? started.uploadId : "";
const partSizeBytes = started?.partSizeBytes;
const maxParts = started?.maxParts;
if (
	!uploadId ||
	!uploadIdPattern.test(uploadId) ||
	!Number.isSafeInteger(partSizeBytes) ||
	partSizeBytes <= 0 ||
	partSizeBytes > maximumPartSizeBytes ||
	!Number.isSafeInteger(maxParts) ||
	maxParts <= 0 ||
	maxParts > maximumPartCount
)
	fail("promotion init returned an invalid upload contract");
const partCount = Math.ceil(archiveSizeBytes / partSizeBytes);
if (partCount < 1 || partCount > maxParts)
	fail("canonical archive exceeds the multipart upload contract");

const handle = await open(archivePath, "r");
try {
	for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
		const offset = (partNumber - 1) * partSizeBytes;
		const length = Math.min(partSizeBytes, archiveSizeBytes - offset);
		const bytes = Buffer.allocUnsafe(length);
		const { bytesRead } = await handle.read(bytes, 0, length, offset);
		if (bytesRead !== length)
			fail(`archive part ${partNumber} could not be read`);
		const partDigest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
		await requestJson(
			`${artifactPath}/${encodeURIComponent(uploadId)}/part/${partNumber}`,
			{
				method: "PUT",
				headers: {
					"Content-Length": String(length),
					"Content-Type": "application/octet-stream",
					"X-Artifact-Digest": artifactDigest,
					"X-Part-Sha256": partDigest,
				},
				body: bytes,
			},
		);
	}
} finally {
	await handle.close();
}

const completed = await requestJson(
	`${artifactPath}/${encodeURIComponent(uploadId)}/complete`,
	{
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ ...identity, partCount }),
	},
);
if (completed?.artifact?.archiveStatus !== "promoted")
	fail("promotion completed without a promoted archive status");

console.log(
	`canonical artifact archive promoted in ${partCount} part${partCount === 1 ? "" : "s"}`,
);
