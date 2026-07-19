import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ContentSyncError,
	parseContentSyncConfig,
} from "../../../scripts/content-sync/config.mjs";
import { createGitRunner } from "../../../scripts/content-sync/git.mjs";
import {
	CONTENT_MAPPINGS,
	prepareContent,
	preparePinnedCheckout,
	restoreLocalContent,
	validateContentCheckout,
} from "../../../scripts/content-sync/prepare.mjs";

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

function createProjectContent(rootDir: string, marker: string) {
	for (const mapping of CONTENT_MAPPINGS) {
		const destination = path.join(rootDir, mapping.destination);
		fs.mkdirSync(destination, { recursive: true });
		fs.writeFileSync(path.join(destination, "marker.txt"), marker);
	}
}

function createReleaseCheckout(rootDir: string, marker: string) {
	const checkoutDir = fs.mkdtempSync(path.join(rootDir, "checkout-"));
	for (const mapping of CONTENT_MAPPINGS) {
		const source = path.join(checkoutDir, mapping.source);
		fs.mkdirSync(source, { recursive: true });
		fs.writeFileSync(path.join(source, "marker.txt"), marker);
	}
	return checkoutDir;
}

function createExternalConfig(rootDir: string, sha = commitSha) {
	return parseContentSyncConfig(
		{
			ENABLE_CONTENT_SYNC: "true",
			CONTENT_REPO_URL: "https://example.com/content.git",
			CONTENT_REPO_COMMIT_SHA: sha,
		},
		rootDir,
	);
}

describe("content checkout validation", () => {
	it("requires all four real directories", () => {
		const rootDir = createTempDirectory();
		const checkoutDir = createReleaseCheckout(rootDir, "external");
		fs.rmSync(path.join(checkoutDir, "images"), { recursive: true });

		expect(() => validateContentCheckout(checkoutDir)).toThrow("images");

		fs.symlinkSync("posts", path.join(checkoutDir, "images"), "dir");
		expect(() => validateContentCheckout(checkoutDir)).toThrow(
			"real directory",
		);
	});
});

describe("atomic content activation", () => {
	it("activates all mappings through one current release and reuses the SHA", () => {
		const rootDir = createTempDirectory();
		createProjectContent(rootDir, "local");
		const config = createExternalConfig(rootDir);
		const checkoutDir = createReleaseCheckout(rootDir, "external");
		const prepareCheckout = vi.fn(() => ({
			checkoutDir,
			commitSha,
			cleanup: vi.fn(),
		}));
		const logger = { log: vi.fn(), warn: vi.fn() };

		prepareContent(config, { prepareCheckout, logger });

		for (const mapping of CONTENT_MAPPINGS) {
			const destination = path.join(rootDir, mapping.destination);
			expect(fs.lstatSync(destination).isSymbolicLink()).toBe(true);
			expect(
				fs.readFileSync(path.join(destination, "marker.txt"), "utf8"),
			).toBe("external");
		}
		expect(logger.log).toHaveBeenCalledWith(
			`[content] mode=external commit=${commitSha}`,
		);

		prepareContent(config, { prepareCheckout, logger });
		expect(prepareCheckout).toHaveBeenCalledTimes(1);
	});

	it("leaves local content untouched when validation fails", () => {
		const rootDir = createTempDirectory();
		createProjectContent(rootDir, "local");
		const config = createExternalConfig(rootDir);
		const checkoutDir = createReleaseCheckout(rootDir, "external");
		fs.rmSync(path.join(checkoutDir, "spec"), { recursive: true });

		const cleanup = vi.fn();
		expect(() =>
			prepareContent(config, {
				prepareCheckout: () => ({
					checkoutDir,
					commitSha,
					cleanup,
				}),
				logger: { log: vi.fn(), warn: vi.fn() },
			}),
		).toThrow("spec");
		expect(cleanup).toHaveBeenCalledOnce();

		for (const mapping of CONTENT_MAPPINGS) {
			expect(
				fs.readFileSync(
					path.join(rootDir, mapping.destination, "marker.txt"),
					"utf8",
				),
			).toBe("local");
		}
	});

	it("rolls back every local mapping when managed link installation fails", () => {
		const rootDir = createTempDirectory();
		createProjectContent(rootDir, "local");
		const config = createExternalConfig(rootDir);
		const checkoutDir = createReleaseCheckout(rootDir, "external");
		const originalSymlink = fs.symlinkSync.bind(fs);
		const fsApi = Object.assign(Object.create(fs), {
			symlinkSync(
				target: fs.PathLike,
				destination: fs.PathLike,
				type?: fs.symlink.Type,
			) {
				if (
					path.normalize(String(destination)) ===
					path.join(rootDir, "src/data")
				) {
					throw new Error("injected link failure");
				}
				return originalSymlink(target, destination, type);
			},
		});

		expect(() =>
			prepareContent(config, {
				fsApi,
				prepareCheckout: () => ({
					checkoutDir,
					commitSha,
					cleanup: vi.fn(),
				}),
				logger: { log: vi.fn(), warn: vi.fn() },
			}),
		).toThrow("local content was restored");

		for (const mapping of CONTENT_MAPPINGS) {
			const destination = path.join(rootDir, mapping.destination);
			expect(fs.lstatSync(destination).isSymbolicLink()).toBe(false);
			expect(
				fs.readFileSync(path.join(destination, "marker.txt"), "utf8"),
			).toBe("local");
		}
		expect(fs.existsSync(path.join(config.stateDir, "current"))).toBe(
			false,
		);
	});

	it("restores the original local directories", () => {
		const rootDir = createTempDirectory();
		createProjectContent(rootDir, "local");
		const externalConfig = createExternalConfig(rootDir);
		const checkoutDir = createReleaseCheckout(rootDir, "external");
		prepareContent(externalConfig, {
			prepareCheckout: () => ({
				checkoutDir,
				commitSha,
				cleanup: vi.fn(),
			}),
			logger: { log: vi.fn(), warn: vi.fn() },
		});

		const localConfig = parseContentSyncConfig({}, rootDir);
		expect(restoreLocalContent(localConfig)).toBe(true);
		for (const mapping of CONTENT_MAPPINGS) {
			const destination = path.join(rootDir, mapping.destination);
			expect(fs.lstatSync(destination).isSymbolicLink()).toBe(false);
			expect(
				fs.readFileSync(path.join(destination, "marker.txt"), "utf8"),
			).toBe("local");
		}
	});
});
