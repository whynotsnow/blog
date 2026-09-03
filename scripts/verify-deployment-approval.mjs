import { execFileSync } from "node:child_process";

const apiBaseUrl = (
	process.env.DEPLOY_APPROVAL_API_BASE_URL ??
	process.env.SNOW_BASE_API_BASE_URL ??
	"https://api.whynotsnow.com"
).replace(/\/+$/, "");
const approvalToken =
	process.env.DEPLOY_APPROVAL_TOKEN ??
	process.env.SNOW_BASE_DEPLOY_APPROVAL_TOKEN;
const projectSlug = process.env.DEPLOY_APPROVAL_PROJECT ?? "snow-base";
const commitSha =
	process.env.DEPLOY_APPROVAL_COMMIT_SHA ??
	process.env.SNOW_BASE_DEPLOY_COMMIT_SHA;
const target =
	process.env.DEPLOY_APPROVAL_TARGET ?? process.env.SNOW_BASE_DEPLOY_TARGET;
const requestSource =
	process.env.DEPLOY_APPROVAL_REQUEST_SOURCE ??
	process.env.SNOW_BASE_DEPLOY_REQUEST_SOURCE ??
	"github-actions";
const workflowMode = process.env.DEPLOY_APPROVAL_WORKFLOW_MODE ?? "legacy";
const requestId = process.env.DEPLOY_APPROVAL_REQUEST_ID;
const requestUrl =
	process.env.DEPLOY_APPROVAL_REQUEST_URL ??
	process.env.SNOW_BASE_DEPLOY_REQUEST_URL;
const artifactType =
	process.env.DEPLOY_APPROVAL_ARTIFACT_TYPE ??
	process.env.SNOW_BASE_DEPLOY_ARTIFACT_TYPE;
const providedArtifactId = process.env.DEPLOY_APPROVAL_ARTIFACT_ID;
const artifactDigest =
	process.env.DEPLOY_APPROVAL_ARTIFACT_DIGEST ??
	process.env.SNOW_BASE_DEPLOY_ARTIFACT_DIGEST;
const artifactStorageProvider =
	process.env.DEPLOY_APPROVAL_ARTIFACT_STORAGE_PROVIDER ?? "github-actions";
const artifactStorageKey = process.env.DEPLOY_APPROVAL_ARTIFACT_STORAGE_KEY;
const changeSummary =
	process.env.DEPLOY_APPROVAL_CHANGE_SUMMARY ??
	process.env.SNOW_BASE_DEPLOY_CHANGE_SUMMARY;
const validationSummary =
	process.env.DEPLOY_APPROVAL_VALIDATION_SUMMARY ??
	process.env.SNOW_BASE_DEPLOY_VALIDATION_SUMMARY;
const runId = process.env.GITHUB_RUN_ID;
const runAttempt = process.env.GITHUB_RUN_ATTEMPT;
const waitSeconds = Number.parseInt(
	process.env.DEPLOY_APPROVAL_WAIT_SECONDS ??
		process.env.SNOW_BASE_DEPLOY_APPROVAL_WAIT_SECONDS ??
		"900",
	10,
);
const pollSeconds = Number.parseInt(
	process.env.DEPLOY_APPROVAL_POLL_SECONDS ??
		process.env.SNOW_BASE_DEPLOY_APPROVAL_POLL_SECONDS ??
		"15",
	10,
);

let deploymentArtifact =
	providedArtifactId && artifactDigest
		? { id: providedArtifactId, digest: artifactDigest }
		: undefined;

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
	console.error(message);
	process.exit(1);
}

function approvalCreateUrl() {
	const params = new URLSearchParams({
		projectSlug,
		target: target ?? "",
		commitSha: commitSha ?? "",
	});
	if (requestUrl) params.set("requestUrl", requestUrl);
	if (deploymentArtifact?.id) params.set("artifactId", deploymentArtifact.id);
	if (deploymentArtifact?.digest) {
		params.set("artifactDigest", deploymentArtifact.digest);
	}
	return `https://admin.whynotsnow.com/deployments?${params.toString()}`;
}

