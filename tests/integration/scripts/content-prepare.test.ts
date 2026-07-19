import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseContentSyncConfig } from "../../../scripts/content-sync/config.mjs";
import {
	CONTENT_MAPPINGS,
	prepareContent,
	restoreLocalContent,
} from "../../../scripts/content-sync/prepare.mjs";

const tempDirectories: string[] = [];

function createTempDirectory(prefix: string) {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
	tempDirectories.push(directory);
	return directory;
}

function runGit(cwd: string, args: string[]) {
	const result = spawnSync("git", args, {
		cwd,
		encoding: "utf8",
		shell: false,
	});
	if (result.status !== 0) throw new Error(result.stderr);
	return result.stdout.trim();
}

function createContentRepository() {
	const repository = createTempDirectory("content-repository-");
	runGit(repository, ["init", "--quiet"]);
	for (const mapping of CONTENT_MAPPINGS) {
		const directory = path.join(repository, mapping.source);
		fs.mkdirSync(directory, { recursive: true });
		fs.writeFileSync(path.join(directory, "marker.txt"), "external");
	}
	runGit(repository, ["add", "."]);
	runGit(repository, [
		"-c",
		"user.name=Content Fixture",
		"-c",
		"user.email=fixture@example.invalid",
		"commit",
		"--quiet",
		"-m",
		"fixture",
	]);
	return {
		repository,
		commitSha: runGit(repository, ["rev-parse", "HEAD"]),
	};
}

function createLocalProject() {
	const rootDir = createTempDirectory("content-project-");
	for (const mapping of CONTENT_MAPPINGS) {
		const directory = path.join(rootDir, mapping.destination);
		fs.mkdirSync(directory, { recursive: true });
		fs.writeFileSync(path.join(directory, "marker.txt"), "local");
	}
	return rootDir;
}

afterEach(() => {
	for (const directory of tempDirectories.splice(0)) {
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

describe("content preparation integration", () => {
	it("fetches an exact local Git commit, activates it, and restores local content", () => {
		const { repository, commitSha } = createContentRepository();
		const rootDir = createLocalProject();
		const config = parseContentSyncConfig(
			{
				ENABLE_CONTENT_SYNC: "true",
				CONTENT_REPO_URL: repository,
				CONTENT_REPO_COMMIT_SHA: commitSha,
			},
			rootDir,
		);
		const logger = { log: vi.fn(), warn: vi.fn() };

		prepareContent(config, { logger });

		for (const mapping of CONTENT_MAPPINGS) {
			expect(
				fs.readFileSync(
					path.join(rootDir, mapping.destination, "marker.txt"),
					"utf8",
				),
			).toBe("external");
		}
		expect(logger.log).toHaveBeenCalledWith(
			`[content] mode=external commit=${commitSha}`,
		);

		const localConfig = parseContentSyncConfig({}, rootDir);
		expect(restoreLocalContent(localConfig)).toBe(true);
	});
});
