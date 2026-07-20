import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fontmin from "fontmin";
import {
	FONT_BUILD_DIR,
	FONT_BUILD_VERSION,
	FONT_PACKAGES,
} from "./config.mjs";
import { collectCharset } from "./text-collector.mjs";

const ROOT_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);

function hash(value) {
	return crypto.createHash("sha256").update(value).digest("hex");
}

function readManifest(manifestPath) {
	if (!fs.existsSync(manifestPath)) return null;
	try {
		return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	} catch {
		return null;
	}
}

function validateWoff2(filePath) {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Generated font is missing: ${filePath}`);
	}
	const buffer = fs.readFileSync(filePath);
	if (
		buffer.length < 4 ||
		buffer.subarray(0, 4).toString("ascii") !== "wOF2"
	) {
		throw new Error(
			`Generated font is not a valid WOFF2 file: ${filePath}`,
		);
	}
	return buffer;
}

function createSignature(fontPackage, sourceBuffer, charset) {
	return hash(
		JSON.stringify({
			buildVersion: FONT_BUILD_VERSION,
			fontPackage,
			sourceHash: hash(sourceBuffer),
			charset,
		}),
	);
}

async function compileFont({ sourcePath, outputPath, charset, temporaryDir }) {
	await new Promise((resolve, reject) => {
		new Fontmin()
			.src(sourcePath)
			.use(Fontmin.glyph({ text: charset, hinting: false }))
			.use(Fontmin.ttf2woff2({ clone: false, deflate: true }))
			.dest(temporaryDir)
			.run((error) => (error ? reject(error) : resolve()));
	});

	const generatedPath = fs
		.readdirSync(temporaryDir)
		.map((file) => path.join(temporaryDir, file))
		.find((file) => path.extname(file).toLowerCase() === ".woff2");

	if (!generatedPath) {
		throw new Error(`Fontmin did not generate WOFF2 for ${sourcePath}`);
	}

	validateWoff2(generatedPath);
	fs.renameSync(generatedPath, outputPath);
}

export async function prepareFonts({
	rootDir = ROOT_DIR,
	environment = process.env,
	check = false,
} = {}) {
	const buildDir = path.resolve(rootDir, FONT_BUILD_DIR);
	const manifestPath = path.join(buildDir, "manifest.json");
	const previousManifest = readManifest(manifestPath);
	const nextManifest = { version: FONT_BUILD_VERSION, packages: {} };

	if (!check) fs.mkdirSync(buildDir, { recursive: true });

	for (const fontPackage of FONT_PACKAGES) {
		const sourcePath = path.resolve(rootDir, fontPackage.source);
		const outputPath = path.join(buildDir, fontPackage.output);
		if (!fs.existsSync(sourcePath)) {
			throw new Error(`Font source does not exist: ${sourcePath}`);
		}

		const sourceBuffer = fs.readFileSync(sourcePath);
		const charset = collectCharset(fontPackage, { rootDir, environment });
		const signature = createSignature(fontPackage, sourceBuffer, charset);
		const previousPackage = previousManifest?.packages?.[fontPackage.id];

		if (check) {
			const outputBuffer = validateWoff2(outputPath);
			if (
				previousPackage?.signature !== signature ||
				previousPackage?.outputHash !== hash(outputBuffer)
			) {
				throw new Error(
					`Font package is stale; run pnpm font:prepare: ${fontPackage.id}`,
				);
			}
			console.log(
				`✓ ${fontPackage.id}: ${charset.length} characters, build is current`,
			);
			continue;
		}

		let outputBuffer;
		if (
			previousPackage?.signature === signature &&
			fs.existsSync(outputPath)
		) {
			outputBuffer = validateWoff2(outputPath);
			if (previousPackage.outputHash !== hash(outputBuffer))
				outputBuffer = null;
		}

		if (!outputBuffer) {
			const temporaryDir = path.join(
				buildDir,
				`.tmp-${fontPackage.id}-${process.pid}`,
			);
			fs.rmSync(temporaryDir, { recursive: true, force: true });
			fs.mkdirSync(temporaryDir, { recursive: true });
			try {
				await compileFont({
					sourcePath,
					outputPath,
					charset,
					temporaryDir,
				});
			} finally {
				fs.rmSync(temporaryDir, { recursive: true, force: true });
			}
			outputBuffer = validateWoff2(outputPath);
		}

		nextManifest.packages[fontPackage.id] = {
			signature,
			output: fontPackage.output,
			outputHash: hash(outputBuffer),
			characters: charset.length,
			bytes: outputBuffer.length,
		};

		console.log(
			`✓ ${fontPackage.id}: ${charset.length} characters, ${(outputBuffer.length / 1024).toFixed(1)} KiB`,
		);
	}

	if (!check) {
		fs.writeFileSync(
			manifestPath,
			`${JSON.stringify(nextManifest, null, 2)}\n`,
		);
	}

	return check ? previousManifest : nextManifest;
}
