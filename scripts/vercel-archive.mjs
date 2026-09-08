import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	closeSync,
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	openSync,
	readFileSync,
	readdirSync,
	readSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

export const CANONICAL_ARCHIVE_NAME = "vercel-output.tar.gz";
export const CANONICAL_METADATA_NAME = "vercel-output-metadata.json";
export const CANONICAL_GNU_TAR_OPTIONS = Object.freeze([
	"--sort=name",
	"--mtime=UTC 1970-01-01",
	"--owner=0",
	"--group=0",
	"--numeric-owner",
	"--mode=0644",
	"--format=gnu",
]);
const CANONICAL_ROOT_NAME = "output";

function fail(message) {
	throw new Error(message);
}

function writeOctal(header, offset, length, value) {
	const encoded = value.toString(8).padStart(length - 1, "0");
	header.write(encoded, offset, length - 1, "ascii");
	header[offset + length - 1] = 0;
}

function writeString(header, offset, length, value) {
	const encoded = Buffer.from(value, "utf8");
	if (encoded.length > length)
		fail(`Tar path or metadata field is too long: ${value}`);
	encoded.copy(header, offset);
}

function portableTar(outputDirectory, tarPath) {
	const root = assertSafeOutput(outputDirectory);
	const entries = [];
	function collect(directory, relativeDirectory) {
		entries.push({
			absolutePath: directory,
			relativePath: relativeDirectory,
			type: "directory",
		});
		for (const entry of readdirSync(directory, {
			withFileTypes: true,
		}).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
			const absolutePath = join(directory, entry.name);
			const relativePath = `${relativeDirectory}/${entry.name}`;
			if (entry.isDirectory()) collect(absolutePath, relativePath);
			else entries.push({ absolutePath, relativePath, type: "file" });
		}
	}
	collect(root, CANONICAL_ROOT_NAME);

	const blocks = [];
	for (const entry of entries) {
		const header = Buffer.alloc(512, 0);
		const pathParts = entry.relativePath.split("/");
		const name = pathParts.pop();
		const prefix = pathParts.join("/");
		if (Buffer.byteLength(name) > 100 || Buffer.byteLength(prefix) > 155) {
			fail(
				`Tar path is too long for the canonical portable fallback: ${entry.relativePath}`,
			);
		}
		writeString(header, 0, 100, name);
		writeOctal(header, 100, 8, 0o644);
		writeOctal(header, 108, 8, 0);
		writeOctal(header, 116, 8, 0);
		const content =
			entry.type === "file"
				? readFileSync(entry.absolutePath)
				: Buffer.alloc(0);
		writeOctal(header, 124, 12, content.length);
		writeOctal(header, 136, 12, 0);
		header[148] = 32;
		header[156] = entry.type === "directory" ? 53 : 48;
		writeString(header, 257, 6, "ustar\0");
		writeString(header, 263, 2, "00");
		writeString(header, 265, 32, "root");
		writeString(header, 297, 32, "root");
		writeString(header, 345, 155, prefix);
		const checksum = header.reduce((sum, byte) => sum + byte, 0);
		header.write(checksum.toString(8).padStart(6, "0"), 148, 6, "ascii");
		header[154] = 0;
		header[155] = 32;
		header[156] = entry.type === "directory" ? 53 : 48;
		blocks.push(header, content);
		if (content.length % 512 !== 0)
			blocks.push(Buffer.alloc(512 - (content.length % 512)));
	}
	blocks.push(Buffer.alloc(1024));
	writeFileSync(tarPath, Buffer.concat(blocks));
}

export function assertSafeOutput(outputDirectory) {
	const root = resolve(outputDirectory);
	if (!existsSync(root) || !lstatSync(root).isDirectory()) {
		fail(`Vercel output directory does not exist: ${outputDirectory}`);
	}
	if (!existsSync(join(root, "config.json"))) {
		fail("Vercel output is missing config.json.");
	}

	function walk(directory) {
		for (const entry of readdirSync(directory, {
			withFileTypes: true,
		}).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
			const entryPath = join(directory, entry.name);
			const entryStats = lstatSync(entryPath);
			if (entryStats.isSymbolicLink()) {
				fail(
					`Vercel output must not contain symbolic links: ${entryPath}`,
				);
			}
			if (entryStats.isDirectory()) {
				walk(entryPath);
			} else if (!entryStats.isFile()) {
				fail(
					`Vercel output contains an unsupported file type: ${entryPath}`,
				);
			}
		}
	}

	walk(root);
	return root;
}

function createTar(outputDirectory, tarPath) {
	const root = assertSafeOutput(outputDirectory);
	let tarProgram = "tar";
	try {
		execFileSync("tar", ["--sort=name", "--help"], {
			stdio: "ignore",
			env: { ...process.env, LC_ALL: "C" },
		});
	} catch {
		try {
			execFileSync("gtar", ["--sort=name", "--help"], {
				stdio: "ignore",
				env: { ...process.env, LC_ALL: "C" },
			});
			tarProgram = "gtar";
		} catch {
			// macOS 默认 BSD tar 没有 GNU 的 sort/name 参数，使用同样固定字段的 portable ustar writer。
			portableTar(root, tarPath);
			return { format: "ustar-portable" };
		}
	}
	execFileSync(
		tarProgram,
		[
			...CANONICAL_GNU_TAR_OPTIONS,
			"-cf",
			tarPath,
			"-C",
			dirname(root),
			basename(root),
		],
		{
			stdio: ["ignore", "ignore", "inherit"],
			env: { ...process.env, LC_ALL: "C" },
		},
	);
	return { format: "gnu" };
}

