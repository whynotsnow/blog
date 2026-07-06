# AI Agent Workflow

This repository is now prepared for AI-assisted maintenance. The intent is not to add a chatbot to the site; it is to make future agent work safer, faster, and easier to review.

## Agent Entry Points

| File or command | Use |
| --- | --- |
| `AGENTS.md` | Operational rules for AI coding agents. |
| `docs/README.md` | Documentation index. |
| `docs/agents/project-map.md` | English project map and data flow for agents. |
| `docs/agents/runtime-playbook.md` | Known runtime, CLI, framework, and Markdown pitfalls. |
| `docs/agents/failure-index.md` | Clustered known failure patterns. |
| `docs/agents/memory.json` | Persistent structured memory for constraints and recurring failures. |
| `docs/agents/execution-log.md` | Reusable task-level learning log. |
| `docs/developers/content-guide.md` | Chinese content schema, authoring rules, and sync behavior. |
| `docs/developers/configuration.md` | Chinese configuration ownership and common edits. |

## Agent OS Mode

For non-trivial tasks, run in Agent OS mode:

1. Check `memory.json` for known constraints and recurring failures that match the task.
2. Check `failure-index.md` and `runtime-playbook.md` before running commands in areas with known pitfalls.
3. Respect `src/services/core` and `getContentStore()` boundaries for architecture-sensitive changes.
4. Execute the smallest coherent change.
5. Record reusable task learning in `execution-log.md` when the task discovers or reuses a pattern.
6. Update `memory.json` and `failure-index.md` if a new recurring failure class is discovered.

Agent OS does not require reading every document. It requires checking the relevant memory and playbook before repeating known mistakes.

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

- Use ONLY for documentation, API reference, and error explanation.
- It is a knowledge retrieval tool, not a runtime tool.
- Must NOT be used for UI rendering validation, DOM inspection, or interaction testing.
- Must NOT access localhost or development servers for UI verification.

---

### 2. Chrome (manual UI debugging)

- Use for real-time frontend debugging in a real browser environment.
- Supports DOM inspection, layout debugging, network analysis, and human-like interaction.
- Default choice for exploratory/manual localhost UI validation.
- Preferred when the task requires visual judgment, DOM inspection, layout debugging, network inspection, or human-like interaction.

---

### 3. Playwright (automated testing)

- Use for reproducible UI testing, regression testing, and CI-style validation.
- Used for deterministic verification of UI behavior.
- Must NOT be used for exploratory debugging or ad-hoc inspection.
- Prefer it when validation must be repeatable, script-based, or suitable for future regression coverage.

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

1. Use Chrome for exploratory/manual debugging and visual inspection.
2. Use Playwright for scripted, repeatable, or CI-oriented verification.
3. NEVER use Browser (in-app) for these tasks
4. NEVER fall back to code review as a substitute for UI validation

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
3. The agent must re-route the task using the following fallback chain:

   - Browser used for localhost/UI validation → discard that result and switch to Chrome
   - Chrome unavailable → switch to Playwright
   - Playwright unavailable → explicitly report inability to validate UI

4. UI validation is ONLY valid if executed successfully in Chrome or Playwright.

---

## Critical Mapping

- Chrome = exploration / debugging (human-in-the-loop)
- Playwright = verification / testing (machine-in-the-loop)
- Browser = knowledge retrieval (read-only cognition layer)
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
