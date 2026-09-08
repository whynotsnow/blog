const apiBaseUrl = (
	process.env.DEPLOY_APPROVAL_API_BASE_URL ?? "https://api.whynotsnow.com"
).replace(/\/+$/, "");
const token = process.env.DEPLOY_APPROVAL_TOKEN;
const artifactId = process.env.DEPLOY_APPROVAL_ARTIFACT_ID;
const approvalId = process.env.DEPLOY_APPROVAL_APPROVAL_ID;

/** @param {string} message @returns {never} */
function fail(message) {
	console.error(`[central-promotion] ${message}`);
	process.exit(1);
}

if (!token) fail("missing deployment approval token");
if (!artifactId?.trim()) fail("missing artifact id");
if (!approvalId?.trim()) fail("missing approval id");

let response;
try {
	response = await fetch(
		`${apiBaseUrl}/api/v1/deployments/artifacts/${encodeURIComponent(artifactId)}/central-promotion`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ approvalId }),
		},
	);
} catch {
	fail("promotion request failed");
}
const body = await response.json().catch(() => null);
if (!response.ok || body?.ok !== true) {
	const code =
		body?.error && typeof body.error === "object" && body.error.code
			? String(body.error.code)
			: `http_${response.status}`;
	fail(`promotion rejected: ${code}`);
}

console.log(
	"central artifact promotion succeeded; approval consumption may continue",
);
