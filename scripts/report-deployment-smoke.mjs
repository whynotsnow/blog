import { exchangeServiceToken } from "./exchange-service-token.mjs";

const apiBaseUrl = (
	process.env.DEPLOY_APPROVAL_API_BASE_URL ??
	process.env.SNOW_BASE_API_BASE_URL ??
	"https://api.whynotsnow.com"
).replace(/\/+$/u, "");
const workflowMode = process.env.DEPLOY_APPROVAL_WORKFLOW_MODE;
const legacyToken =
	process.env.DEPLOY_APPROVAL_TOKEN ??
	process.env.SNOW_BASE_DEPLOY_APPROVAL_TOKEN;
const exchangeCredentialId = process.env.DEPLOYMENT_CREDENTIAL_ID;
const exchangeSecret = process.env.DEPLOYMENT_EXCHANGE_SECRET;
const projectSlug = process.env.DEPLOY_APPROVAL_PROJECT ?? "blog";
const target = process.env.DEPLOY_APPROVAL_TARGET ?? "site";
const deploymentRunId = process.env.DEPLOYMENT_RUN_ID;
const outcome = process.env.DEPLOYMENT_SMOKE_OUTCOME;
const failureCode = process.env.DEPLOYMENT_SMOKE_FAILURE_CODE;
const normalizedFailureCode = failureCode?.trim();

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
	console.error(message);
	process.exit(1);
}

if (!/^(?:legacy-break-glass|selected-artifact)$/u.test(workflowMode ?? ""))
	fail(
		"DEPLOY_APPROVAL_WORKFLOW_MODE 必须显式设置为 legacy-break-glass 或 selected-artifact；旧 token 不得自动 fallback。",
	);
if (workflowMode === "legacy-break-glass" && !legacyToken)
	fail("legacy smoke evidence 需要 DEPLOY_APPROVAL_TOKEN。");
if (
	workflowMode !== "legacy-break-glass" &&
	(!exchangeCredentialId || !exchangeSecret)
)
	fail(
		"selected-artifact smoke evidence 需要完整 Service Exchange 配置；缺失时不得回退旧 token。",
	);
if (projectSlug !== "blog") fail("blog smoke evidence 只允许 project=blog。");
if (target !== "site") fail("blog smoke evidence 只允许 target=site。");
if (!deploymentRunId?.trim())
	fail("缺少精确 deploymentRunId，拒绝写入 smoke evidence。");
if (outcome !== "succeeded" && outcome !== "failed")
	fail("smoke outcome 必须是 succeeded 或 failed。");
if (outcome === "succeeded" && normalizedFailureCode)
	fail("succeeded smoke evidence 不得携带 failureCode。");
if (outcome === "failed" && !normalizedFailureCode)
	fail("failed smoke evidence 必须提供 failureCode。");

const token =
	workflowMode === "legacy-break-glass"
		? legacyToken
		: (
				await exchangeServiceToken({
					env: {
						...process.env,
						DEPLOYMENT_CREDENTIAL_ID: exchangeCredentialId,
						DEPLOYMENT_EXCHANGE_SECRET: exchangeSecret,
						DEPLOYMENT_REQUESTED_CAPABILITIES:
							"deployments:run-update",
					},
					operationPrefix: "blog-deployment-smoke-evidence",
				})
			).accessToken;
const response = await fetch(
	`${apiBaseUrl}/api/v1/deployments/runs/${encodeURIComponent(deploymentRunId)}/smoke`,
	{
		method: "POST",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			outcome,
			...(outcome === "failed"
				? { failureCode: normalizedFailureCode }
				: {}),
		}),
	},
);
const body = await response.json().catch(() => null);
if (!response.ok || body?.ok !== true) {
	const code = body?.error?.code ?? `http_${response.status}`;
	fail(`写入 deployment smoke evidence 失败：${code}`);
}
if (body?.data?.deploymentRunId !== deploymentRunId) {
	fail("smoke evidence 响应的 deploymentRunId 不匹配，拒绝报告成功。");
}
console.log(
	`deployment smoke evidence accepted: ${deploymentRunId} ${outcome}`,
);
