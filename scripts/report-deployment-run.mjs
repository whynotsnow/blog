import { appendFile } from "node:fs/promises";

const runUpdateCapability = "deployments:run-update";
const tokenLifetimeSeconds = 10 * 60;

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

async function jsonBody(response) {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

function validateConfiguration(env) {
	const apiBaseUrl = (
		env.DEPLOY_APPROVAL_API_BASE_URL ??
		env.SNOW_BASE_API_BASE_URL ??
		"https://api.whynotsnow.com"
	).replace(/\/+$/u, "");
	let parsedApiUrl;
	try {
		parsedApiUrl = new URL(apiBaseUrl);
	} catch {
		throw new Error("Deployment API base URL is invalid.");
	}
	if (
		parsedApiUrl.protocol !== "https:" ||
		parsedApiUrl.username ||
		parsedApiUrl.password ||
		parsedApiUrl.search ||
		parsedApiUrl.hash ||
		(parsedApiUrl.pathname !== "" && parsedApiUrl.pathname !== "/")
	) {
		throw new Error("Deployment API base URL must be an HTTPS origin.");
	}

	const credentialId = env.SNOW_BASE_DEPLOYMENT_RUN_CREDENTIAL_ID;
	const exchangeSecret = env.SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET;
	if (!credentialId) {
		throw new Error(
			"Missing required configuration: SNOW_BASE_DEPLOYMENT_RUN_CREDENTIAL_ID.",
		);
	}
	if (!/^[A-Za-z0-9_-]{1,128}$/u.test(credentialId)) {
		throw new Error("Deployment run Credential ID has an invalid format.");
	}
	if (!exchangeSecret) {
		throw new Error(
			"Missing required configuration: SNOW_BASE_DEPLOYMENT_RUN_EXCHANGE_SECRET.",
		);
	}
	if (!/^[A-Za-z0-9_-]{43}$/u.test(exchangeSecret)) {
		throw new Error(
			"Deployment run exchange secret has an invalid format.",
		);
	}

	return { apiBaseUrl: parsedApiUrl.origin, credentialId, exchangeSecret };
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
	return { response, body: await jsonBody(response) };
}

function validExchangeResult(result, operationId, nowSeconds) {
	if (!result || typeof result !== "object" || Array.isArray(result))
		return false;
	if (result.operationId !== operationId || result.tokenType !== "Bearer")
		return false;
	if (
		typeof result.accessToken !== "string" ||
		!/^[A-Za-z0-9_-]{43}$/u.test(result.accessToken)
	)
		return false;
	if (
		result.principal?.namespace !== "snow-service" ||
		!Array.isArray(result.capabilities) ||
		result.capabilities.length !== 1 ||
		result.capabilities[0] !== runUpdateCapability
	) {
		return false;
	}
	if (!Number.isInteger(result.expiresAt)) return false;
	const lifetime = result.expiresAt - nowSeconds;
	return (
		lifetime >= tokenLifetimeSeconds - 60 &&
		lifetime <= tokenLifetimeSeconds + 60
	);
}

export async function reportDeploymentRun({
	env = process.env,
	fetchImpl = fetch,
	now = Date.now,
	appendOutput = appendFile,
} = {}) {
	const { apiBaseUrl, credentialId, exchangeSecret } =
		validateConfiguration(env);
	const callback = validateCallback(env);
	const issuedAt = Math.floor(now() / 1000);
	const operationId = `blog-deployment-run-${crypto.randomUUID()}`;
	const exchange = await requestJson(
		fetchImpl,
		`${apiBaseUrl}/api/v1/service/exchange/token`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Snow-Service-Exchange ${exchangeSecret}`,
			},
			body: JSON.stringify({
				exchangeRequest: {
					operationId,
					credentialId,
					purpose: "api-token",
					requestedCapabilities: [runUpdateCapability],
					issuedAt,
					expiresAt: issuedAt + 60,
				},
			}),
		},
		"Deployment run Service Exchange",
	);
	assert(
		exchange.response.status === 200,
		`Deployment run Service Exchange returned HTTP ${exchange.response.status}.`,
	);
	assert(
		validExchangeResult(
			exchange.body,
			operationId,
			Math.floor(now() / 1000),
		),
		"Deployment run Service Exchange response did not match the expected authority and token contract.",
	);

	const response = await requestJson(
		fetchImpl,
		`${apiBaseUrl}/api/v1/deployments/runs/update`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${exchange.body.accessToken}`,
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
