# Agent Guide

This repository is an Astro + Svelte personal blog forked from Mizuki and customized for `whynotsnow`.

Use this file as the first stop before changing code. The goal is to keep AI-agent work predictable, easy to review, and aligned with the current architecture.

## Why Agent Workspace Spec Exists

This project is not just a static blog system. It is a content engineering system with layered service architecture, build-time transformation pipeline, multiple routing strategies, and framework-specific constraints across Astro, Svelte, and TypeScript.

Without structured agent memory:

- the same tooling bugs reappear;
- architectural decisions get reinterpreted incorrectly;
- fixes are repeated instead of reused;
- debugging cost increases over time.

Agent Workspace Spec introduces persistent failure memory, structured execution logs, reusable debugging patterns, and enforced reflection after meaningful tasks.

Key principle:

> This project is not debugged repeatedly. It is learned once and reused forever.

All AI-assisted development in this project should be memory-driven, pattern-aware, architecture-constrained, and failure-learned.

## Project Shape

- Framework: Astro 5 with Svelte components.
- Package manager: pnpm only.
- Content source: `src/content/posts` and `src/content/spec`, optionally prepared from a pinned external commit by `scripts/prepare-content.mjs`.
- Core content pipeline: `src/services/core`.
- UI-facing service layer: `src/services`.
- Site configuration: `src/config.ts` and `src/types/config.ts`.
- Static assets: `public`.
- Documentation: `docs`.

## Start Here

1. Read this file first.
2. Treat `.agent-workspace/manifest.json` and `spec/agent-workspace/SPEC.md` as the conformance entry points. When the manifest declares an existing local tooling entry, invoke that project-local implementation directly and prefer it over any globally installed Agent Workspace Skill tooling. Initialize or inspect the opaque local profile with `node .agent-workspace/tools/agent-workspace.mjs profile init` and `node .agent-workspace/tools/agent-workspace.mjs profile status` only when developer, machine, or session context matters. Treat `.agent-workspace/local/` as private session input: agents may read and analyze it when it is relevant to the current task, but must not inspect it gratuitously. Never reproduce, enumerate, quote, or copy its private values into tracked files or handoffs. A handoff may report only the minimum task-relevant, sanitized conclusion derived from local state, such as whether a required capability is available, without exposing identities, paths, hostnames, opaque profile IDs, private URLs, credentials, or raw observations.
3. Read documentation on demand. Do not load every document by default.
4. Use `docs/README.md` as the routing index when you need to choose the right document.
5. Read `docs/agents/workflow.md` before non-trivial agent work.
6. Read `docs/agents/project-map.md` before changing architecture, data flow, routing, or services.
7. Read `docs/agents/memory.json`, `docs/agents/failure-index.md`, and `docs/agents/runtime-playbook.md` before running commands or changing areas with known failures.
8. Read `docs/agents/testing-strategy.md` before changing tests, validation tooling, CI gates, or code whose verification scope is not obvious.
9. Read `docs/agents/runtime-requirements.md` before browser validation or when execution may need to leave the Codex sandbox.
10. Read `docs/agents/disclosure-policy.md` before persisting runtime observations or adding Agent Workspace Spec files.
11. Use ordinary repository inspection commands such as `git status --short`, `rg --files`, and `sed -n` when you need local context.

## Commands

- `pnpm dev`: start the Astro dev server.
- `pnpm check`: run Astro checks.
- `pnpm type-check`: run TypeScript declaration-oriented checks.
- `pnpm build`: production build, Pagefind indexing, and font compression.
- `pnpm build:astro`: prepare Content and font subsets, then run only the Astro production build stage without Pagefind.
- `pnpm format:check`: check formatting.
- `pnpm format`: format the repository according to the local Prettier config.
- `pnpm precommit`: run the same pre-commit gate as the Git hook.
- `pnpm test:plan`: print the validation selected for current changes without executing it.
- `pnpm test:affected`: execute the validation selected by `tests/impact-map.json`.
- `pnpm test:impact:check`: ensure guarded Feature and E2E paths are classified by the impact map.
- `pnpm test:fast`: run Unit and Integration tests.
- `pnpm test:smoke`: run the critical-route Playwright smoke suite.
- `pnpm test:e2e:full`: run the complete Playwright regression suite.
- `pnpm verify:full`: run all static, fast, browser, and production-build gates.
- `node .agent-workspace/tools/agent-workspace.mjs validate`: validate Agent Workspace Spec conformance and disclosure boundaries.
- `pnpm new-post -- <filename>`: create a post template.

