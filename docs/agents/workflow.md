# AI Agent Workflow

This repository is now prepared for AI-assisted maintenance. The intent is not to add a chatbot to the site; it is to make future agent work safer, faster, and easier to review.

## Agent Entry Points

| File or command | Use |
| --- | --- |
| `AGENTS.md` | Operational rules for AI coding agents. |
| `docs/README.md` | Documentation index. |
| `docs/agents/project-map.md` | English project map and data flow for agents. |
| `docs/developers/content-guide.md` | Chinese content schema, authoring rules, and sync behavior. |
| `docs/developers/configuration.md` | Chinese configuration ownership and common edits. |

## Recommended Agent Loop

1. Read only the relevant docs for the task. Use `docs/README.md` as the routing index when needed.
2. Inspect local context with ordinary commands such as `git status --short`, `rg --files`, and targeted file reads.
3. Inspect the exact files involved in the change.
4. Make the smallest coherent edit.
5. Run the narrowest meaningful validation command.
6. Report changed files, validation results, and any skipped checks.

## On-Demand Documentation Routing

| Task area | Read |
| --- | --- |
| Architecture, content flow, routes, or services | `docs/agents/project-map.md`, `docs/developers/architecture.md` |
| Content schema, posts, tags, categories, drafts, or assets | `docs/developers/content-guide.md` |
| Site config, env vars, feature pages, URLs, or permalink behavior | `docs/developers/configuration.md` |
| Local setup, commands, checks, or developer workflow | `docs/developers/development.md` |
| Content separation, content repository, migration, deployment, or build trigger behavior | Matching document in `docs/developers/` |
| Maintenance risks, generated files, dependency updates | `docs/developers/maintenance.md` |

Do not read unrelated documents just to appear thorough. If multiple areas are affected, read each relevant document before editing.

## Common Task Routing

| Task | Start with |
| --- | --- |
| Add or change a post field | `src/content.config.ts`, `src/services/core/types.ts`, `docs/developers/content-guide.md` |
| Change homepage post selection | `src/pages/index.astro`, `src/services/home.ts`, `src/services/core/sort.ts` |
| Change categories or tags | `src/services/core/content-store.ts`, `src/utils/url-utils.ts`, category route files |
| Change post detail rendering | `src/services/post-detail/index.ts`, `src/components/PostPage.astro`, `src/pages/posts/[...slug].astro` |
| Change widgets | `src/components/widget`, `src/services/widget/registry.ts` |
| Change navigation or feature pages | `src/config.ts`, `src/constants/link-presets.ts`, related page file |
| Change deployment behavior | `vercel.json`, `scripts/*`, `docs/developers/deployment.md` |

## Guardrails

- Treat `src/config.ts` as owner-specific configuration, not generic upstream defaults.
- Do not edit `dist`, `node_modules`, generated Pagefind output, or compressed font output directly.
- Do not add new dependencies unless the existing Astro/Svelte/Node toolchain cannot reasonably solve the task.
- Do not bypass `src/services/core` for post list data in normal pages.
- Do not hardcode private IDs, API keys, tokens, or cookies.

## Validation Matrix

| Change type | Suggested validation |
| --- | --- |
| Docs only | Read affected links and headings; run `pnpm lint:md` for Markdown structure changes. |
| Type or schema | `pnpm check`, `pnpm type-check` |
| Content pipeline | `pnpm check`, then `pnpm build` when feasible |
| Styles or UI components | `pnpm dev` visual check, plus `pnpm check` |
| Build scripts | Run the touched script with a safe input or dry-run equivalent when available |

## Handoff Format

When an agent finishes a task, it should include:

- Files changed.
- Commands run and whether they passed.
- Any known skipped validation.
- Follow-up risks only when they affect the requested outcome.

Never state that a command passed unless it was actually run in this workspace.
