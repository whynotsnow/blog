# Agent Workspace Specification

Version: `0.1.0`

Status: Draft

## 1. Scope

Agent Workspace Spec defines a repository format for project instructions, reusable agent knowledge, private runtime state, memory promotion, and conformance validation. It does not define an agent runtime, model API, or network protocol.

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, and MAY are normative requirements.

## 2. Manifest

A conformant workspace MUST provide `.agent-workspace/manifest.json` containing:

- `spec` with the value `agent-workspace`;
- `spec_version` supported by the implementation;
- one or more declared conformance levels;
- paths to public instructions, public knowledge, and local state;
- a tooling descriptor when the workspace provides local commands.

Implementations MUST reject unsupported major specification versions.

## 3. Conformance levels

### 3.1 Core

A Core-conformant workspace MUST:

- provide a public instruction entry point such as `AGENTS.md`;
- keep project rules and reusable knowledge in version-controlled files;
- define the loading order for instructions, project knowledge, and local state;
- provide a conformance validation command.

### 3.2 Disclosure

A Disclosure-conformant workspace MUST:

- separate public knowledge from local, raw, and quarantine state;
- ignore `.agent-workspace/local/`, `.agent-workspace/raw/`, and `.agent-workspace/quarantine/` in Git;
- prevent known private paths from being staged;
- prohibit secrets from all Agent Workspace files;
- review and sanitize runtime observations before public promotion.

### 3.3 Runtime

A Runtime-conformant workspace MUST:

- distinguish public runtime requirements from detected runtime state;
- store detected machine and session state under the ignored local state path;
- treat current session detection as more authoritative than cached machine state;
- avoid representing a previous session capability as a permanent fact.

### 3.4 Team

A Team-conformant workspace MUST:

- separate developer, machine, and session profiles;
- use opaque identifiers instead of public Git names, emails, hostnames, or serial numbers;
- use Git identity only as a local matching signal;
- require explicit local action before linking multiple Git identities;
- isolate automation identities from human developer profiles.

## 4. Context resolution

Agents MUST resolve context in this order:

1. public project policy and instructions;
2. public project knowledge and runtime requirements;
3. active local developer preferences;
4. cached local machine state;
5. current session state and direct capability detection.

Local layers MAY refine availability and preferences. They MUST NOT weaken public safety or disclosure rules.

Agents MAY read and analyze local layers when their developer, machine, session, or diagnostic context is relevant to the current task. Implementations SHOULD NOT inspect local state without a task-relevant reason. Privacy is an output and persistence boundary, not an access prohibition.

Agents MUST NOT reproduce private local values in tracked files or handoffs. They MAY report a minimum task-relevant, sanitized conclusion derived from local state when the conclusion does not expose identities, paths, hostnames, opaque profile identifiers, private URLs, credentials, or raw observations.

## 5. Identity and profile model

The reference profile format uses a locally generated salt and HMAC fingerprint to map a Git identity to an opaque developer ID. Clear-text Git names and emails MUST NOT appear in public workspace files. Implementations SHOULD avoid storing clear-text identity in local profiles when a salted fingerprint is sufficient.

Developer profiles MAY link to more than one machine profile. Session profiles MUST reference exactly one developer and one machine.

Normative profile shapes are defined in `schemas/`. Non-normative placeholder instances are provided in `examples/`.

## 6. Memory lifecycle

Runtime observations SHOULD begin in ignored raw storage. Reusable candidates MUST pass through quarantine and disclosure review before entering public knowledge.

Recurrence establishes potential usefulness, not disclosure safety. Implementations MUST NOT automatically publish an observation solely because it occurred more than once.

## 7. Validation

A conformant validator MUST check:

- manifest version and declared levels;
- required public files and schema documents;
- private directory tracking violations;
- known personal paths and credential material in public workspace files;
- structural consistency of local profiles when local validation is requested.

The reference command is:

```bash
node .agent-workspace/tools/agent-workspace.mjs validate
```

## 8. Tooling integration

A workspace MAY vendor reference tooling under `.agent-workspace/tools/` and declare one stable entry point in the manifest. The tools directory is the workspace implementation layer: projects MAY replace, extend, or remove the reference tools as long as the manifest-declared contract remains accurate.

Skills, hooks, CI, and human maintainers SHOULD call the manifest-declared entry instead of assuming a package manager, command name, or implementation language. A Skill is an operator for discovering and applying the workspace contract; `.agent-workspace/tools/` is the local implementation selected by the workspace.

The `tooling` object MUST use repository-relative paths. It MUST NOT contain absolute local paths, user-home paths, hostnames, developer names, emails, tokens, or machine-specific command fragments. The `runtime` value is descriptive and may be `node`, `python`, `bash`, `make`, `pnpm`, `external`, or another workspace-defined value.

Package-manager aliases MAY be added by a project as a convenience. They MUST NOT be required for conformance. This repository's vendored command shape is:

```bash
node .agent-workspace/tools/agent-workspace.mjs <command> [arguments]
```

An implementation SHOULD discover the workspace by searching parent directories for `.agent-workspace/manifest.json`, so agents can invoke it from nested project directories.

When a workspace has no local tooling entry, an Agent Workspace Skill MAY use bundled reference scripts to initialize or validate the workspace. Once a local tooling entry exists, the Skill SHOULD prefer the manifest-declared implementation and report unsupported commands as workspace capability gaps rather than silently substituting a different implementation.

## 9. Versioning

Specification versions use semantic versioning:

- patch versions clarify requirements without breaking conformant workspaces;
- minor versions add backward-compatible fields or conformance features;
- major versions may change required structure or semantics.

Individual JSON formats also carry `schema_version`. `spec_version` and `schema_version` MUST NOT be treated as interchangeable.
