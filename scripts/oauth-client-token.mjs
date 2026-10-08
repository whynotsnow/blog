import { appendFileSync } from "node:fs";

const defaultApiBaseUrl = "https://api.whynotsnow.com";
const tokenLifetimeSeconds = 15 * 60;

function requiredValue(env, name) {
	const value = env[name];
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`Missing required OAuth Client configuration: ${name}`);
	}
	return value;
}

function configuredScopes(env, requestedScopes) {
	const raw = requestedScopes ?? env.DEPLOYMENT_OAUTH_SCOPES;
	const scopes = Array.isArray(raw)
		? raw
		: String(raw ?? "")
				.split(/[ ,]+/u)
				.map((scope) => scope.trim())
				.filter(Boolean);
	const normalized = [...new Set(scopes)].sort();
	if (
		normalized.length === 0 ||
		normalized.length !== scopes.length ||
		normalized.some((scope) => !/^[\x21\x23-\x5B\x5D-\x7E]+$/u.test(scope))
	) {
		throw new Error("OAuth Client scopes must be a non-empty unique list.");
	}
	return normalized;
}

function validateConfiguration(env, requestedScopes) {
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

	const clientId = requiredValue(env, "DEPLOYMENT_OAUTH_CLIENT_ID");
	const clientSecret = requiredValue(env, "DEPLOYMENT_OAUTH_CLIENT_SECRET");
	if (!/^cli_[A-Za-z0-9_-]{1,128}$/u.test(clientId)) {
		throw new Error("OAuth Client ID has an invalid format.");
	}
	if (!/^[A-Za-z0-9_-]{43}$/u.test(clientSecret)) {
		throw new Error("OAuth Client Secret has an invalid format.");
	}
	return {
		apiBaseUrl: parsedApiBaseUrl.origin,
		clientId,
		clientSecret,
		scopes: configuredScopes(env, requestedScopes),
	};
}

async function jsonBody(response) {
	return response.json().catch(() => null);
}

function basicAuthorization(clientId, clientSecret) {
	const credentials = `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`;
	return `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;
}

function assertTokenResponse(body, scopes) {
	if (
		!body ||
		typeof body.access_token !== "string" ||
		!/^[A-Za-z0-9_-]{43}$/u.test(body.access_token) ||
		body.token_type !== "Bearer" ||
		!Number.isInteger(body.expires_in) ||
		"refresh_token" in body ||
		"id_token" in body
	) {
		throw new Error("OAuth token response was unexpected.");
	}
	const returnedScopes =
		typeof body.scope === "string" && body.scope
			? body.scope.split(" ")
			: [];
	if (
		JSON.stringify(returnedScopes) !== JSON.stringify(scopes) ||
		returnedScopes.some(
			(scope) => !/^[\x21\x23-\x5B\x5D-\x7E]+$/u.test(scope),
		)
	) {
		throw new Error("OAuth token scopes were unexpected.");
	}
	if (
		body.expires_in < tokenLifetimeSeconds - 60 ||
		body.expires_in > tokenLifetimeSeconds + 60
	) {
		throw new Error("OAuth token lifetime was unexpected.");
	}
	return body.access_token;
}

/**
 * @param {object} [options]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {() => number} [options.now]
 * @param {string[] | string} [options.requestedScopes]
 */
export async function requestOAuthClientToken({
	env = process.env,
	fetchImpl = fetch,
	now = Date.now,
	requestedScopes,
} = {}) {
	const { apiBaseUrl, clientId, clientSecret, scopes } =
		validateConfiguration(env, requestedScopes);
	const body = new URLSearchParams({
		grant_type: "client_credentials",
		resource: "snow-public-api",
		scope: scopes.join(" "),
	});
	let response;
	try {
		response = await fetchImpl(`${apiBaseUrl}/api/v1/oauth/token`, {
			method: "POST",
			cache: "no-store",
			redirect: "manual",
			signal: AbortSignal.timeout(15_000),
			headers: {
				Accept: "application/json",
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: basicAuthorization(clientId, clientSecret),
			},
			body: body.toString(),
		});
	} catch {
		throw new Error(
			"OAuth token request failed before a validated response.",
		);
	}
	const payload = await jsonBody(response);
	if (response.status !== 200) {
		throw new Error(
			`OAuth token endpoint returned HTTP ${response.status}.`,
		);
	}
	const accessToken = assertTokenResponse(payload, scopes);
	return {
		accessToken,
		apiBaseUrl,
		scopes,
		expiresAt: Math.floor(now() / 1000) + payload.expires_in,
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		const result = await requestOAuthClientToken();
		if (!process.env.GITHUB_ENV) {
			throw new Error(
				"GITHUB_ENV is required for the OAuth access token.",
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
			`OAuth token request succeeded (${result.scopes.join(",")}); token value was not emitted.`,
		);
	} catch (error) {
		console.error(
			error instanceof Error
				? error.message
				: "OAuth token request failed safely.",
		);
		process.exitCode = 1;
	}
}
