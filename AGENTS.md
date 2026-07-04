# Agent Guide

This repository is an Astro + Svelte personal blog forked from Mizuki and customized for `whynotsnow`.

Use this file as the first stop before changing code. The goal is to keep AI-agent work predictable, easy to review, and aligned with the current architecture.

## Why Agent OS Exists

This project is not just a static blog system. It is a content engineering system with layered service architecture, build-time transformation pipeline, multiple routing strategies, and framework-specific constraints across Astro, Svelte, and TypeScript.

Without structured agent memory:

- the same tooling bugs reappear;
- architectural decisions get reinterpreted incorrectly;
- fixes are repeated instead of reused;
- debugging cost increases over time.

Agent OS introduces persistent failure memory, structured execution logs, reusable debugging patterns, and enforced reflection after meaningful tasks.

Key principle:

> This project is not debugged repeatedly. It is learned once and reused forever.

All AI-assisted development in this project should be memory-driven, pattern-aware, architecture-constrained, and failure-learned.

## Project Shape

- Framework: Astro 5 with Svelte components.
- Package manager: pnpm only.
- Content source: `src/content/posts` and `src/content/spec`, optionally synchronized from an external content repository by `scripts/sync-content.js`.
- Core content pipeline: `src/services/core`.
- UI-facing service layer: `src/services`.
- Site configuration: `src/config.ts` and `src/types/config.ts`.
- Static assets: `public`.
- Documentation: `docs`.

## Start Here

1. Read this file first.
2. Read documentation on demand. Do not load every document by default.
3. Use `docs/README.md` as the routing index when you need to choose the right document.
4. Read `docs/agents/workflow.md` before non-trivial agent work.
5. Read `docs/agents/project-map.md` before changing architecture, data flow, routing, or services.
6. Read `docs/agents/memory.json`, `docs/agents/failure-index.md`, and `docs/agents/runtime-playbook.md` before running commands or changing areas with known failures.
7. Use ordinary repository inspection commands such as `git status --short`, `rg --files`, and `sed -n` when you need local context.

## Commands

- `pnpm dev`: start the Astro dev server.
- `pnpm check`: run Astro checks.
- `pnpm type-check`: run TypeScript declaration-oriented checks.
- `pnpm build`: production build, Pagefind indexing, and font compression.
- `pnpm format:check`: check formatting.
- `pnpm format`: format the repository according to the local Prettier config.
- `pnpm precommit`: run the same pre-commit gate as the Git hook.
- `pnpm new-post -- <filename>`: create a post template.

Do not claim that a command passed unless you actually ran it in this workspace and observed the result. If a command was not run, say so explicitly.

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
- Preserve local customizations in `src/config.ts`; this repository is intentionally personal and not a clean upstream Mizuki copy.

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

For code changes, run the narrowest useful checks:

- Type or schema changes: `pnpm check` and `pnpm type-check`.
- Route, content, or asset pipeline changes: `pnpm build`.
- Documentation-only changes: no build is required unless examples or commands changed.

If a command cannot run because of missing local secrets, unavailable network access, or external service limits, state that clearly in the final handoff.

## Git Safety

- The workspace may contain user changes. Do not revert changes you did not create unless the user explicitly asks.
- Avoid destructive commands such as `git reset --hard` and `git checkout --` unless the user explicitly asks.
- Keep changes focused. Do not perform unrelated refactors.
- Before committing, inspect the working tree and commit only the intended files.
- Git hooks are installed from `.githooks`. The pre-commit hook formats staged code files, restages formatting changes, runs staged whitespace checks, and runs `astro check`. Do not bypass it unless the user explicitly asks.

## Git Commit Rules

Git commit identity is defined by this document. Do not re-query local Git config before every commit.

When the user asks to commit code, first check whether the change requires maintaining `README.md`, `AGENTS.md`, or `docs/`. If the change adds or adjusts safety boundaries, interaction flows, migration/storage rules, test or maintenance knowledge, commit conventions, or other project context, update the corresponding documentation before committing.

Commit red lines:

- Do not commit with Codex, AI Agent, tool default, or temporary identities such as `Codex <codex@openai.com>`.
- Do not bypass the identity recorded in this document.
- Commit messages must follow Conventional Commits.

Current commit identity:

- Name: `whynotsnow`
- Email: `whynotsnow@163.com`

When committing, use the identity above directly:

```bash
git -c user.name=whynotsnow -c user.email=whynotsnow@163.com commit -m "docs: update project context"
```

Example commit messages:

- `feat: implement local password workspace`
- `fix: handle decrypt failure state`
- `docs: update project context`
