const apiBaseUrl = (
	process.env.DEPLOY_APPROVAL_API_BASE_URL ??
	process.env.SNOW_BASE_API_BASE_URL ??
	"https://api.whynotsnow.com"
).replace(/\/+$/u, "");
const token =
	process.env.DEPLOY_APPROVAL_TOKEN ??
	process.env.SNOW_BASE_DEPLOY_APPROVAL_TOKEN;
const projectSlug = process.env.DEPLOY_APPROVAL_PROJECT ?? "blog";
const target = process.env.DEPLOY_APPROVAL_TARGET ?? "site";
const deploymentRunId = process.env.DEPLOYMENT_RUN_ID;
const outcome = process.env.DEPLOYMENT_SMOKE_OUTCOME;
const failureCode = process.env.DEPLOYMENT_SMOKE_FAILURE_CODE;
const normalizedFailureCode = failureCode?.trim();

function fail(message) {
	console.error(message);
	process.exit(1);
}

if (!token)
	fail("缺少 DEPLOY_APPROVAL_TOKEN，无法写入 deployment smoke evidence。");
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

const response = await fetch(
	`${apiBaseUrl}/api/v1/deployments/integration-evidence/smoke`,
	{
		method: "POST",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			projectSlug,
			target,
			deploymentRunId,
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
