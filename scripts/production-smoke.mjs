import { appendFile } from "node:fs/promises";

const baseUrl = (
	process.env.DEPLOYMENT_SMOKE_BASE_URL ?? "https://blog.whynotsnow.com"
).replace(/\/+$/u, "");
const routes = [
	{ path: "/", marker: "<title>" },
	{ path: "/robots.txt", marker: "Sitemap:" },
];

function fail(message) {
	console.error(message);
	process.exitCode = 1;
}

const failures = [];
const failureCodes = new Set();
for (const route of routes) {
	const url = `${baseUrl}${route.path}`;
	try {
		const response = await fetch(url, { redirect: "follow" });
		const body = await response.text();
		if (response.status !== 200) {
			failureCodes.add("public_smoke_http_status");
			failures.push(`${route.path}:http_${response.status}`);
			continue;
		}
		if (!body.includes(route.marker)) {
			failureCodes.add("public_smoke_marker_missing");
			failures.push(`${route.path}:marker_missing`);
			continue;
		}
		console.log(
			`public smoke passed: ${route.path} status=${response.status}`,
		);
	} catch (error) {
		failureCodes.add("public_smoke_request_failed");
		failures.push(
			`${route.path}:${error instanceof Error ? error.name : "request_failed"}`,
		);
	}
}

const output = process.env.GITHUB_OUTPUT;
if (output) {
	await appendFile(
		output,
		`smoke-outcome=${failures.length === 0 ? "succeeded" : "failed"}\n` +
			`smoke-failure-code=${[...failureCodes].join(",")}\n`,
	);
}
if (failures.length > 0) fail(`public smoke failed: ${failures.join(", ")}`);
