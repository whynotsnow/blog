import { spawnSync } from "node:child_process";
import { ContentSyncError } from "./config.mjs";

function sanitizeOutput(value, secrets) {
	let sanitized = String(value || "");

	for (const secret of secrets) {
		if (secret) sanitized = sanitized.replaceAll(secret, "<redacted>");
	}

	return sanitized.replace(
		/([a-z][a-z\d+.-]*:\/\/)[^\s/@]+@/gi,
		"$1<redacted>@",
	);
}

export function createGitRunner({ spawn = spawnSync } = {}) {
	return function runGit(args, options = {}) {
		const result = spawn("git", args, {
			cwd: options.cwd,
			encoding: "utf8",
			shell: false,
			stdio: ["ignore", "pipe", "pipe"],
		});

		if (result.error || result.status !== 0) {
			const operation = args[0] || "command";
			const details = sanitizeOutput(
				result.stderr,
				options.secrets || [],
			);
			throw new ContentSyncError(
				`Git ${operation} failed${details ? `: ${details.trim()}` : ""}`,
				{ cause: result.error },
			);
		}

		return String(result.stdout || "").trim();
	};
}
