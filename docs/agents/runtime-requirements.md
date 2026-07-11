# Runtime Requirements

This document records the execution capabilities required by the project. It does not record the capabilities of a particular developer, machine, or session.

Resolve actual capability state from the active local profiles under `.agent-workspace/local/`, then follow the routing policy in [workflow.md](./workflow.md#failure-handling-policy-important).

## Required Execution Surfaces

| Requirement | Purpose | Acceptable surfaces |
| --- | --- | --- |
| Project command execution | Search, edit, typecheck, build, lint, and tests | Codex shell, host Terminal, or CI |
| Restricted agent visual review | One predefined visual question that Playwright cannot answer reliably | In-app Browser when the current session explicitly supports the target local URL |
| Developer-operated manual browser validation | Visual judgment, DOM inspection, layout, network, and exploratory interaction that Playwright cannot cover | Developer-controlled host Chrome |
| Automated browser validation | Deterministic smoke and regression tests | A Playwright-capable shell, host Terminal, or CI runner |
| External execution fallback | Run Chromium when the current command sandbox blocks browser launch | Host Terminal or CI |

## Project Browser Contract

- Playwright is installed as `@playwright/test`.
- The deterministic browser command is `pnpm test:smoke`.
- `playwright.config.ts` starts the Astro development server; a separate `pnpm dev` process is not required.
- Agents must not control Chrome. A budgeted in-app Browser visual result, a developer-reported manual Chrome result, and an agent- or developer-run Playwright result are distinct and must be reported separately.
- In-app Browser availability and local URL support are session capabilities, not guaranteed project capabilities. Do not retry or switch to Computer Use when local access is unavailable.
- A browser launch failure before navigation is not a page assertion failure.

Known reusable failure signatures and responses belong in [runtime-playbook.md](./runtime-playbook.md). Machine-specific detection results belong in the active machine or session profile.

## Capability Resolution

Resolve context in this order:

1. public project policy and requirements;
2. active developer preferences;
3. cached machine environment and capability state;
4. current session detection.

Later local layers may refine availability and preferences, but they cannot override public safety policy. Current session detection supersedes cached machine state. Do not assume a capability is available merely because it was available in a previous session.

Initialize and inspect the local profile with:

```bash
node .agent-workspace/tools/agent-workspace.mjs profile init
node .agent-workspace/tools/agent-workspace.mjs profile status
node .agent-workspace/tools/agent-workspace.mjs profile doctor
node .agent-workspace/tools/agent-workspace.mjs runtime detect
node .agent-workspace/tools/agent-workspace.mjs session start
```

After detection, use the developer-operated manual or automated lane in [workflow.md](./workflow.md#failure-handling-policy-important). Record which execution surface produced each result without copying private profile values into tracked documentation.
