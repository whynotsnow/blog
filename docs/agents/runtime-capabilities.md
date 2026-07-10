# Runtime Capabilities

This document records execution-environment capabilities and routing decisions. It is not a list of project bugs. Read it before browser validation or whenever a command may cross the Codex sandbox boundary.

Capabilities must be detected in the current session. Do not assume that a tool listed here is available, connected, or authorized.

## Execution Surfaces

| Surface | Intended use | Browser launch capability | Result status |
| --- | --- | --- | --- |
| Codex sandbox shell | Search, edit, typecheck, build, lint, and unit-level checks | Local Chromium may be blocked by the macOS Mach sandbox | Valid for non-browser checks only |
| Host Terminal through Computer Use | Run project commands outside the Codex command sandbox | Can run `pnpm test:smoke` in the host user session when Terminal control is available | Valid Playwright result if the command completes there |
| Controlled Chrome | Exploratory localhost UI, DOM, layout, network, and interaction validation | Uses the host Chrome session | Valid manual browser validation |
| CI or GitHub Actions | Repeatable browser regression checks | Runner-managed Chromium | Preferred durable automated validation |
| User-operated Terminal | Manual fallback when no host execution tool is available | Uses the host user session | Valid when the user reports or supplies the command output |

## Browser Automation

Current known state:

- Playwright is installed as `@playwright/test`.
- The project command is `pnpm test:smoke`.
- Playwright starts the Astro dev server through `playwright.config.ts`; a separate `pnpm dev` process is not required.
- Chromium launch from the Codex macOS sandbox can fail with `MachPortRendezvousServer Permission denied (1100)` before navigation.
- That launch failure is an environment capability failure, not a failed page assertion.

Do not treat a system Chrome executable path as a complete fix by itself. If Playwright still launches the browser from the restricted Codex process, the same macOS permission boundary may remain.

## Required Fallback Route

When the known Mach port error appears:

1. Stop retrying Chromium from the same Codex sandbox after the failure signature is confirmed.
2. Preserve the exact failure classification: browser launch unavailable; page assertions did not run.
3. If host Terminal control is available, run `source .codex/env-setup.sh` and then `pnpm test:smoke` in the host Terminal. This is execution routing, not UI inspection through Computer Use.
4. Otherwise, if controlled Chrome is available, use it for the required localhost UI validation. Do not describe a manual Chrome check as a Playwright test pass.
5. Otherwise, rely on CI for automated coverage or ask the user to run `pnpm test:smoke` in a normal host Terminal.
6. Report a UI validation gap only after the available host Terminal, controlled Chrome, and CI routes have been considered.

Record which surface produced each result. A successful `pnpm check` in the sandbox and a blocked Playwright launch are separate outcomes.

## Capability Detection

Before choosing a route, check the current session for:

- a Computer Use capability that can operate the host Terminal;
- a connected Chrome control capability;
- an existing CI browser job;
- a user-provided external test result.

Tool availability can differ between Codex sessions. The failure memory predicts the sandbox limitation; it does not prove that every external fallback is available.
