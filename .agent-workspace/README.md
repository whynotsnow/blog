# Agent Workspace Local State

This directory contains the project manifest and ignored local implementation state for [Agent Workspace Spec](../spec/agent-workspace/SPEC.md).

## Private directories

- `local/`: stable machine- or user-specific context such as Git identity, local paths, capability overrides, and private repository metadata.
- `raw/`: unfiltered command output, traces, prompts, and runtime observations.
- `quarantine/`: candidate memory awaiting sanitization and disclosure review.

All three directories are ignored by Git. Agents must not force-add their contents.

These directories are private session inputs, not forbidden inputs. Agents may read and analyze them when the current task depends on developer, machine, session, or diagnostic context, but should not inspect them gratuitously. Private values must not be reproduced in tracked files or handoffs; only a minimum task-relevant, sanitized conclusion may be reported without exposing identities, paths, hostnames, opaque profile IDs, private URLs, credentials, or raw observations.

Use `spec/agent-workspace/examples/` as the public shape reference and `spec/agent-workspace/schemas/` as the machine-readable contract. Initialize local profiles with:

```bash
node .agent-workspace/tools/agent-workspace.mjs profile init
node .agent-workspace/tools/agent-workspace.mjs profile doctor
```

The initializer maps the active Git identity to a random developer ID through a locally salted fingerprint. It does not store the Git name or email in profile files. Each machine and session also receives an opaque random ID.

Developer profiles retain their local machine ID bindings, so switching Git identities in a shared clone can restore the matching machine profile instead of merging developers or recreating machine state.

Useful commands:

```bash
node .agent-workspace/tools/agent-workspace.mjs profile status
node .agent-workspace/tools/agent-workspace.mjs profile doctor
node .agent-workspace/tools/agent-workspace.mjs profile link-identity <developer-id>
node .agent-workspace/tools/agent-workspace.mjs runtime detect
node .agent-workspace/tools/agent-workspace.mjs session start
```

The manifest declares this single CLI entry so agents, hooks, CI, and maintainers do not need project-specific `package.json` scripts. This project-local entry is the primary execution surface whenever it exists and its declared runtime is available. A project may add an optional alias, but Agent Workspace Spec conformance does not depend on npm or pnpm.

`.agent-workspace/tools/` is the workspace-local implementation layer. An installed Agent Workspace Skill may discover, explain, migrate, or review this workspace, but it does not take execution priority over the manifest-declared local tools. Projects may replace this directory with their own Node, Python, Bash, Make, package-manager, or CI-oriented implementation as long as the manifest remains accurate.

If the declared local entry is missing or does not implement a requested command, report a workspace capability gap. Do not silently substitute Skill-bundled validation. Machine-specific Skill installation paths belong to local runtime state and must not be added to tracked files.

Reusable knowledge may be promoted to `docs/agents/` only after applying [the disclosure policy](../docs/agents/disclosure-policy.md) and running `node .agent-workspace/tools/agent-workspace.mjs validate`.
