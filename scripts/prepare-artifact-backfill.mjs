import { appendFileSync } from "node:fs";

const digestPattern = /^sha256:[a-f0-9]{64}$/u;

/** @param {string} message @returns {never} */
function fail(message) {
	console.error(`[artifact-backfill] ${message}`);
	process.exit(1);
}

function readSlot(number) {
	const prefix = `BACKFILL_${number}_`;
	const slot = {
		artifactId: process.env[`${prefix}ARTIFACT_ID`]?.trim() ?? "",
		artifactDigest: process.env[`${prefix}ARTIFACT_DIGEST`]?.trim() ?? "",
		runId: process.env[`${prefix}RUN_ID`]?.trim() ?? "",
		githubArtifactId:
			process.env[`${prefix}GITHUB_ARTIFACT_ID`]?.trim() ?? "",
	};
	const values = Object.values(slot);
	if (values.every((value) => value === "")) return null;
	if (values.some((value) => value === ""))
		fail(`backfill slot ${number} must provide all four identity fields`);
	if (!digestPattern.test(slot.artifactDigest))
		fail(`backfill slot ${number} has an invalid artifact digest`);
	if (!/^[1-9][0-9]*$/u.test(slot.runId))
		fail(`backfill slot ${number} has an invalid GitHub run id`);
	if (!/^[1-9][0-9]*$/u.test(slot.githubArtifactId))
		fail(`backfill slot ${number} has an invalid GitHub artifact id`);
	if (slot.artifactId.length > 128 || /[\r\n]/u.test(slot.artifactId))
		fail(`backfill slot ${number} has an invalid central artifact id`);
	return slot;
}

const slots = [readSlot(1), readSlot(2)].filter((slot) => slot !== null);
if (slots.length < 1 || slots.length > 2)
	fail("historical backfill requires one or two explicit artifacts");
if (new Set(slots.map((slot) => slot.artifactId)).size !== slots.length)
	fail("historical backfill artifact ids must be unique");

const outputFile = process.env.GITHUB_OUTPUT;
if (!outputFile) fail("GITHUB_OUTPUT is required");
appendFileSync(
	outputFile,
	`matrix=${JSON.stringify({ include: slots })}\n`,
	"utf8",
);
console.log(`Prepared ${slots.length} explicit historical artifact slot(s)`);