/**
 * @param {Response} response
 */
async function readJsonResponse(response) {
	return await response.json().catch(() => null);
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} body
 */
async function postJson(path, body) {
	const response = await fetch(`${apiBaseUrl}${path}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${approvalToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	return { response, body: await readJsonResponse(response) };
}

/**
 * @param {string} path
 */
async function getJson(path) {
	const response = await fetch(`${apiBaseUrl}${path}`, {
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${approvalToken}`,
		},
	});

	return { response, body: await readJsonResponse(response) };
}

/**
 * @param {Response} response
 * @param {unknown} body
 */
function apiErrorCode(response, body) {
	if (
		body &&
		typeof body === "object" &&
		"ok" in body &&
		body.ok === false &&
		"error" in body &&
		body.error &&
		typeof body.error === "object" &&
		"code" in body.error
	) {
		return String(body.error.code);
	}
	return `http_${response.status}`;
}

/**
 * @param {number} ms
 */
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function approvalNote() {
	const base = `生产部署 workflow 请求发布 ${projectSlug}/${target}，目标提交 ${commitSha}。`;
	if (!artifactType && !artifactDigest) return base;
	return `${base} 构建产物：${artifactType ?? "unknown"} ${artifactDigest ?? "digest-unset"}。`;
}

/**
 * @param {string} value
 * @param {number} [maxLength]
 */
function truncateText(value, maxLength = 500) {
	const trimmed = value.trim();
	return trimmed.length > maxLength
		? `${trimmed.slice(0, maxLength - 3)}...`
		: trimmed;
}

/**
 * @param {string} value
 */
function stripGitTrailers(value) {
	return value
		.split("\n")
		.filter(
			(line) =>
				!/^(Plan-Item|Related-Plan|Source-Commit|Co-authored-by):\s+/u.test(
					line,
				),
		)
		.join("\n")
		.replace(/\n{3,}/gu, "\n\n")
		.trim();
}

function commitChangeSummary() {
	if (changeSummary?.trim()) return truncateText(changeSummary);
	if (!commitSha) return approvalNote();

	try {
		const message = execFileSync(
			"git",
			["log", "-1", "--pretty=format:%s%n%n%b", commitSha],
			{
				encoding: "utf8",
				stdio: ["ignore", "pipe", "ignore"],
			},
		);
		const normalized = stripGitTrailers(message);
		if (normalized) return truncateText(normalized);
	} catch {
		// 非 git 或浅克隆环境仍应能发起兼容审批。
	}

	return approvalNote();
}

function approvalValidationSummary() {
	if (validationSummary?.trim()) return truncateText(validationSummary);
	return "CI validation completed before deployment approval.";
}

if (!approvalToken) {
	fail(
		"缺少 DEPLOY_APPROVAL_TOKEN。请在 GitHub production Environment secret 中配置部署审批 token；SNOW_BASE_DEPLOY_APPROVAL_TOKEN 仅作为兼容别名。",
	);
}

if (!/^[a-z][a-z0-9-]{0,63}$/u.test(projectSlug)) {
	fail(
		"DEPLOY_APPROVAL_PROJECT 必须是小写 slug，例如 snow-base 或 snow-index。",
	);
}

if (!commitSha || !/^[0-9a-f]{40}$/u.test(commitSha)) {
	fail("DEPLOY_APPROVAL_COMMIT_SHA 必须是 40 位小写十六进制 commit SHA。");
}

if (!target || !/^[a-z][a-z0-9-]{0,63}$/u.test(target)) {
	fail(
		"DEPLOY_APPROVAL_TARGET 必须是小写 target slug，例如 admin、api、both、pages 或 site。",
	);
}

