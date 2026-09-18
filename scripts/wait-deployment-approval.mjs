import { exchangeServiceToken } from "./exchange-service-token.mjs";

function fail(message) {
	throw new Error(message);
}

function apiErrorCode(response, body) {
	return body?.error?.code ?? `http_${response.status}`;
}

function validateInputs({
	projectSlug,
	target,
	commitSha,
	requestId,
	artifactId,
	artifactDigest,
	waitSeconds,
	pollSeconds,
}) {
	if (projectSlug !== "blog")
		fail("blog deployment approval only allows project=blog.");
	if (target !== "site")
		fail("blog deployment approval only allows target=site.");
	if (!commitSha || !/^[0-9a-f]{40}$/u.test(commitSha))
		fail("Deployment approval commit SHA is invalid.");
	if (!requestId) fail("Deployment approval request ID is required.");
	if (!artifactId) fail("Deployment approval artifact ID is required.");
	if (!artifactDigest || !/^sha256:[0-9a-f]{64}$/u.test(artifactDigest))
		fail("Deployment approval artifact digest is invalid.");
	if (!Number.isFinite(waitSeconds) || waitSeconds < 1 || waitSeconds > 1800)
		fail("DEPLOY_APPROVAL_WAIT_SECONDS must be between 1 and 1800.");
	if (!Number.isFinite(pollSeconds) || pollSeconds < 5 || pollSeconds > 60)
		fail("DEPLOY_APPROVAL_POLL_SECONDS must be between 5 and 60.");
}

export async function waitForDeploymentApproval({
	env = process.env,
	fetchImpl = fetch,
	now = Date.now,
	sleep = (milliseconds) =>
		new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
	const apiBaseUrl = (
		env.DEPLOY_APPROVAL_API_BASE_URL ??
		env.SNOW_BASE_API_BASE_URL ??
		"https://api.whynotsnow.com"
	).replace(/\/+$/u, "");
	const projectSlug = env.DEPLOY_APPROVAL_PROJECT ?? "blog";
	const target = env.DEPLOY_APPROVAL_TARGET ?? "site";
	const commitSha = env.DEPLOY_APPROVAL_COMMIT_SHA;
	const requestId = env.DEPLOY_APPROVAL_REQUEST_ID?.trim();
	const artifactId = env.DEPLOYMENT_ARTIFACT_ID?.trim();
	const artifactDigest = env.DEPLOYMENT_ARTIFACT_DIGEST?.trim();
	const waitSeconds = Number.parseInt(
		env.DEPLOY_APPROVAL_WAIT_SECONDS ?? "900",
		10,
	);
	const pollSeconds = Number.parseInt(
		env.DEPLOY_APPROVAL_POLL_SECONDS ?? "15",
		10,
	);
	validateInputs({
		projectSlug,
		target,
		commitSha,
		requestId,
		artifactId,
		artifactDigest,
		waitSeconds,
		pollSeconds,
	});
	const safeRequestId = requestId ?? "";
	const deadline = now() + waitSeconds * 1000;
	while (now() <= deadline) {
		const exchange = await exchangeServiceToken({
			env: {
				...env,
				DEPLOYMENT_CREDENTIAL_ID: env.DEPLOYMENT_CREDENTIAL_ID,
				DEPLOYMENT_EXCHANGE_SECRET: env.DEPLOYMENT_EXCHANGE_SECRET,
				DEPLOYMENT_REQUESTED_CAPABILITIES:
					"deployments:request,deployments:verify",
			},
			fetchImpl,
			now,
			operationPrefix: "blog-deployment-approval-wait",
		});
		const response = await fetchImpl(
			`${apiBaseUrl}/api/v1/deployments/requests/${encodeURIComponent(safeRequestId)}`,
			{
				method: "GET",
				cache: "no-store",
				redirect: "manual",
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${exchange.accessToken}`,
				},
			},
		);
		const body = await response.json().catch(() => null);
		if (!response.ok || body?.ok !== true)
			fail(`查询部署审批状态失败：${apiErrorCode(response, body)}`);

		const approval = body.data;
		if (
			approval.projectSlug !== projectSlug ||
			approval.target !== target ||
			approval.commitSha !== commitSha ||
			approval.artifactId !== artifactId ||
			approval.artifactDigest !== artifactDigest
		) {
			fail(
				"Deployment approval identity does not match the selected artifact.",
			);
		}
		if (approval.status === "approved") return approval;
		if (["rejected", "expired", "invalidated"].includes(approval.status))
			fail(`部署审批已${approval.status}：${approval.id}`);
		if (now() >= deadline) break;
		await sleep(pollSeconds * 1000);
	}
	fail(`等待部署审批超时，已等待 ${waitSeconds} 秒。`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		const approval = await waitForDeploymentApproval();
		console.log(`部署审批已批准：${approval.id}`);
	} catch (error) {
		console.error(
			error instanceof Error
				? error.message
				: "Deployment approval wait failed safely.",
		);
		process.exitCode = 1;
	}
}
