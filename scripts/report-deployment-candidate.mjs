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
const commitSha =
	process.env.DEPLOY_APPROVAL_COMMIT_SHA ?? process.env.GITHUB_SHA;
const requestId = process.env.DEPLOY_APPROVAL_REQUEST_ID;
const githubRunId = process.env.GITHUB_RUN_ID;
const githubRunUrl =
	process.env.DEPLOY_APPROVAL_RUN_URL ??
	`${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY ?? ""}/actions/runs/${githubRunId ?? ""}`;
const status = process.env.DEPLOYMENT_CALLBACK_STATUS;
const conclusion = process.env.DEPLOYMENT_CALLBACK_CONCLUSION;
const phase = process.env.DEPLOYMENT_CALLBACK_PHASE;
const errorCode = process.env.DEPLOYMENT_CALLBACK_ERROR_CODE;
const artifactId = process.env.DEPLOYMENT_ARTIFACT_ID;
const artifactDigest = process.env.DEPLOYMENT_ARTIFACT_DIGEST;

function fail(message) {
	console.error(message);
	process.exit(1);
}

if (!token) fail("缺少 DEPLOY_APPROVAL_TOKEN，无法回报 Candidate Run。");
if (!/^[a-z][a-z0-9-]{0,63}$/u.test(projectSlug))
	fail("DEPLOY_APPROVAL_PROJECT 无效。");
if (target !== "site") fail("blog Candidate Run 只允许 target=site。");
if (!commitSha || !/^[0-9a-f]{40}$/u.test(commitSha))
	fail("Candidate Run commit SHA 无效。");
if (!requestId?.trim()) fail("Candidate Run 缺少 request id。");
if (!githubRunId || !/^\d+$/u.test(githubRunId))
	fail("Candidate Run GitHub run id 无效。");
if (!status || !["queued", "in_progress", "completed"].includes(status))
	fail("Candidate Run callback status 无效。");
if (
	status === "completed" &&
	!["success", "failure", "cancelled", "timed_out"].includes(conclusion ?? "")
)
	fail("已完成的 Candidate Run 必须提供有效 conclusion。");
if (artifactId && !artifactDigest)
	fail("Candidate Run artifact ID 与 digest 必须同时提供。");
if (artifactDigest && !/^sha256:[0-9a-f]{64}$/u.test(artifactDigest))
	fail("Candidate Run artifact digest 无效。");

const response = await fetch(
	`${apiBaseUrl}/api/v1/deployments/candidate-runs`,
	{
		method: "POST",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			requestId,
			projectSlug,
			target,
			commitSha,
			githubRunId,
			githubRunUrl,
			status,
			...(conclusion ? { conclusion } : {}),
			...(phase ? { phase } : {}),
			...(errorCode ? { errorCode } : {}),
			...(artifactId ? { artifactId, artifactDigest } : {}),
		}),
	},
);
const body = await response.json().catch(() => null);
if (!response.ok || body?.ok !== true) {
	const code = body?.error?.code ?? `http_${response.status}`;
	fail(`回报 Candidate Run 失败：${code}`);
}

console.log(
	`Candidate Run callback accepted: ${body.data.candidateRunId} ${body.data.status}`,
);
