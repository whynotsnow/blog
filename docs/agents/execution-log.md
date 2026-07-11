# Execution Log

This log records completed AI-assisted work only when it teaches the project something reusable.

Keep entries short. Link to `memory.json`, `failure-index.md`, or `runtime-playbook.md` when a task discovers or reuses a pattern.

## 2026-07-04

### Added Agent Workspace Spec documentation layer

- Added persistent agent memory, runtime playbook, failure index, and this execution log.
- Updated workflow rules so future agents check memory and known pitfalls before non-trivial work.
- Reused known package-manager failure pattern: pnpm 11 can ignore the project `pnpm` field and fail before scripts run.
- Risk: memory can become stale if agents do not update it after new recurring failures.

## 2026-07-06

### Fixed Playwright config Node globals typing

- Added `@types/node` as a direct dev dependency so `playwright.config.ts` can type `process.env` under pnpm's isolated dependency layout.
- Recorded `pnpm-store-location-mismatch` after dependency install hit `ERR_PNPM_UNEXPECTED_STORE` when `.codex/env-setup.sh` selected a different store than the existing `node_modules`.

## 2026-07-10

### Fixed fullscreen banner viewport sizing

- Recorded `fullscreen-banner-responsive-override`: fullscreen banner rules must be final overrides because later responsive height media queries can reset `#banner-wrapper` below `100vh`.
- Recorded `playwright-chromium-mac-sandbox`: local Chromium launch can fail with `MachPortRendezvousServer Permission denied (1100)` before localhost validation starts.

### Added sandbox-to-host browser validation routing

- Added a runtime capability matrix that separates the Codex command sandbox, host Terminal, controlled Chrome, CI, and user-operated fallbacks.
- Changed the known Playwright Mach port response from immediate validation-gap reporting to capability-aware re-routing.
- Kept Computer Use as command transport only; successful Chrome or Playwright execution remains the source of browser validation truth.

### Consolidated browser validation policy

- Made `workflow.md` the single source of truth for tool routing and split failure handling into manual and automated lanes.
- Limited `runtime-capabilities.md` to environment facts and per-session capability detection.
- Removed the circular Chrome-to-Playwright-to-Chrome fallback and linked failure records to the canonical policy.

### Added the public/private Agent Workspace Spec boundary

- Made `docs/agents/` the sanitized, version-controlled public knowledge layer.
- Added ignored local, raw, and quarantine storage for identity, machine state, unfiltered output, and unreviewed memory.
- Added a disclosure policy and a pre-commit check for private directories, user-home paths, private keys, and credential-bearing URLs.

### Added team-aware local profiles

- Added locally salted Git identity matching with opaque developer, machine, and session IDs.
- Separated public runtime requirements from private machine and session capability state.
- Added schemas, public examples, and profile commands for initialization, identity linking, runtime refresh, and session creation.

### Adopted Agent Workspace Spec 0.1.0

- Replaced the Agent OS working name with Agent Workspace Spec and separated the normative spec from its local implementation state.
- Added a versioned manifest, normative requirements, conformance levels, schemas, examples, and a reference validator.
- Migrated ignored local profiles to `.agent-workspace/local/` without exposing identity or runtime state.

### Prepared the tooling boundary for Skill extraction

- Consolidated profile, disclosure, and conformance commands behind one manifest-declared CLI entry.
- Moved reference tooling under `.agent-workspace/tools/` and removed required package-manager aliases.
- Added upward workspace discovery so a future Skill can invoke the CLI from nested project directories.

### Formalized the Skill operator boundary

- Defined `.agent-workspace/tools/` as the workspace-local implementation layer rather than the future Skill implementation.
- Required Skills, hooks, CI, and maintainers to prefer the manifest-declared tooling entry.
- Added manifest schema coverage and repository-relative tooling path validation.

### Extracted the Agent Workspace Skill

- Created a reusable Agent Workspace Skill as an external operator for Agent Workspace Spec repositories.
- Kept this repository's `.agent-workspace/tools/` as the project-local implementation rather than moving project-specific validation into the Skill.
- Forward-tested the Skill against both this repository and a minimal temporary workspace.

## 2026-07-11

### Restricted Chrome to developer-operated validation

- Prohibited agents from using controlled Chrome for debugging, inspection, or validation.
- Established Playwright as the primary agent-operated browser validation tool, with static checks and existing tests preferred first.
- Added a required manual Chrome guide for browser questions that Playwright cannot answer and removed controlled Chrome from sandbox fallback guidance.

### Added budgeted in-app Browser visual review

- Allowed the in-app Browser only after Playwright cannot reliably answer one predefined visual question.
- Limited the default review to one route, one viewport, one navigation, and one screenshot or page-state inspection.
- Kept Playwright launch failures on the Playwright execution lane and retained developer-operated Chrome as the final manual fallback.
