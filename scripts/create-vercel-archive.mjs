import {
	CANONICAL_ARCHIVE_NAME,
	CANONICAL_METADATA_NAME,
	createCanonicalArchive,
	writeGithubOutputs,
} from "./vercel-archive.mjs";

const [
	outputDirectory = ".vercel/output",
	archivePath = CANONICAL_ARCHIVE_NAME,
	metadataPath = CANONICAL_METADATA_NAME,
] = process.argv.slice(2);

try {
	const metadata = createCanonicalArchive(
		outputDirectory,
		archivePath,
		metadataPath,
	);
	writeGithubOutputs({
		"source-digest": metadata.sourceArtifactDigest,
		"archive-digest": metadata.archiveDigest,
		"archive-size": metadata.archiveSizeBytes,
	});
	console.log(
		`Created ${metadata.canonicalArchiveName}: ${metadata.archiveDigest} (${metadata.archiveSizeBytes} bytes); source=${metadata.sourceArtifactDigest}`,
	);
} catch (error) {
	console.error(
		`[vercel-archive] ${error instanceof Error ? error.message : error}`,
	);
	process.exitCode = 1;
}