export function hashFile(filePath) {
	const fd = openSync(filePath, "r");
	const hash = createHash("sha256");
	const buffer = Buffer.allocUnsafe(1024 * 1024);
	try {
		let bytesRead = 0;
		do {
			bytesRead = readSync(fd, buffer, 0, buffer.length, null);
			if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
		} while (bytesRead > 0);
	} finally {
		closeSync(fd);
	}
	return `sha256:${hash.digest("hex")}`;
}

export function computeCanonicalSourceDigest(outputDirectory) {
	const staging = mkdtempSync(join(tmpdir(), "vercel-source-digest-"));
	const tarPath = join(staging, "payload.tar");
	try {
		createTar(outputDirectory, tarPath);
		return hashFile(tarPath);
	} finally {
		rmSync(staging, { recursive: true, force: true });
	}
}

/**
 * @param {string} outputDirectory
 * @param {string} archivePath
 * @param {string|null} metadataPath
 */
export function createCanonicalArchive(
	outputDirectory,
	archivePath,
	metadataPath = null,
) {
	const archive = resolve(archivePath);
	if (basename(archive) !== CANONICAL_ARCHIVE_NAME) {
		fail(`Archive must be named ${CANONICAL_ARCHIVE_NAME}.`);
	}
	const sourceDigest = computeCanonicalSourceDigest(outputDirectory);
	const staging = mkdtempSync(join(tmpdir(), "vercel-archive-"));
	const tarPath = join(staging, "payload.tar");
	let archiveFd;
	try {
		mkdirSync(dirname(archive), { recursive: true });
		const tarResult = createTar(outputDirectory, tarPath);
		archiveFd = openSync(archive, "w");
		execFileSync("gzip", ["-n", "-9", "-c", tarPath], {
			stdio: ["ignore", archiveFd, "inherit"],
		});
		closeSync(archiveFd);
		archiveFd = undefined;

		const metadata = {
			schemaVersion: 1,
			canonicalArchiveName: CANONICAL_ARCHIVE_NAME,
			canonicalArchiveRoot: CANONICAL_ROOT_NAME,
			sourceArtifactDigest: sourceDigest,
			archiveDigest: hashFile(archive),
			archiveSizeBytes: statSync(archive).size,
			tar: {
				format: tarResult.format,
				sort: "name",
				mtime: "1970-01-01T00:00:00Z",
				owner: 0,
				group: 0,
				numericOwner: true,
				mode: "0644",
			},
			gzip: { flags: ["-n", "-9"] },
		};
		if (metadataPath) {
			mkdirSync(dirname(resolve(metadataPath)), { recursive: true });
			writeFileSync(
				resolve(metadataPath),
				`${JSON.stringify(metadata, null, 2)}\n`,
				"utf8",
			);
		}
		return metadata;
	} finally {
		if (archiveFd !== undefined) closeSync(archiveFd);
		rmSync(staging, { recursive: true, force: true });
	}
}

export function readArchiveMetadata(artifactDirectory) {
	const metadataPath = join(
		resolve(artifactDirectory),
		CANONICAL_METADATA_NAME,
	);
	if (!existsSync(metadataPath) || !lstatSync(metadataPath).isFile()) {
		fail(`Missing ${CANONICAL_METADATA_NAME} in GitHub artifact.`);
	}
	try {
		return JSON.parse(readFileSync(metadataPath, "utf8"));
	} catch {
		fail(`Invalid ${CANONICAL_METADATA_NAME}.`);
	}
}

export function verifyCanonicalArchive(
	artifactDirectory,
	outputDirectory,
	expectedSourceDigest,
) {
	const artifactRoot = resolve(artifactDirectory);
	const archivePath = join(artifactRoot, CANONICAL_ARCHIVE_NAME);
	if (!existsSync(archivePath) || !lstatSync(archivePath).isFile()) {
		fail(`Missing ${CANONICAL_ARCHIVE_NAME} in GitHub artifact.`);
	}
	const metadata = readArchiveMetadata(artifactRoot);
	if (metadata.canonicalArchiveName !== CANONICAL_ARCHIVE_NAME) {
		fail("Archive metadata canonicalArchiveName mismatch.");
	}
	const sourceDigest = computeCanonicalSourceDigest(outputDirectory);
	if (metadata.sourceArtifactDigest !== sourceDigest) {
		fail("Archive metadata sourceArtifactDigest mismatch.");
	}
	if (expectedSourceDigest && expectedSourceDigest !== sourceDigest) {
		fail("Downloaded Vercel source artifact digest mismatch.");
	}
	const archiveDigest = hashFile(archivePath);
	if (metadata.archiveDigest !== archiveDigest) {
		fail("Archive digest mismatch.");
	}
	const archiveSizeBytes = statSync(archivePath).size;
	if (metadata.archiveSizeBytes !== archiveSizeBytes) {
		fail("Archive size metadata mismatch.");
	}
	return { ...metadata, archiveDigest, archiveSizeBytes };
}

export function writeGithubOutputs(outputs) {
	const outputFile = process.env.GITHUB_OUTPUT;
	if (!outputFile) return;
	writeFileSync(
		outputFile,
		Object.entries(outputs)
			.map(([key, value]) => `${key}=${value}`)
			.join("\n") + "\n",
		{ encoding: "utf8", flag: "a" },
	);
}
