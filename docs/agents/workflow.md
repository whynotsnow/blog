# AI Agent Workflow

This repository is now prepared for AI-assisted maintenance. The intent is not to add a chatbot to the site; it is to make future agent work safer, faster, and easier to review.

## Agent Entry Points

| File or command | Use |
| --- | --- |
| `AGENTS.md` | Operational rules for AI coding agents. |
| `.agent-workspace/manifest.json` | Agent Workspace Spec manifest, including local tooling entry. |
| `.agent-workspace/tools/` | Workspace-local implementation of validation, profile, runtime, and session commands. |
| `docs/README.md` | Documentation index. |
| `docs/agents/project-map.md` | English project map and data flow for agents. |
| `docs/agents/runtime-playbook.md` | Known runtime, CLI, framework, and Markdown pitfalls. |
| `docs/agents/runtime-requirements.md` | Public execution capability contract and local profile resolution order. |
| `docs/agents/disclosure-policy.md` | Disclosure classes and safe runtime-memory promotion rules. |
| `docs/agents/failure-index.md` | Clustered known failure patterns. |
| `docs/agents/memory.json` | Persistent structured memory for constraints and recurring failures. |
| `docs/agents/execution-log.md` | Reusable task-level learning log. |
| `docs/developers/content-guide.md` | Chinese content schema, authoring rules, and sync behavior. |
| `docs/developers/configuration.md` | Chinese configuration ownership and common edits. |

## Spec-Aware Mode

For non-trivial tasks, use the Agent Workspace Spec-aware workflow:

1. Check `memory.json` for known constraints and recurring failures that match the task.
2. Check `failure-index.md` and `runtime-playbook.md` before running commands in areas with known pitfalls.
3. Check `runtime-requirements.md` before browser validation and resolve actual availability from the active local profile and current session.
4. Check `disclosure-policy.md` before persisting observations; keep raw and local data outside tracked documentation.
5. Respect `src/services/core` and `getContentStore()` boundaries for architecture-sensitive changes.
6. Execute the smallest coherent change.
7. Record sanitized, reusable task learning in `execution-log.md` when the task discovers or reuses a pattern.
8. Update `memory.json` and `failure-index.md` if a new recurring failure class is discovered and passes disclosure review.

Agent Workspace Spec does not require reading every document. It requires checking the relevant memory and playbook before repeating known mistakes.

## Skill Operator Boundary

An Agent Workspace Skill should treat this repository as a workspace, not as the source of the Skill itself. The project-local implementation has execution priority; the Skill provides discovery, explanation, migration, and boundary-review workflows around it.

Resolve commands in this order:

1. Read `.agent-workspace/manifest.json`.
2. If the declared `tooling.entry` exists and its runtime is available, invoke that project-local entry directly for validation, public checks, profiles, runtime detection, and sessions.
3. Use an installed Agent Workspace Skill only when its operator capabilities are needed, such as discovering an unfamiliar workspace, explaining the contract, reviewing disclosure boundaries, or guiding adoption and migration.
4. Treat `.agent-workspace/tools/` as replaceable project implementation, not as a global Skill contract.
5. If the declared entry is missing or a local subcommand is unsupported, report a workspace capability gap. Do not fall back to Skill-bundled tooling or another validator unless the user explicitly asks to repair or adopt tooling.

The current project uses `node .agent-workspace/tools/agent-workspace.mjs` as its manifest-declared local implementation. Other Agent Workspace Spec projects may use a different runtime if their manifest declares it. Never persist a machine-specific Skill installation path in public project documentation.

## Recommended Agent Loop

1. Read only the relevant docs for the task. Use `docs/README.md` as the routing index when needed.
2. Inspect local context with ordinary commands such as `git status --short`, `rg --files`, and targeted file reads.
3. Inspect the exact files involved in the change.
4. Make the smallest coherent edit.
5. Run the narrowest meaningful validation command.
6. Report changed files, validation results, and any skipped checks.

## Tool Role Boundaries

Keep exploration, verification, knowledge retrieval, and environment execution strictly separated. Tool selection must follow the routing rules below.

---

### 1. Browser (in-app)

- Use primarily for documentation, API reference, and error explanation.
- For application validation, it is a restricted visual-review tool after Playwright, not a general runtime debugger or automated test runner.
- It may inspect a local application only when the current Browser capability explicitly supports the target local URL. If local access is unavailable, stop after one failed access attempt and follow the developer-operated manual lane.
- It must not be used for broad DOM exploration, network debugging, authenticated flows, multi-page regression, or interaction testing that Playwright can express.