Do not claim that a command passed unless you actually ran it in this workspace and observed the result. If a command was not run, say so explicitly.

## Agent Workspace Tool Resolution

Use `.agent-workspace/manifest.json` as the command contract and resolve Agent Workspace operations in this order:

1. If `tooling.entry` and its declared runtime exist, invoke that project-local implementation directly. In this repository the primary entry is `node .agent-workspace/tools/agent-workspace.mjs`.
2. Use an installed Agent Workspace Skill for workspace discovery, explanation, migration guidance, or boundary review. The Skill is an operator, not a higher-priority replacement for project tooling.
3. If the manifest is absent, follow the Skill's adoption workflow when the user asks to initialize or migrate the repository.
4. If the manifest declares tooling that is missing or does not support a requested command, report a workspace capability gap. Do not silently substitute Skill-bundled validation or another implementation.

Do not record a machine-specific Skill installation path in tracked files. Resolve installed Skill locations from the active agent runtime when Skill assistance is needed.

## Tool Policy

Keep tool roles separate. Detailed routing lives in `docs/agents/workflow.md`; this file records the non-negotiable summary.

- Browser (in-app) is primarily for documentation, API reference, and error explanation. It may perform one narrowly scoped visual review only after Playwright cannot reliably answer a predefined visual question and only when the current Browser capability explicitly supports the target local URL. Follow the hard budget in `docs/agents/workflow.md`.
- Agents must not use controlled Chrome for debugging, inspection, or validation. Chrome checks are developer-operated only, even when Chrome control is technically available.
- Playwright is the default agent-operated browser validation tool. Prefer existing tests, then add a narrowly scoped check only when it provides useful coverage.
- Computer Use is only for system-level execution such as starting dev servers, running commands, or file operations. Do not use it for UI validation.

Use source inspection and static checks before browser validation. Low-risk presentation changes may skip browser validation when the handoff states why and lists the checks performed. For browser-dependent behavior, do not treat code review alone as completed UI validation.

If Playwright cannot run, do not treat Browser as an execution fallback; route Playwright to an available shell, CI, or the developer. If Playwright cannot reliably answer a predefined visual question, a budgeted in-app Browser review is allowed. Otherwise, do not bypass the Chrome restriction with Computer Use or another interactive tool; provide a targeted manual Chrome procedure and keep the validation gap explicit.

## Editing Rules

- Prefer the existing service layer instead of querying Astro content directly from UI components.
- Keep route pages thin. Pages should compose layouts/components and call services.
- When splitting large route, layout, or component files, preserve the existing separation of concerns:
  - `src/services/` owns page logic, data adaptation, configuration normalization, static path builders, and page-level view models.
  - `src/pages/` owns routing only: call services, compose layouts/components, and pass view models down.
  - `src/components/` and `src/layouts/` own rendering and local presentation. Extracted page components should stay mostly presentational.
  - Browser-only interaction state such as DOM listeners, audio playback, pointer events, localStorage UI state, and Svelte runtime stores should live beside the owning component or feature, not in `src/services/`.
- Prefer feature-local directories for large splits. Keep helpers and types beside the feature until they are reused by multiple unrelated features; only then promote them to shared `src/utils` or shared services.
- All architectural changes must respect the `src/services/core` pipeline.
- Do not bypass the `content-store` layer or `getContentStore()` for normal post collection data.
- Keep content schema changes in `src/content.config.ts` and document them in `docs/developers/content-guide.md`.
- Keep configuration shape changes in `src/types/config.ts` and document them in `docs/developers/configuration.md`.
- Do not edit generated folders such as `dist` or `node_modules`.
- Do not commit secrets. Environment variables belong in `.env` locally or platform secrets in production.
- Store machine-specific paths, personal identities, raw command output, and unreviewed runtime observations under `.agent-workspace/local/`, `.agent-workspace/raw/`, or `.agent-workspace/quarantine/`. These directories are private and ignored by Git.
- Only promote sanitized, reusable knowledge into tracked Agent Workspace Spec documents. Follow `docs/agents/disclosure-policy.md` and run `node .agent-workspace/tools/agent-workspace.mjs validate` before committing.
- Preserve local customizations in `src/config.ts`; this repository is intentionally personal and not a clean upstream Mizuki copy.
- UI changes must consume the project Design layer in `src/design/` when an existing Semantic token or `ds-` Pattern covers the requirement. Primitive `--color-*` tokens are Design-only, and Feature-local tokens should reference Semantic tokens. Read `docs/developers/design-system.md` before non-trivial UI work.

