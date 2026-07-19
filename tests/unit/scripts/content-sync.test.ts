import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ContentSyncError,
	parseContentSyncConfig,
} from "../../../scripts/content-sync/config.mjs";
import { createGitRunner } from "../../../scripts/content-sync/git.mjs";
import { preparePinnedCheckout } from "../../../scripts/content-sync/prepare.mjs";

const tempDirectories: string[] = [];
const commitSha = "a".repeat(40);

function createTempDirectory() {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), "content-sync-"));
	tempDirectories.push(directory);
	return directory;
}

afterEach(() => {
	for (const directory of tempDirectories.splice(0)) {
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

describe("content sync configuration", () => {
	it("defaults to explicit local mode", () => {
		const rootDir = createTempDirectory();

		expect(parseContentSyncConfig({}, rootDir)).toMatchObject({
			enabled: false,
			mode: "local",
			stateDir: path.join(rootDir, "content"),
		});
	});

	it.each([
		["yes", "ENABLE_CONTENT_SYNC"],
		["TRUE", "ENABLE_CONTENT_SYNC"],
	])("rejects invalid enable value %s", (value, message) => {
		expect(() =>
			parseContentSyncConfig(
				{ ENABLE_CONTENT_SYNC: value },
				createTempDirectory(),
			),
		).toThrow(message);
	});

	it("requires a repository URL and complete SHA", () => {
		const rootDir = createTempDirectory();

		expect(() =>
			parseContentSyncConfig({ ENABLE_CONTENT_SYNC: "true" }, rootDir),
		).toThrow("CONTENT_REPO_URL");
		expect(() =>
			parseContentSyncConfig(
				{
					ENABLE_CONTENT_SYNC: "true",
					CONTENT_REPO_URL: "https://example.com/content.git",
					CONTENT_REPO_COMMIT_SHA: "abc123",
				},
				rootDir,
			),
		).toThrow("40-character");
	});
});

describe("pinned Git checkout", () => {
	it("uses argument arrays without a shell and resolves the requested SHA", () => {
		const rootDir = createTempDirectory();
		const repositoryUrl =
			"https://token@example.com/content.git;touch injected";
		const config = parseContentSyncConfig(
			{
				ENABLE_CONTENT_SYNC: "true",
				CONTENT_REPO_URL: repositoryUrl,
				CONTENT_REPO_COMMIT_SHA: commitSha,
			},
			rootDir,
		);
		const spawn = vi.fn((_: string, args: string[]) => ({
			status: 0,
			stdout: args[0] === "rev-parse" ? `${commitSha}\n` : "",
			stderr: "",
		}));
		const runGit = createGitRunner({ spawn: spawn as never });

		const prepared = preparePinnedCheckout(config, { runGit });
		prepared.cleanup();

		expect(spawn).toHaveBeenCalledWith(
			"git",
			["remote", "add", "origin", repositoryUrl],
			expect.objectContaining({ shell: false }),
		);
		expect(spawn).toHaveBeenCalledWith(
			"git",
			["fetch", "--quiet", "--depth=1", "origin", commitSha],
			expect.objectContaining({ shell: false }),
		);
		expect(fs.existsSync(path.join(rootDir, "injected"))).toBe(false);
	});

	it("redacts credential-bearing repository URLs from failures", () => {
		const repositoryUrl = "https://secret@example.com/content.git";
		const runGit = createGitRunner({
			spawn: (() => ({
				status: 1,
				stdout: "",
				stderr: `failed to fetch ${repositoryUrl}`,
			})) as never,
		});

		expect(() =>
			runGit(["fetch", "origin"], {
				secrets: [repositoryUrl],
			}),
		).toThrow("<redacted>");
		try {
			runGit(["fetch", "origin"], { secrets: [repositoryUrl] });
		} catch (error) {
			expect(String(error)).not.toContain("secret");
		}
	});

	it("removes staging when the fetched commit does not match", () => {
		const rootDir = createTempDirectory();
		const config = parseContentSyncConfig(
			{
				ENABLE_CONTENT_SYNC: "true",
				CONTENT_REPO_URL: "https://example.com/content.git",
				CONTENT_REPO_COMMIT_SHA: commitSha,
			},
			rootDir,
		);
		const runGit = vi.fn((args: string[]) =>
			args[0] === "rev-parse" ? "b".repeat(40) : "",
		);

		expect(() => preparePinnedCheckout(config, { runGit })).toThrow(
			ContentSyncError,
		);
		expect(fs.readdirSync(path.join(config.stateDir, "staging"))).toEqual(
			[],
		);
	});
});
