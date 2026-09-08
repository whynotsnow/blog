import {
	CANONICAL_ARCHIVE_NAME,
	CANONICAL_METADATA_NAME,
	verifyCanonicalArchive,
	writeGithubOutputs,
} from "./vercel-archive.mjs";

const [artifactDirectory, outputDirectory, expectedSourceDigest] =
	process.argv.slice(2);

if (!artifactDirectory || !outputDirectory) {
	console.error(
		`Usage: node scripts/verify-vercel-archive.mjs <artifact-dir> <output-dir> [expected-source-digest]`,
	);
	process.exit(1);
}

try {
	const metadata = verifyCanonicalArchive(
		artifactDirectory,
		outputDirectory,
		expectedSourceDigest,
	);
	writeGithubOutputs({
		"archive-digest": metadata.archiveDigest,
		"archive-size": metadata.archiveSizeBytes,
	});
	console.log(
		`Verified ${CANONICAL_ARCHIVE_NAME} and ${CANONICAL_METADATA_NAME}: ${metadata.archiveDigest}`,
	);
} catch (error) {
	console.error(
		`[vercel-archive] ${error instanceof Error ? error.message : error}`,
	);
	process.exitCode = 1;
}
