import path from "node:path";

const FULL_COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export class ContentSyncError extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = "ContentSyncError";
	}
}

function parseEnabled(value) {
	if (value === undefined) return false;
	if (value === "true") return true;
	if (value === "false") return false;

	throw new ContentSyncError(
		'ENABLE_CONTENT_SYNC must be exactly "true" or "false"',
	);
}

function resolveStateDirectory(rootDir, value) {
	const stateDir = path.resolve(rootDir, value || "content");
	const filesystemRoot = path.parse(stateDir).root;

	if (stateDir === filesystemRoot || stateDir === path.resolve(rootDir)) {
		throw new ContentSyncError(
			"CONTENT_DIR must not resolve to the filesystem or project root",
		);
	}

	return stateDir;
}

export function parseContentSyncConfig(
	env = process.env,
	rootDir = process.cwd(),
) {
	const enabled = parseEnabled(env.ENABLE_CONTENT_SYNC);
	const stateDir = resolveStateDirectory(rootDir, env.CONTENT_DIR);

	if (!enabled) {
		return {
			enabled: false,
			mode: "local",
			rootDir: path.resolve(rootDir),
			stateDir,
		};
	}

	const repositoryUrl = env.CONTENT_REPO_URL?.trim();
	const commitSha = env.CONTENT_REPO_COMMIT_SHA?.trim().toLowerCase();

	if (!repositoryUrl) {
		throw new ContentSyncError(
			"CONTENT_REPO_URL is required when content sync is enabled",
		);
	}

	if (!commitSha || !FULL_COMMIT_SHA_PATTERN.test(commitSha)) {
		throw new ContentSyncError(
			"CONTENT_REPO_COMMIT_SHA must be a complete 40-character Git commit SHA",
		);
	}

	return {
		enabled: true,
		mode: "external",
		rootDir: path.resolve(rootDir),
		stateDir,
		repositoryUrl,
		commitSha,
	};
}
