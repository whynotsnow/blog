import fs from "node:fs";
import path from "node:path";
import { ContentSyncError } from "./config.mjs";
import { createGitRunner } from "./git.mjs";

export const CONTENT_MAPPINGS = Object.freeze([
	{ source: "posts", destination: "src/content/posts" },
	{ source: "spec", destination: "src/content/spec" },
	{ source: "data", destination: "src/data" },
	{ source: "images", destination: "public/images" },
]);

function isSamePath(left, right) {
	return path.normalize(left) === path.normalize(right);
}

function isManagedLink(config, mapping, fsApi = fs) {
	const destination = path.join(config.rootDir, mapping.destination);
	if (!fsApi.existsSync(destination)) return false;

	const stat = fsApi.lstatSync(destination);
	if (!stat.isSymbolicLink()) return false;

	const actualTarget = path.resolve(
		path.dirname(destination),
		fsApi.readlinkSync(destination),
	);
	const expectedTarget = path.join(
		config.stateDir,
		"current",
		mapping.source,
	);
	return isSamePath(actualTarget, expectedTarget);
}

function readManagedState(config, fsApi = fs) {
	return CONTENT_MAPPINGS.map((mapping) =>
		isManagedLink(config, mapping, fsApi),
	);
}

function createDirectoryLink(target, destination, fsApi = fs) {
	const relativeTarget = path.relative(path.dirname(destination), target);
	fsApi.symlinkSync(
		process.platform === "win32" ? target : relativeTarget,
		destination,
		process.platform === "win32" ? "junction" : "dir",
	);
}

function replaceCurrentPointer(config, commitSha, fsApi = fs) {
	const currentPath = path.join(config.stateDir, "current");
	const temporaryPath = path.join(
		config.stateDir,
		`.current-${process.pid}-${Date.now()}`,
	);
	const releasePath = path.join(config.stateDir, "releases", commitSha);

	createDirectoryLink(releasePath, temporaryPath, fsApi);
	try {
		fsApi.renameSync(temporaryPath, currentPath);
	} catch (error) {
		fsApi.rmSync(temporaryPath, { force: true });
		throw new ContentSyncError(
			"Unable to atomically switch content release",
			{
				cause: error,
			},
		);
	}
}

function removeCurrentPointer(config, fsApi = fs) {
	const currentPath = path.join(config.stateDir, "current");
	if (fsApi.existsSync(currentPath))
		fsApi.rmSync(currentPath, { force: true });
}

function getCurrentCommit(config, fsApi = fs) {
	const currentPath = path.join(config.stateDir, "current");
	if (!fsApi.existsSync(currentPath)) return undefined;
	if (!fsApi.lstatSync(currentPath).isSymbolicLink()) {
		throw new ContentSyncError("CONTENT_DIR/current is not a managed link");
	}

	const resolved = path.resolve(
		path.dirname(currentPath),
		fsApi.readlinkSync(currentPath),
	);
	const releasesRoot = path.join(config.stateDir, "releases");
	if (!isSamePath(path.dirname(resolved), releasesRoot)) {
		throw new ContentSyncError(
			"CONTENT_DIR/current points outside releases",
		);
	}

	return path.basename(resolved);
}

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

export function validateContentCheckout(checkoutDir, fsApi = fs) {
	for (const mapping of CONTENT_MAPPINGS) {
		const sourcePath = path.join(checkoutDir, mapping.source);
		if (!fsApi.existsSync(sourcePath)) {
			throw new ContentSyncError(
				`Content checkout is missing required directory: ${mapping.source}`,
			);
		}

		const stat = fsApi.lstatSync(sourcePath);
		if (!stat.isDirectory() || stat.isSymbolicLink()) {
			throw new ContentSyncError(
				`Content checkout entry must be a real directory: ${mapping.source}`,
			);
		}
	}
}

function installManagedMappings(config, fsApi = fs) {
	const managedState = readManagedState(config, fsApi);
	if (managedState.every(Boolean)) return;
	if (managedState.some(Boolean)) {
		throw new ContentSyncError(
			"Content mappings are partially managed; refusing an unsafe activation",
		);
	}

	const backupRoot = path.join(config.stateDir, "local-backup");
	fsApi.mkdirSync(backupRoot, { recursive: true });
	const completed = [];

	try {
		for (const mapping of CONTENT_MAPPINGS) {
			const destination = path.join(config.rootDir, mapping.destination);
			const backup = path.join(backupRoot, mapping.source);
			const externalSource = path.join(
				config.stateDir,
				"current",
				mapping.source,
			);

			if (!fsApi.existsSync(destination)) {
				throw new ContentSyncError(
					`Local content directory does not exist: ${mapping.destination}`,
				);
			}
			if (fsApi.lstatSync(destination).isSymbolicLink()) {
				throw new ContentSyncError(
					`Refusing to replace unmanaged content link: ${mapping.destination}`,
				);
			}
			if (fsApi.existsSync(backup)) {
				throw new ContentSyncError(
					`Local content backup already exists: ${mapping.source}`,
				);
			}

			fsApi.renameSync(destination, backup);
			completed.push({ mapping, destination, backup, linked: false });
			createDirectoryLink(externalSource, destination, fsApi);
			const completedMapping = completed.at(-1);
			if (completedMapping) completedMapping.linked = true;
		}
	} catch (error) {
		for (const item of completed.reverse()) {
			if (item.linked && fsApi.existsSync(item.destination)) {
				fsApi.rmSync(item.destination, { force: true });
			}
			if (fsApi.existsSync(item.backup)) {
				fsApi.renameSync(item.backup, item.destination);
			}
		}
		throw new ContentSyncError(
			"Unable to install managed content mappings; local content was restored",
			{ cause: error },
		);
	}
}