---

### 2. Chrome (developer-operated only)

- Agents must not open, control, inspect, debug, or validate the application with Chrome.
- This restriction applies even when controlled Chrome is technically available.
- Manual Chrome work belongs to the developer. The agent may only provide a targeted procedure and interpret sanitized results returned by the developer.
- Do not use Computer Use, Browser, or another interactive UI tool to imitate or control Chrome. The separately budgeted in-app Browser visual-review lane is not a Chrome substitute.

---

### 3. Playwright (default browser validation)

- Playwright is the default browser tool agents may operate for frontend validation.
- Reuse existing Playwright coverage before adding a new check.
- Use narrowly scoped assertions for route rendering, element visibility, responsive behavior, deterministic interaction, DOM state, accessibility, console errors, failed requests, and predefined screenshot questions.
- Do not add broad regression coverage for a one-off low-risk change unless the test provides lasting value.

---

### 4. Computer Use

- Use ONLY for system-level execution tasks:
  - starting dev servers
  - running tests
  - file system operations
- Must NOT be used for UI validation or browser interaction.

---

## Tool Routing Rules (CRITICAL)

Choose the tool by task shape, not convenience.

### UI Validation Tasks (highest priority rule)

If a task involves:
- layout correctness
- visual rendering
- interaction behavior
- CSS / DOM / frontend runtime state
- localhost application verification

Then:

1. Inspect the affected source and run applicable static checks first.
2. Skip browser validation for a low-risk presentation-only change when the handoff explains the decision and reports the static checks.
3. Otherwise, reuse existing Playwright coverage or run a narrowly scoped Playwright check.
4. If Playwright cannot reliably answer a predefined visual question, use the restricted in-app Browser visual-review lane when supported.
5. NEVER use agent-controlled Chrome for these tasks.
6. If neither Playwright nor the restricted Browser review can answer the question, stop agent browser work and provide a targeted developer-operated Chrome procedure.
7. NEVER report browser-dependent validation as complete based on code review alone.

---

### Knowledge / Documentation Tasks

If a task involves:
- API lookup
- framework documentation
- error explanation
- conceptual clarification

Then:
→ Use Browser (in-app)

---

### System Execution Tasks

If a task involves:
- running dev server
- executing build/test scripts
- file operations

Then:
→ Use terminal/shell or Computer Use for environment execution only. Do not use either as a substitute for browser-based UI validation.

---

## Failure Handling Policy (IMPORTANT)

If a selected tool fails due to sandbox, origin policy, or access restriction:

1. The task must NOT be marked as complete.
2. The agent must NOT replace UI validation with code review.
3. Resolve required surfaces from `runtime-requirements.md` and detect actual availability in the current session; do not assume that host Terminal or CI is available.
4. Re-route within the matching validation lane below.
5. Deterministic agent-operated UI validation requires a successful Playwright check. A budgeted in-app Browser result may support only the predefined visual question it inspected. A developer-operated Chrome result is valid manual evidence only after the developer reports it.

### Restricted In-App Browser Visual-Review Lane

Use this lane only when Playwright cannot reliably answer a concrete visual question. A Playwright launch failure alone does not qualify.

Before invoking Browser, state the exact route, one representative viewport, the visual question, and the expected result. The default hard budget is:

- one route;
- one viewport;
- one navigation;
- one screenshot or page-state inspection;
- no exploratory browsing, broad DOM inspection, or repeated unchanged refreshes.

A second inspection is allowed only after a code change directly addresses evidence from the first inspection. Additional routes, viewports, or iterations require explicit user authorization. If the Browser cannot access the local URL, do not retry through alternate interactive tools; follow the developer-operated manual lane.

### Developer-Operated Manual Lane

1. First decide whether a deterministic Playwright check can adequately answer the question.
2. If it can, use the automated lane instead.
3. If it cannot, decide whether the restricted Browser lane can answer the single visual question within its budget.
4. If neither can because the task requires human visual judgment, exploratory DevTools inspection, an authenticated host session, or host-browser state, stop agent browser work.
5. Give the developer the manual Chrome guide defined below and keep validation incomplete until the developer returns the requested result.

### Automated and Regression Lane