## Documentation Reading Rules

Read only the documents needed for the current task:

- Documentation structure or routing: `docs/README.md`.
- Agent workflow and handoff: `docs/agents/workflow.md`.
- Known failures and runtime pitfalls: `docs/agents/memory.json`, `docs/agents/failure-index.md`, and `docs/agents/runtime-playbook.md`.
- Architecture, content pipeline, routes, or service boundaries: `docs/agents/project-map.md` and `docs/developers/architecture.md`.
- Content schema, posts, tags, categories, drafts, or assets: `docs/developers/content-guide.md`.
- Site configuration, environment variables, feature pages, URL helpers, or permalink behavior: `docs/developers/configuration.md`.
- Local setup, commands, checks, or development workflow: `docs/developers/development.md`.
- Content separation, content repository, migration, deployment, or build triggers: the matching document under `docs/developers/`.
- Maintenance risks, generated files, or dependency updates: `docs/developers/maintenance.md`.
- Design token, Theme, Pattern, Surface, typography, spacing, width, radius, or shadow changes: `docs/developers/design-system.md`.

When a change affects multiple areas, read the relevant documents for each area. When a task clearly does not touch a document's topic, do not read that document just to appear thorough.

## Documentation Rules

- `docs/README.md` is the only root documentation index.
- Developer-facing documentation lives in `docs/developers/` and must be written in Chinese.
- Chinese developer documents should preserve important English keywords where they clarify project concepts, APIs, commands, config keys, file names, or ecosystem terms.
- Agent-facing documentation lives in `docs/agents/` and must be written in English for better agent comprehension.
- Documentation assets live in `docs/assets/`.
- When behavior changes, update the closest audience-specific document instead of adding a new root-level Markdown file.
- If a change affects both humans and agents, update both the Chinese developer document and the English agent document.
- If a task discovers a reusable failure pattern, update `docs/agents/memory.json`, `docs/agents/failure-index.md`, `docs/agents/runtime-playbook.md`, or `docs/agents/execution-log.md` as appropriate.

## Validation Expectations

Validation is impact-based. Agents must run the smallest sufficient set that covers the changed behavior and its shared contracts; full validation is an escalation path, not the default.

Before running checks:

1. List the changed files and classify them as documentation, pure logic, content/schema, feature UI, shared shell/design, or tooling/dependencies.
2. Select the directly owned checks plus checks for any shared contract the change consumes.
3. Record why the selected set is sufficient and report skipped higher-level checks in the handoff.

Escalate to full regression when a change affects shared content/core contracts, global layout/navigation/design infrastructure, build or test configuration, dependencies, three or more unrelated features, or a path that the impact rules cannot classify. A selected test exposing cross-module behavior also requires escalation. The target branch alone is not an escalation condition; ordinary `main` work uses the same impact plan as a pull request.

Use `docs/agents/testing-strategy.md` as the normative selection matrix. Never skip a relevant check merely because it is expensive; choose a narrower layer that proves the same behavior when one exists.

If a command cannot run because of missing local secrets, unavailable network access, or external service limits, state that clearly in the final handoff.

## Git Safety

- The workspace may contain user changes. Do not revert changes you did not create unless the user explicitly asks.
- Avoid destructive commands such as `git reset --hard` and `git checkout --` unless the user explicitly asks.
- Keep changes focused. Do not perform unrelated refactors.
- Before committing, inspect the working tree and commit only the intended files.
- Git hooks are installed from `.githooks`. The pre-commit hook formats staged code files, restages formatting changes, runs staged whitespace checks, and runs `astro check`. Do not bypass it unless the user explicitly asks.

## Git Commit Rules

Git commit identity is local configuration and must not be recorded in this public document. Use the repository's existing Git configuration; the Agent Workspace Spec identity map may match it to an opaque developer ID but must not expose it. Never invent or substitute an AI/tool identity.

When the user asks to commit code, first check whether the change requires maintaining `README.md`, `AGENTS.md`, or `docs/`. If the change adds or adjusts safety boundaries, interaction flows, migration/storage rules, test or maintenance knowledge, commit conventions, or other project context, update the corresponding documentation before committing.

Commit red lines:

- Do not commit with Codex, AI Agent, tool-default, or temporary identities.
- Do not copy a local identity into tracked documentation or command examples.
- Commit messages must follow Conventional Commits.

Example commit messages:

- `feat: implement local password workspace`
- `fix: handle decrypt failure state`
- `docs: update project context`
