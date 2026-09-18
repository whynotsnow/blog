import { appendFileSync } from "node:fs";

const defaultApiBaseUrl = "https://api.whynotsnow.com";
const tokenLifetimeSeconds = 10 * 60;

function requiredValue(env, name) {
	const value = env[name];
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(
			`Missing required service exchange configuration: ${name}`,
		);
	}
	return value;
}

function configuredCapabilities(env, requestedCapabilities) {
	const raw = requestedCapabilities ?? env.DEPLOYMENT_REQUESTED_CAPABILITIES;
	const capabilities = Array.isArray(raw)
		? raw
		: String(raw ?? "")
				.split(",")
				.map((capability) => capability.trim())
				.filter(Boolean);
	const normalized = [...new Set(capabilities)].sort();
	if (normalized.length === 0 || normalized.length !== capabilities.length) {
		throw new Error(
			"Service exchange capabilities must be a non-empty unique list.",
		);
	}
	return normalized;
}

function validateConfiguration(env, requestedCapabilities) {
	const apiBaseUrl = (
		env.DEPLOY_APPROVAL_API_BASE_URL ??
		env.SNOW_BASE_API_BASE_URL ??
		defaultApiBaseUrl
	).replace(/\/+$/u, "");
	let parsedApiBaseUrl;
	try {
		parsedApiBaseUrl = new URL(apiBaseUrl);
	} catch {
		throw new Error("Deployment API base URL is invalid.");
	}
	if (
		parsedApiBaseUrl.protocol !== "https:" ||
		parsedApiBaseUrl.username ||
		parsedApiBaseUrl.password ||
		parsedApiBaseUrl.search ||
		parsedApiBaseUrl.hash ||
		(parsedApiBaseUrl.pathname !== "" && parsedApiBaseUrl.pathname !== "/")
	) {
		throw new Error("Deployment API base URL must be an HTTPS origin.");
	}

	const credentialId = requiredValue(env, "DEPLOYMENT_CREDENTIAL_ID");
	const exchangeSecret = requiredValue(env, "DEPLOYMENT_EXCHANGE_SECRET");
	if (!/^[A-Za-z0-9_-]{1,128}$/u.test(credentialId)) {
		throw new Error(
			"Service exchange Credential ID has an invalid format.",
		);
	}
	if (!/^[A-Za-z0-9_-]{43}$/u.test(exchangeSecret)) {
		throw new Error("Service exchange secret has an invalid format.");
	}

	return {
		apiBaseUrl: parsedApiBaseUrl.origin,
		credentialId,
		exchangeSecret,
		capabilities: configuredCapabilities(env, requestedCapabilities),
	};
}

async function jsonBody(response) {
	return response.json().catch(() => null);
}

function assertTokenResponse(body, operationId, capabilities, nowSeconds) {
	if (
		!body ||
		body.operationId !== operationId ||
		body.tokenType !== "Bearer"
	) {
		throw new Error("Service exchange response identity was unexpected.");
	}
	if (
		body.principal?.namespace !== "snow-service" ||
		!Array.isArray(body.capabilities) ||
		JSON.stringify([...body.capabilities].sort()) !==
			JSON.stringify(capabilities)
	) {
		throw new Error("Service exchange capabilities were unexpected.");
	}
	if (
		typeof body.accessToken !== "string" ||
		!/^[A-Za-z0-9_-]{43}$/u.test(body.accessToken)
	) {
		throw new Error("Service exchange token format was unexpected.");
	}
	if (!Number.isInteger(body.expiresAt)) {
		throw new Error("Service exchange expiry was missing.");
	}
	const lifetime = body.expiresAt - nowSeconds;
	if (
		lifetime < tokenLifetimeSeconds - 60 ||
		lifetime > tokenLifetimeSeconds + 60
	) {
		throw new Error("Service exchange token lifetime was unexpected.");
	}
	return body.accessToken;
}

/**
 * @param {object} [options]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {() => number} [options.now]
 * @param {string[] | string} [options.requestedCapabilities]
 * @param {string} [options.operationPrefix]
 */
export async function exchangeServiceToken({
	env = process.env,
	fetchImpl = fetch,
	now = Date.now,
	requestedCapabilities,
	operationPrefix = env.DEPLOYMENT_EXCHANGE_OPERATION_PREFIX ??
		"blog-deployment-exchange",
} = {}) {
	const { apiBaseUrl, credentialId, exchangeSecret, capabilities } =
		validateConfiguration(env, requestedCapabilities);
	const operationId = `${operationPrefix}-${crypto.randomUUID()}`;
	const issuedAt = Math.floor(now() / 1000);
	let response;
	try {
		response = await fetchImpl(
			`${apiBaseUrl}/api/v1/service/exchange/token`,
			{
				method: "POST",
				cache: "no-store",
				redirect: "manual",
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
						requestedCapabilities: capabilities,
						issuedAt,
						expiresAt: issuedAt + 60,
					},
				}),
			},
		);
	} catch {
		throw new Error(
			"Service exchange request failed before a validated response.",
		);
	}
	const body = await jsonBody(response);
	if (response.status !== 200) {
		throw new Error(
			`Service exchange returned HTTP ${response.status}${body?.error?.code ? ` (${body.error.code})` : ""}.`,
		);
	}
	const accessToken = assertTokenResponse(
		body,
		operationId,
		capabilities,
		Math.floor(now() / 1000),
	);
	return { accessToken, apiBaseUrl, capabilities, expiresAt: body.expiresAt };
}

if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		const result = await exchangeServiceToken();
		if (!process.env.GITHUB_ENV) {
			throw new Error(
				"GITHUB_ENV is required for the exchanged deployment token.",
			);
		}
		appendFileSync(
			process.env.GITHUB_ENV,
			`DEPLOYMENT_SERVICE_TOKEN=${result.accessToken}\n`,
		);
		if (process.env.GITHUB_ACTIONS === "true") {
			console.log(`::add-mask::${result.accessToken}`);
		}
		console.log(
			`service exchange succeeded (${result.capabilities.join(",")}); token value was not emitted.`,
		);
	} catch (error) {
		console.error(
			error instanceof Error
				? error.message
				: "Service exchange failed safely.",
		);
		process.exitCode = 1;
	}
}
