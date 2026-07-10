# Execution Log

This log records completed AI-assisted work only when it teaches the project something reusable.

Keep entries short. Link to `memory.json`, `failure-index.md`, or `runtime-playbook.md` when a task discovers or reuses a pattern.

## 2026-07-04

### Added Agent OS documentation layer

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
