import { execFileSync } from "node:child_process";
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

function runArchive(
	outputDirectory: string,
	archivePath: string,
	metadataPath: string,
) {
	execFileSync(
		process.execPath,
		[
			"scripts/create-vercel-archive.mjs",
			outputDirectory,
			archivePath,
			metadataPath,
		],
		{ cwd: process.cwd(), stdio: "ignore" },
	);
}

describe("canonical Vercel archive", () => {
	it("produces a stable archive and source digest despite source metadata changes", () => {
		const root = mkdtempSync(
			path.join(os.tmpdir(), "vercel-archive-test-"),
		);
		const output = path.join(root, ".vercel", "output");
		const archiveOne = path.join(root, "one", "vercel-output.tar.gz");
		const metadataOne = path.join(
			root,
			"one",
			"vercel-output-metadata.json",
		);
		const archiveTwo = path.join(root, "two", "vercel-output.tar.gz");
		const metadataTwo = path.join(
			root,
			"two",
			"vercel-output-metadata.json",
		);
		try {
			writeFileSync(path.join(root, ".keep"), "fixture\n");
			const config = path.join(output, "config.json");
			const asset = path.join(output, "static", "index.html");
			mkdirSync(path.dirname(asset), { recursive: true });
			writeFileSync(config, '{"version":1}\n', { flag: "w" });
			writeFileSync(asset, "<!doctype html>\n");
			chmodSync(config, 0o600);
			utimesSync(
				asset,
				new Date("2024-01-01T00:00:00Z"),
				new Date("2024-01-01T00:00:00Z"),
			);
			runArchive(output, archiveOne, metadataOne);
			chmodSync(config, 0o644);
			utimesSync(
				asset,
				new Date("2026-01-01T00:00:00Z"),
				new Date("2026-01-01T00:00:00Z"),
			);
			runArchive(output, archiveTwo, metadataTwo);

			expect(readFileSync(archiveTwo)).toEqual(readFileSync(archiveOne));
			const first = JSON.parse(readFileSync(metadataOne, "utf8"));
			const second = JSON.parse(readFileSync(metadataTwo, "utf8"));
			expect(second).toEqual(first);
			expect(first).toMatchObject({
				canonicalArchiveName: "vercel-output.tar.gz",
				canonicalArchiveRoot: "output",
				tar: { mode: "0644", owner: 0, group: 0 },
				gzip: { flags: ["-n", "-9"] },
			});
			expect(["gnu", "ustar-portable"]).toContain(first.tar.format);
		} finally {
			// 测试临时目录由系统清理，避免在仓库中留下生成物。
		}
	});

	it("rejects a changed archive or source digest", () => {
		const root = mkdtempSync(
			path.join(os.tmpdir(), "vercel-archive-negative-"),
		);
		const output = path.join(root, ".vercel", "output");
		const archive = path.join(root, "vercel-output.tar.gz");
		const metadata = path.join(root, "vercel-output-metadata.json");
		mkdirSync(output, { recursive: true });
		writeFileSync(path.join(output, "config.json"), '{"version":1}\n');
		runArchive(output, archive, metadata);
		writeFileSync(path.join(output, "config.json"), '{"version":2}\n');
		const result = (() => {
			try {
				execFileSync(
					process.execPath,
					["scripts/verify-vercel-archive.mjs", root, output],
					{
						cwd: process.cwd(),
						encoding: "utf8",
						stdio: ["ignore", "pipe", "pipe"],
					},
				);
				return "passed";
			} catch (error) {
				return String(error);
			}
		})();
		expect(result).toContain("sourceArtifactDigest mismatch");
	});
});