export function restoreLocalContent(config, fsApi = fs) {
	const managedState = readManagedState(config, fsApi);
	if (managedState.every((managed) => !managed)) return false;
	if (!managedState.every(Boolean)) {
		throw new ContentSyncError(
			"Content mappings are partially managed; refusing an unsafe restore",
		);
	}

	const backupRoot = path.join(config.stateDir, "local-backup");
	for (const mapping of CONTENT_MAPPINGS) {
		const backup = path.join(backupRoot, mapping.source);
		if (
			!fsApi.existsSync(backup) ||
			fsApi.lstatSync(backup).isSymbolicLink()
		) {
			throw new ContentSyncError(
				`Local content backup is missing or invalid: ${mapping.source}`,
			);
		}
	}

	const transitions = [];
	try {
		for (const mapping of CONTENT_MAPPINGS) {
			const destination = path.join(config.rootDir, mapping.destination);
			const backup = path.join(backupRoot, mapping.source);
			const transition = {
				mapping,
				destination,
				backup,
				state: "managed",
			};
			transitions.push(transition);
			fsApi.rmSync(destination, { force: true });
			transition.state = "removed";
			fsApi.renameSync(backup, destination);
			transition.state = "restored";
		}
	} catch (error) {
		for (const item of transitions.reverse()) {
			if (item.state === "restored") {
				fsApi.renameSync(item.destination, item.backup);
			}
			if (
				item.state !== "managed" &&
				!fsApi.existsSync(item.destination)
			) {
				createDirectoryLink(
					path.join(config.stateDir, "current", item.mapping.source),
					item.destination,
					fsApi,
				);
			}
		}
		throw new ContentSyncError(
			"Unable to restore local content; managed mappings were reinstated",
			{ cause: error },
		);
	}

	removeCurrentPointer(config, fsApi);
	return true;
}

function promoteCheckout(config, prepared, fsApi = fs) {
	const releasesRoot = path.join(config.stateDir, "releases");
	const releasePath = path.join(releasesRoot, prepared.commitSha);
	fsApi.mkdirSync(releasesRoot, { recursive: true });

	if (fsApi.existsSync(releasePath)) {
		validateContentCheckout(releasePath, fsApi);
		prepared.cleanup();
		return releasePath;
	}

	try {
		validateContentCheckout(prepared.checkoutDir, fsApi);
		fsApi.renameSync(prepared.checkoutDir, releasePath);
		return releasePath;
	} catch (error) {
		prepared.cleanup();
		throw error;
	}
}

function cleanupReleases(config, keepCommits, fsApi = fs) {
	const releasesRoot = path.join(config.stateDir, "releases");
	if (!fsApi.existsSync(releasesRoot)) return;

	for (const entry of fsApi.readdirSync(releasesRoot)) {
		if (!keepCommits.has(entry)) {
			fsApi.rmSync(path.join(releasesRoot, entry), {
				recursive: true,
				force: true,
			});
		}
	}
}

function cleanupStaging(config, fsApi = fs) {
	const stagingRoot = path.join(config.stateDir, "staging");
	if (!fsApi.existsSync(stagingRoot)) return;

	for (const entry of fsApi.readdirSync(stagingRoot)) {
		fsApi.rmSync(path.join(stagingRoot, entry), {
			recursive: true,
			force: true,
		});
	}
}

export function prepareContent(
	config,
	{
		fsApi = fs,
		prepareCheckout = preparePinnedCheckout,
		logger = console,
	} = {},
) {
	if (!config.enabled) {
		restoreLocalContent(config, fsApi);
		logger.log("[content] mode=local");
		return { mode: "local" };
	}

	cleanupStaging(config, fsApi);

	const previousCommit = getCurrentCommit(config, fsApi);
	const existingRelease = path.join(
		config.stateDir,
		"releases",
		config.commitSha,
	);

	if (fsApi.existsSync(existingRelease)) {
		validateContentCheckout(existingRelease, fsApi);
	} else {
		const prepared = prepareCheckout(config, { fsApi });
		promoteCheckout(config, prepared, fsApi);
	}

	if (previousCommit !== config.commitSha) {
		replaceCurrentPointer(config, config.commitSha, fsApi);
	}

	try {
		installManagedMappings(config, fsApi);
	} catch (error) {
		if (previousCommit) {
			replaceCurrentPointer(config, previousCommit, fsApi);
		} else {
			removeCurrentPointer(config, fsApi);
		}
		throw error;
	}

	const keepCommits = new Set(
		[config.commitSha, previousCommit].filter(Boolean),
	);
	try {
		cleanupReleases(config, keepCommits, fsApi);
	} catch (error) {
		logger.warn(`[content] release cleanup skipped: ${error.message}`);
	}

	logger.log(`[content] mode=external commit=${config.commitSha}`);
	return { mode: "external", commitSha: config.commitSha };
}
