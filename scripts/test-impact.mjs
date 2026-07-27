import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const impactMap = JSON.parse(
	readFileSync(resolve(root, "tests/impact-map.json"), "utf8"),
);
const args = process.argv.slice(2);
const shouldRun = args.includes("--run");
const json = args.includes("--json");
const staged = args.includes("--staged");
const checkCoverage = args.includes("--check-coverage");
const modeEquals = args.find((argument) => argument.startsWith("--mode="));
const mode =
	modeEquals?.slice("--mode=".length) ?? (process.env.CI ? "ci" : "local");
const ciMode = mode === "ci";
const baseIndex = args.indexOf("--base");
const baseEquals = args.find((argument) => argument.startsWith("--base="));
const base =
	baseIndex >= 0 ? args[baseIndex + 1] : baseEquals?.slice("--base=".length);
const explicitFiles = args
	.filter((argument) => argument.startsWith("--file="))
	.map((argument) => argument.slice("--file=".length));
let unavailableBase;

if (!["local", "ci"].includes(mode)) {
	console.error(`[test-impact] Unsupported mode: ${mode}`);
	process.exit(1);
}

function gitLines(gitArgs) {
	return execFileSync("git", gitArgs, { cwd: root, encoding: "utf8" })
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}

function gitRefExists(ref) {
	const result = spawnSync(
		"git",
		["rev-parse", "--verify", "--quiet", `${ref}^{commit}`],
		{ cwd: root, stdio: "ignore" },
	);
	return result.status === 0;
}

function changedFiles() {
	if (explicitFiles.length) return explicitFiles;
	if (base) {
		if (!gitRefExists(base)) {
			unavailableBase = base;
			return [];
		}
		return gitLines([
			"diff",
			"--name-only",
			"--diff-filter=ACMR",
			`${base}...HEAD`,
		]);
	}
	if (staged) {
		return gitLines([
			"diff",
			"--cached",
			"--name-only",
			"--diff-filter=ACMR",
		]);
	}
	return [
		...gitLines(["diff", "HEAD", "--name-only", "--diff-filter=ACMR"]),
		...gitLines(["ls-files", "--others", "--exclude-standard"]),
	];
}

function globRegex(pattern) {
	const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	const withGlobstar = escaped.replaceAll("**", "::GLOBSTAR::");
	const withStars = withGlobstar.replaceAll("*", "[^/]*");
	return new RegExp(`^${withStars.replaceAll("::GLOBSTAR::", ".*")}$`);
}

function matches(file, pattern) {
	return globRegex(pattern).test(file);
}

function matchingRules(file) {
	return impactMap.rules.filter((rule) =>
		rule.patterns.some((pattern) => matches(file, pattern)),
	);
}

if (checkCoverage) {
	const coveragePatterns = impactMap.coverage ?? [];
	const coveredFiles = gitLines([
		"ls-files",
		"--cached",
		"--others",
		"--exclude-standard",
	]).filter((file) =>
		coveragePatterns.some((pattern) => matches(file, pattern)),
	);
	const uncoveredFiles = coveredFiles.filter(
		(file) => matchingRules(file).length === 0,
	);

	if (uncoveredFiles.length > 0) {
		console.error(
			`[test-impact] Unclassified covered paths:\n${uncoveredFiles.map((file) => `- ${file}`).join("\n")}`,
		);
		process.exit(1);
	}

	console.log(
		`[test-impact] Coverage PASS: ${coveredFiles.length} guarded path(s) are classified.`,
	);
	process.exit(0);
}

const files = [...new Set(changedFiles())].sort();
const selected = new Set();
const reasons = new Map();
const unmatched = [];
const riskEscalations = [];

function addGroup(group, reason) {
	if (group === "full" && !ciMode) {
		riskEscalations.push({
			reason: "full validation recommended outside local mode",
			files: [reason],
		});
		return;
	}
	selected.add(group);
	const groupReasons = reasons.get(group) ?? [];
	groupReasons.push(reason);
	reasons.set(group, groupReasons);
}

function addRisk(reason, files) {
	riskEscalations.push({ reason, files });
}

if (unavailableBase) {
	if (ciMode) {
		addGroup("full", `unavailable base ${unavailableBase}`);
	} else {
		addRisk(`unavailable base ${unavailableBase}`, []);
	}
}

for (const file of files) {
	const fileRules = matchingRules(file);
	if (!fileRules.length) {
		unmatched.push(file);
		addRisk("unclassified path", [file]);
		for (const group of ciMode
			? (impactMap.ciFallback ?? impactMap.fallback)
			: impactMap.fallback)
			addGroup(group, file);
		continue;
	}
	for (const rule of fileRules) {
		const groups = ciMode ? (rule.ciGroups ?? rule.groups) : rule.groups;
		if (!ciMode && rule.ciGroups?.includes("full")) {
			addRisk("ci full validation rule", [file]);
		}
		for (const group of groups) addGroup(group, file);
	}
}

if (ciMode && selected.has("full")) {
	selected.clear();
	selected.add("full");
}

const plan = {
	mode,
	files,
	groups: [...selected],
	unmatched,
	riskEscalations,
	commands: [...selected].map((group) => ({
		group,
		command: impactMap.groups[group],
		reasons: reasons.get(group) ?? unmatched,
	})),
};

if (json) {
	console.log(JSON.stringify(plan, null, 2));
} else if (!files.length) {
	console.log(
		"[test-impact] No changed files detected; no validation selected.",
	);
} else {
	console.log(`[test-impact] ${files.length} changed file(s)`);
	for (const item of plan.commands) {
		console.log(`- ${item.group}: ${item.command.join(" ")}`);
		console.log(`  because: ${item.reasons.join(", ")}`);
	}
	if (unmatched.length) {
		console.log(
			`[test-impact] Unclassified paths require CI/full review: ${unmatched.join(", ")}`,
		);
	}
	for (const escalation of riskEscalations) {
		const suffix = escalation.files.length
			? `: ${escalation.files.join(", ")}`
			: "";
		console.log(
			`[test-impact] Full validation risk (${escalation.reason})${suffix}`,
		);
	}
}

if (shouldRun) {
	for (const item of plan.commands) {
		const [command, ...commandArgs] = item.command;
		const result = spawnSync(command, commandArgs, {
			cwd: root,
			stdio: "inherit",
			env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
		});
		if (result.status !== 0) process.exit(result.status ?? 1);
	}
}
