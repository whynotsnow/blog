# Runtime Capabilities

This document records execution-environment capabilities. It is not a list of project bugs or a tool-routing policy. Read it before browser validation or whenever execution may need to leave the Codex sandbox, then follow the routing policy in [workflow.md](./workflow.md#failure-handling-policy-important).

Capabilities must be detected in the current session. Do not assume that a tool listed here is available, connected, or authorized.

## Execution Surfaces

| Surface | Capability | Known constraint |
| --- | --- | --- |
| Codex sandbox shell | Project commands and non-browser checks | Local Chromium may be blocked by the macOS Mach sandbox |
| Host Terminal through Computer Use | Host-session command execution when the capability is exposed | Availability differs by Codex session; Computer Use is command transport, not the validation result |
| Controlled Chrome | Host Chrome session access | Requires a connected Chrome control capability |
| CI or GitHub Actions | Runner-managed command and browser execution | Requires an existing workflow or authorization to add/run one |
| User-operated Terminal | Host-session command execution | Requires the user to run the command and provide or confirm the result |

## Browser Automation

Current known state:

- Playwright is installed as `@playwright/test`.
- The project command is `pnpm test:smoke`.
- Playwright starts the Astro dev server through `playwright.config.ts`; a separate `pnpm dev` process is not required.
- Chromium launch from the Codex macOS sandbox can fail with `MachPortRendezvousServer Permission denied (1100)` before navigation.
- That launch failure is an environment capability failure, not a failed page assertion.

Do not treat a system Chrome executable path as a complete fix by itself. If Playwright still launches the browser from the restricted Codex process, the same macOS permission boundary may remain.

## Capability Detection

Before choosing a route, check the current session for:

- a Computer Use capability that can operate the host Terminal;
- a connected Chrome control capability;
- an existing CI browser job;
- a user-provided external test result.

Tool availability can differ between Codex sessions. The failure memory predicts the sandbox limitation; it does not prove that every external fallback is available.

After detection, use the manual or automated lane in [workflow.md](./workflow.md#failure-handling-policy-important). Record which surface produced each result. A successful `pnpm check` in the sandbox and a blocked Playwright launch are separate outcomes.
