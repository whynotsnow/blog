import { appendFile } from "node:fs/promises";
import { exchangeServiceToken } from "./exchange-service-token.mjs";

const runUpdateCapability = "deployments:run-update";

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function validateCallback(env) {
	const projectSlug = env.DEPLOY_APPROVAL_PROJECT ?? "blog";
	const target = env.DEPLOY_APPROVAL_TARGET ?? "site";
	const commitSha = env.DEPLOY_APPROVAL_COMMIT_SHA;
	const requestId = env.DEPLOY_APPROVAL_REQUEST_ID;
	const artifactId = env.DEPLOYMENT_ARTIFACT_ID;
	const artifactDigest = env.DEPLOYMENT_ARTIFACT_DIGEST;
	const githubRunId = env.GITHUB_RUN_ID;
	const githubRunUrl =
		env.DEPLOY_APPROVAL_RUN_URL ??
		`${env.GITHUB_SERVER_URL ?? "https://github.com"}/${env.GITHUB_REPOSITORY ?? ""}/actions/runs/${githubRunId ?? ""}`;
	const callbackStatus = env.DEPLOYMENT_CALLBACK_STATUS ?? "completed";
	const conclusion = env.DEPLOYMENT_CALLBACK_CONCLUSION;
	const phase = env.DEPLOYMENT_CALLBACK_PHASE ?? "deployment_completed";
	const errorCode = env.DEPLOYMENT_CALLBACK_ERROR_CODE;

	if (projectSlug !== "blog")
		throw new Error("blog deployment run only allows project=blog.");
	if (target !== "site")
		throw new Error("blog deployment run only allows target=site.");
	if (!commitSha || !/^[0-9a-f]{40}$/u.test(commitSha))
		throw new Error("Deployment run commit SHA is invalid.");
	if (!requestId?.trim())
		throw new Error("Deployment run request ID is required.");
	if (!artifactId?.trim())
		throw new Error("Deployment run artifact ID is required.");
	if (!artifactDigest || !/^sha256:[0-9a-f]{64}$/u.test(artifactDigest))
		throw new Error("Deployment run artifact digest is invalid.");
	if (!githubRunId || !/^\d+$/u.test(githubRunId))
		throw new Error("Deployment run GitHub run ID is invalid.");
	if (!["queued", "in_progress", "completed"].includes(callbackStatus))
		throw new Error("Deployment run callback status is invalid.");
	if (
		callbackStatus === "completed" &&
		!["success", "failure", "cancelled", "timed_out"].includes(
			conclusion ?? "",
		)
	)
		throw new Error(
			"Completed deployment runs require a supported conclusion.",
		);

	return {
		projectSlug,
		target,
		commitSha,
		requestId: requestId.trim(),
		artifactId: artifactId.trim(),
		artifactDigest,
		githubRunId,
		githubRunUrl,
		callbackStatus,
		conclusion,
		phase,
		errorCode,
	};
}

async function requestJson(fetchImpl, url, init, label) {
	let response;
	try {
		response = await fetchImpl(url, {
			...init,
			cache: "no-store",
			redirect: "manual",
			signal: AbortSignal.timeout(15_000),
		});
	} catch {
		throw new Error(`${label} request failed before a validated response.`);
	}
	return { response, body: await response.json().catch(() => null) };
}

export async function reportDeploymentRun({
	env = process.env,
	fetchImpl = fetch,
	now = Date.now,
	appendOutput = appendFile,
} = {}) {
	const callback = validateCallback(env);
	if (!env.SNOW_BASE_DEPLOYMENT_RUN_CREDENTIAL_ID) {
		throw new Error(
			"Missing required configuration: SNOW_BASE_DEPLOYMENT_RUN_CREDENTIAL_ID.",
		);
	}
	if (!env.SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET) {
		throw new Error(
			"Missing required configuration: SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET.",
		);
	}
	const exchange = await exchangeServiceToken({
		env: {
			...env,
			DEPLOYMENT_CREDENTIAL_ID:
				env.SNOW_BASE_DEPLOYMENT_RUN_CREDENTIAL_ID,
			DEPLOYMENT_EXCHANGE_SECRET:
				env.SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET,
			DEPLOYMENT_REQUESTED_CAPABILITIES: runUpdateCapability,
		},
		fetchImpl,
		now,
		operationPrefix: "blog-deployment-run",
	});

	const response = await requestJson(
		fetchImpl,
		`${exchange.apiBaseUrl}/api/v1/deployments/runs/update`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${exchange.accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				requestId: callback.requestId,
				projectSlug: callback.projectSlug,
				target: callback.target,
				commitSha: callback.commitSha,
				artifactId: callback.artifactId,
				artifactDigest: callback.artifactDigest,
				githubRunId: callback.githubRunId,
				githubRunUrl: callback.githubRunUrl,
				status: callback.callbackStatus,
				...(callback.conclusion
					? { conclusion: callback.conclusion }
					: {}),
				...(callback.phase ? { phase: callback.phase } : {}),
				...(callback.errorCode
					? { errorCode: callback.errorCode }
					: {}),
			}),
		},
		"Deployment run callback",
	);
	assert(
		response.response.ok && response.body?.ok === true,
		`Deployment run callback was rejected with HTTP ${response.response.status}.`,
	);

	const deploymentRunId = response.body?.data?.id;
	assert(
		typeof deploymentRunId === "string" &&
			/^[A-Za-z0-9_-]{1,128}$/u.test(deploymentRunId),
		"Deployment run response did not contain a valid exact run ID; refusing to continue smoke.",
	);
	if (env.GITHUB_OUTPUT) {
		await appendOutput(
			env.GITHUB_OUTPUT,
			`deployment-run-id=${deploymentRunId}\n`,
		);
	}
	return deploymentRunId;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		const deploymentRunId = await reportDeploymentRun();
		console.log(`deployment run callback accepted: ${deploymentRunId}`);
	} catch (error) {
		console.error(
			error instanceof Error
				? error.message
				: "Deployment run callback failed safely.",
		);
		process.exitCode = 1;
	}
}
