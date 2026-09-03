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
const digest = process.env.DEPLOY_APPROVAL_ARTIFACT_DIGEST;
const artifactId = process.env.DEPLOY_APPROVAL_ARTIFACT_ID;
const artifactName = process.env.DEPLOY_APPROVAL_ARTIFACT_NAME;
const artifactRunId =
	process.env.DEPLOY_APPROVAL_ARTIFACT_RUN_ID ?? process.env.GITHUB_RUN_ID;

function fail(message) {
	console.error(message);
	process.exit(1);
}

if (!token)
	fail("缺少 DEPLOY_APPROVAL_TOKEN，无法登记 site candidate artifact。");
if (!/^[a-z][a-z0-9-]{0,63}$/u.test(projectSlug))
	fail("DEPLOY_APPROVAL_PROJECT 无效。");
if (!/^[a-z][a-z0-9-]{0,63}$/u.test(target))
	fail("DEPLOY_APPROVAL_TARGET 无效。");
if (!commitSha || !/^[0-9a-f]{40}$/u.test(commitSha)) fail("commit SHA 无效。");
if (!digest || !/^sha256:[0-9a-f]{64}$/u.test(digest))
	fail("artifact digest 无效。");
if (!artifactId || !artifactName || !artifactRunId) {
	fail("缺少 GitHub artifact identity，拒绝登记不可执行的 candidate。");
}

const response = await fetch(`${apiBaseUrl}/api/v1/deployments/artifacts`, {
	method: "POST",
	headers: {
		Accept: "application/json",
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		projectSlug,
		target,
		role: "candidate",
		commitSha,
		artifactType: "vercel-prebuilt",
		digest,
		storageProvider: "github-actions",
		storageKey: artifactId,
		requestSource: "github-actions",
		requestUrl: `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY ?? ""}/actions/runs/${process.env.GITHUB_RUN_ID ?? ""}`,
		buildStatus: "succeeded",
		validationStatus: "succeeded",
		expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
		metadata: {
			githubArtifactId: artifactId,
			githubArtifactRunId: artifactRunId,
			githubArtifactName: artifactName,
			workflowMode: "candidate",
			protocolVersion: "v2",
		},
	}),
});
const body = await response.json().catch(() => null);
if (!response.ok || body?.ok !== true) {
	const code = body?.error?.code ?? `http_${response.status}`;
	fail(`登记 site candidate artifact 失败：${code}`);
}

const artifact = body.data.artifact;
console.log(`site candidate artifact ready: ${artifact.id} ${artifact.digest}`);
console.log(
	`snow-base Admin 可选择 project=${artifact.projectSlug} target=${artifact.target}`,
);
