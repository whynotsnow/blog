import fs from "node:fs";
import path from "node:path";
import { ContentSyncError } from "./config.mjs";
import { createGitRunner } from "./git.mjs";

export function preparePinnedCheckout(
	config,
	{ fsApi = fs, runGit = createGitRunner() } = {},
) {
	if (!config.enabled) {
		throw new ContentSyncError(
			"Pinned checkout preparation requires external content mode",
		);
	}

	const stagingRoot = path.join(config.stateDir, "staging");
	fsApi.mkdirSync(stagingRoot, { recursive: true });
	const checkoutDir = fsApi.mkdtempSync(path.join(stagingRoot, "checkout-"));

	try {
		runGit(["init", "--quiet", "."], { cwd: checkoutDir });
		runGit(["remote", "add", "origin", config.repositoryUrl], {
			cwd: checkoutDir,
			secrets: [config.repositoryUrl],
		});
		runGit(["fetch", "--quiet", "--depth=1", "origin", config.commitSha], {
			cwd: checkoutDir,
			secrets: [config.repositoryUrl],
		});
		runGit(["checkout", "--quiet", "--detach", "FETCH_HEAD"], {
			cwd: checkoutDir,
		});
		const resolvedSha = runGit(["rev-parse", "HEAD"], {
			cwd: checkoutDir,
		}).toLowerCase();

		if (resolvedSha !== config.commitSha) {
			throw new ContentSyncError(
				`Fetched content commit ${resolvedSha || "<unknown>"} does not match the requested SHA`,
			);
		}

		return {
			checkoutDir,
			commitSha: resolvedSha,
			cleanup() {
				fsApi.rmSync(checkoutDir, { recursive: true, force: true });
			},
		};
	} catch (error) {
		fsApi.rmSync(checkoutDir, { recursive: true, force: true });
		throw error;
	}
}
