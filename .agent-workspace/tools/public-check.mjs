import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const staged = process.argv.includes("--staged");
const PUBLIC_FILES = new Set(["AGENTS.md"]);
const PUBLIC_PREFIXES = [
	"docs/agents/",
	".agent-workspace/",
	"spec/agent-workspace/",
];
const PRIVATE_PREFIXES = [
	".agent-workspace/local/",
	".agent-workspace/raw/",
	".agent-workspace/quarantine/",
];

const checks = [
	{
		name: "macOS user-home path",
		pattern: /\/Users\/(?!<user>)[^\s/]+\//g,
	},
	{
		name: "Linux user-home path",
		pattern: /\/home\/(?!<user>)[^\s/]+\//g,
	},
	{
		name: "Windows user-home path",
		pattern: /[A-Za-z]:\\Users\\(?!<user>)[^\s\\]+\\/g,
	},
	{
		name: "private key material",
		pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
	},
	{
		name: "URL-embedded credentials",
		pattern: /https?:\/\/[^\s/:@]+:[^\s/@]+@/g,
	},
	{
		name: "personal email address",
		pattern:
			/\b[A-Z0-9._%+-]+@(?!example\.(?:com|org|net)\b)[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
	},
];

if (process.argv.includes("--self-test")) {
	const samples = [
		[["", "Users", "example", "project"].join("/"), "macOS user-home path"],
		[["", "home", "example", "project"].join("/"), "Linux user-home path"],
		["C:\\Users\\example\\project", "Windows user-home path"],
		[
			["-----BEGIN", "PRIVATE", "KEY-----"].join(" "),
			"private key material",
		],
		[
			["https", "://", "user", ":", "password", "@", "example.com"].join(
				"",
			),
			"URL-embedded credentials",
		],
		[
			["maintainer", "@", "personal-domain", ".test"].join(""),
			"personal email address",
		],
	];

	for (const [value, expected] of samples) {
		const matched = checks.some((check) => {
			check.pattern.lastIndex = 0;
			return check.name === expected && check.pattern.test(value);
		});
		if (!matched) {
			console.error(
				`[agent-workspace-public] Self-test failed: ${expected}`,
			);
			process.exit(1);
		}
	}

	console.log(
		`[agent-workspace-public] Self-test passed (${samples.length} cases).`,
	);
	process.exit(0);
}

function git(args) {
	const result = spawnSync("git", args, { encoding: "utf8" });
	if (result.status !== 0) {
		process.stderr.write(result.stderr);
		process.exit(result.status ?? 1);
	}
	return result.stdout;
}

function splitNull(value) {
	return value.split("\0").filter(Boolean);
}

function isPublicAgentFile(file) {
	return (
		PUBLIC_FILES.has(file) ||
		PUBLIC_PREFIXES.some((prefix) => file.startsWith(prefix))
	);
}

function readContent(file) {
	if (staged) {
		return git(["show", `:${file}`]);
	}
	return readFileSync(file, "utf8");
}

const files = splitNull(
	staged
		? git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"])
		: git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"]),
).filter(isPublicAgentFile);

const readableFiles = staged ? files : files.filter((file) => existsSync(file));

const violations = [];

for (const file of readableFiles) {
	if (PRIVATE_PREFIXES.some((prefix) => file.startsWith(prefix))) {
		violations.push(
			`${file}: private Agent Workspace state must not be tracked`,
		);
		continue;
	}

	const content = readContent(file);
	for (const check of checks) {
		for (const match of content.matchAll(check.pattern)) {
			const line = content.slice(0, match.index).split("\n").length;
			violations.push(`${file}:${line}: ${check.name}`);
		}
	}
}

if (violations.length > 0) {
	console.error("[agent-workspace-public] Disclosure boundary violations:");
	for (const violation of violations) console.error(`  - ${violation}`);
	console.error(
		"Move private data under .agent-workspace/local, raw, or quarantine; use placeholders in public files.",
	);
	process.exit(1);
}

console.log(
	`[agent-workspace-public] Checked ${readableFiles.length} ${staged ? "staged " : ""}public Agent Workspace file(s).`,
);