1. Use Playwright in the current command environment.
2. If Chromium hits the known macOS Mach permission failure, stop retrying from that restricted process.
3. Run the same Playwright command in host Terminal when that execution surface is available.
4. Otherwise route the automated test to CI, or ask the user to run it in a normal host Terminal.
5. If none is available, give the developer the exact Playwright command to run and request the minimal result needed.

If no valid route in the required lane is available, explicitly report inability to complete UI validation.

### Manual Chrome Guide (REQUIRED FORMAT)

When developer-operated Chrome is required, provide all applicable fields below. Keep the request limited to one concrete question by default.

- **Reason:** Explain precisely why Playwright cannot answer the question.
- **Setup:** Give the command, exact route, required state, and one representative viewport.
- **Steps:** Provide numbered interactions and name the relevant DevTools panel (`Elements`, `Console`, `Network`, or `Performance`).
- **Expected result:** Describe the observable success condition; never say only “check whether it looks correct.”
- **Return evidence:** Request only the affected-area screenshot, sanitized console error, failed request URL/status, computed style, or yes/no result needed to continue.
- **Safety:** Tell the developer not to return cookies, authorization headers, tokens, credentials, or unrelated page content.

Do not request multiple routes, viewports, or broad DevTools exploration unless existing evidence shows that the problem spans them.

---

## Critical Mapping

- Chrome = developer-operated manual evidence only
- Playwright = default deterministic agent-operated browser validation
- Browser = knowledge retrieval plus budgeted visual review after Playwright
- Computer Use = environment execution (system layer)

## On-Demand Documentation Routing

| Task area | Read |
| --- | --- |
| Architecture, content flow, routes, or services | `docs/agents/project-map.md`, `docs/developers/architecture.md` |
| Known command/tooling failure or repeated debugging pattern | `docs/agents/memory.json`, `docs/agents/failure-index.md`, `docs/agents/runtime-playbook.md` |
| Content schema, posts, tags, categories, drafts, or assets | `docs/developers/content-guide.md` |
| Site config, env vars, feature pages, or URL behavior | `docs/developers/configuration.md` |
| Local setup, commands, checks, or developer workflow | `docs/developers/development.md` |
| Content separation, content repository, migration, deployment, or build trigger behavior | Matching document in `docs/developers/` |
| Maintenance risks, generated files, dependency updates | `docs/developers/maintenance.md` |

Do not read unrelated documents just to appear thorough. If multiple areas are affected, read each relevant document before editing.

## Common Task Routing

| Task | Start with |
| --- | --- |
| Add or change a post field | `src/content.config.ts`, `src/services/core/types.ts`, `docs/developers/content-guide.md` |
| Change homepage post selection | `src/pages/index.astro`, `src/services/home.ts`, `src/services/core/sort.ts` |
| Change categories or tags | `src/services/core/content-store.ts`, `src/services/category-page.ts`, `src/utils/url-utils.ts`, category route files |
| Change post detail rendering | `src/services/post-detail/index.ts`, `src/components/PostPage.astro`, `src/pages/posts/[...slug].astro` |
| Change widgets | `src/components/widget`, `src/services/widget/registry.ts` |
| Change navigation or feature pages | `src/config.ts`, `src/constants/link-presets.ts`, related page file |
| Change deployment behavior | `vercel.json`, `scripts/*`, `docs/developers/deployment.md` |

## Guardrails

- Treat `src/config.ts` as owner-specific configuration, not generic upstream defaults.
- Do not edit `dist`, `node_modules`, generated Pagefind output, or compressed font output directly.
- Do not add new dependencies unless the existing Astro/Svelte/Node toolchain cannot reasonably solve the task.
- Do not bypass `src/services/core` for post list data in normal pages.
- Do not bypass `getContentStore()` for normal post collection data.
- Do not hardcode private IDs, API keys, tokens, or cookies.

## Validation Matrix

| Change type | Suggested validation |
| --- | --- |
| Docs only | Read affected links and headings; run `pnpm lint:md` for Markdown structure changes. |
| Type or schema | `pnpm check`, `pnpm type-check` |
| Content pipeline | `pnpm check`, then `pnpm build` when feasible |
| Styles or UI components | `pnpm dev` visual check, plus `pnpm check` and `pnpm lint` |
| Build scripts | Run the touched script with a safe input or dry-run equivalent when available |

## Handoff Format

When an agent finishes a task, it should include:

- Files changed.
- Commands run and whether they passed.
- Any known skipped validation.
- Follow-up risks only when they affect the requested outcome.

Never state that a command passed unless it was actually run in this workspace.