if (!Number.isFinite(waitSeconds) || waitSeconds < 1 || waitSeconds > 1800) {
	fail(
		"DEPLOY_APPROVAL_WAIT_SECONDS 必须是 1 到 1800 之间的秒数；SNOW_BASE_DEPLOY_APPROVAL_WAIT_SECONDS 仅作为兼容别名。",
	);
}

if (!Number.isFinite(pollSeconds) || pollSeconds < 5 || pollSeconds > 60) {
	fail(
		"DEPLOY_APPROVAL_POLL_SECONDS 必须是 5 到 60 之间的秒数；SNOW_BASE_DEPLOY_APPROVAL_POLL_SECONDS 仅作为兼容别名。",
	);
}

if (!/^(?:legacy|selected-artifact)$/u.test(workflowMode)) {
	fail("DEPLOY_APPROVAL_WORKFLOW_MODE 只能是 legacy 或 selected-artifact。");
}

const isSelectedArtifactMode = workflowMode === "selected-artifact";

if (isSelectedArtifactMode && (!providedArtifactId || !artifactDigest)) {
	fail(
		"selected-artifact 必须提供 snow-base v2 artifact id 和 artifact digest，不能退回旧版审批流程。",
	);
}

if (isSelectedArtifactMode && !requestId?.trim()) {
	fail(
		"selected-artifact 必须提供 snow-base request id，用于审批幂等和 workflow 对账。",
	);
}

if (artifactType && !/^[a-z][a-z0-9-]{0,63}$/u.test(artifactType)) {
	fail(
		"DEPLOY_APPROVAL_ARTIFACT_TYPE 必须是小写 artifact type slug，例如 vercel-prebuilt。",
	);
}

if (artifactDigest && !/^sha256:[0-9a-f]{64}$/u.test(artifactDigest)) {
	fail(
		"DEPLOY_APPROVAL_ARTIFACT_DIGEST 必须是 sha256:<64 位小写十六进制摘要>。",
	);
}

if (
	artifactStorageProvider &&
	!/^[a-z][a-z0-9-]{0,63}$/u.test(artifactStorageProvider)
) {
	fail(
		"DEPLOY_APPROVAL_ARTIFACT_STORAGE_PROVIDER 必须是小写 storage provider slug。",
	);
}

if (artifactType && artifactDigest && !deploymentArtifact) {
	const artifactResult = await postJson("/api/v1/deployments/artifacts", {
		commitSha,
		projectSlug,
		target,
		artifactType,
		digest: artifactDigest,
		storageProvider: artifactStorageProvider,
		storageKey: artifactStorageKey,
		requestSource,
		requestUrl,
		buildStatus: "succeeded",
		validationStatus: "succeeded",
		expiresAt: new Date(Date.now() + waitSeconds * 1000).toISOString(),
		metadata:
			runId && runAttempt
				? {
						githubRunId: runId,
						githubRunAttempt: runAttempt,
					}
				: undefined,
	});

	if (artifactResult.response.status === 404 && isSelectedArtifactMode) {
		fail(
			"部署产物登记接口不可用，selected-artifact 必须使用 snow-base v2 artifact contract。",
		);
	} else if (artifactResult.response.status === 404) {
		console.log("部署产物登记接口暂不可用，将保留 v1.1 兼容审批流程。");
	} else if (
		!artifactResult.response.ok ||
		artifactResult.body?.ok !== true
	) {
		const code = apiErrorCode(artifactResult.response, artifactResult.body);
		fail(`登记部署产物失败：${code}`);
	} else {
		const registeredArtifact = artifactResult.body.data.artifact;
		deploymentArtifact = registeredArtifact;
		const action = artifactResult.body.data.reused ? "复用已有" : "已登记";
		console.log(
			`${action}部署产物：${registeredArtifact.id} ${registeredArtifact.digest}`,
		);
	}
}

