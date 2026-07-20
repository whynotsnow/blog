import { prepareFonts } from "./compiler.mjs";

const check = process.argv.includes("--check");

try {
	await prepareFonts({ check });
	console.log(
		check ? "✓ Font build check passed" : "✓ Font preparation complete",
	);
} catch (error) {
	console.error(`❌ Font preparation failed: ${error.message}`);
	process.exitCode = 1;
}