const requestBody = {
	commitSha,
	projectSlug,
	target,
	expiresAt: new Date(Date.now() + waitSeconds * 1000).toISOString(),
	changeSummary: commitChangeSummary(),
	validationSummary: approvalValidationSummary(),
	note: approvalNote(),
	artifactId: deploymentArtifact?.id,
	artifactDigest: deploymentArtifact?.digest,
	requestSource,
	requestUrl,
	idempotencyKey:
		requestId ??
		(runId && runAttempt
			? `production-deploy:${runId}:${runAttempt}:${projectSlug}:${target}`
			: undefined),
};

const requestResult = await postJson(
	"/api/v1/deployments/request",
	requestBody,
);
let approvalId;

if (requestResult.response.status === 404 && isSelectedArtifactMode) {
	fail(
		"部署审批请求接口不可用，selected-artifact 必须使用 snow-base v2 artifact-bound contract。",
	);
} else if (requestResult.response.status === 404) {
	console.log(
		"部署审批自动请求接口暂不可用，将回退到旧版 verify-only 校验流程。",
	);
} else if (!requestResult.response.ok || requestResult.body?.ok !== true) {
	const code = apiErrorCode(requestResult.response, requestResult.body);
	if (code === "missing_scope") {
		fail(
			"部署审批 token 缺少 deployments:request。请重新创建或轮换 DEPLOY_APPROVAL_TOKEN，并同时勾选 deployments:request 和 deployments:verify；SNOW_BASE_DEPLOY_APPROVAL_TOKEN 仅作为兼容别名。",
		);
	}
	fail(`创建部署审批请求失败：${code}`);
} else {
	approvalId = requestResult.body.data.approval.id;
	const action = requestResult.body.data.reused ? "复用已有" : "已创建";
	console.log(`${action}部署审批请求：${approvalId}`);
	console.log(
		`请在 15 分钟内打开 Admin 审批页面并批准或拒绝：${approvalCreateUrl()}`,
	);

	const deadline = Date.now() + waitSeconds * 1000;
	while (Date.now() <= deadline) {
		const statusResult = await getJson(
			`/api/v1/deployments/requests/${approvalId}`,
		);
		if (!statusResult.response.ok || statusResult.body?.ok !== true) {
			const code = apiErrorCode(statusResult.response, statusResult.body);
			fail(`查询部署审批状态失败：${code}`);
		}

		const approval = statusResult.body.data;
		if (approval.status === "approved") {
			console.log(`部署审批已批准：${approval.id}`);
			break;
		}
		if (approval.status === "rejected") {
			fail(`部署审批已拒绝：${approval.id}`);
		}
		if (approval.status === "expired") {
			fail(
				`部署审批已过期。请用该链接预填并创建新的审批请求：${approvalCreateUrl()}`,
			);
		}
		if (approval.status === "used") {
			fail(`部署审批已被消费，不能重复使用：${approval.id}`);
		}

		const remainingSeconds = Math.max(
			0,
			Math.ceil((deadline - Date.now()) / 1000),
		);
		console.log(
			`等待部署审批 ${approval.id}，剩余 ${remainingSeconds} 秒。`,
		);
		await delay(pollSeconds * 1000);
	}

	if (Date.now() > deadline) {
		fail(
			`等待部署审批超时，已等待 ${waitSeconds} 秒。请用该链接预填并创建新的审批请求：${approvalCreateUrl()}`,
		);
	}
}

const verifyResult = await postJson("/api/v1/deployments/verify", {
	commitSha,
	projectSlug,
	target,
	artifactId: deploymentArtifact?.id,
	artifactDigest: deploymentArtifact?.digest,
});

if (!verifyResult.response.ok || verifyResult.body?.ok !== true) {
	const code = apiErrorCode(verifyResult.response, verifyResult.body);
	fail(`部署审批消费校验失败：${code}`);
}

console.log(`部署审批已校验并消费：${verifyResult.body.data.approvalId}`);
