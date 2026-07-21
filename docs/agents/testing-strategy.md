# Impact-Based Testing Strategy

This document is the normative test-selection contract for agents. Validation must cover the changed behavior and its shared dependencies without treating full regression as the default response to every edit.

## Selection Procedure

1. List all changed and staged paths, preserving unrelated user work as out of scope.
2. Classify each task-owned path as documentation, pure logic, content/schema, feature UI, shared shell/design, or tooling/dependencies.
3. Select the lowest validation layer that directly proves the behavior.
4. Add contract tests for shared dependencies used by the changed module.
5. Apply the escalation rules below.
6. Report the classification, selected checks, results, and skipped higher layers.

Path mapping is a conservative aid, not a substitute for reasoning. A change to a shared API can affect consumers outside the directory containing the edited file.

Use `pnpm test:plan` to inspect the current working-tree plan and `pnpm test:affected` to execute it. In CI, pass the pull request base SHA to `scripts/test-impact.mjs --base <sha>`. The versioned rules live in `tests/impact-map.json`; unclassified paths select `full`.

## Validation Layers

| Layer | Purpose | Typical scope |
| --- | --- | --- |
| L0 File gates | Formatting, Markdown structure, staged whitespace, Agent Workspace disclosure | Changed files only |
| L1 Static gates | ESLint, TypeScript, Astro diagnostics, Design boundary checks | Affected language or framework surface |
| L2 Unit | Pure functions, resolvers, parsers, URL and configuration normalization | Owning module |
| L3 Integration | Content Store, service view models, static paths, build-script contracts | Owning service or pipeline |
| L4 Feature E2E | One feature's rendered or interactive behavior | Owning feature spec |
| L5 Contract E2E | Page Shell, navigation, responsive layout, Design and cross-page contracts | Shared contract suite |
| L6 Full regression | All automated tests and the complete production build | Escalated, scheduled, manual, or release runs |

Prefer L2 or L3 over browser coverage for deterministic pure logic. Use L4 or L5 only when the behavior depends on rendering, browser state, navigation, responsive CSS, or DOM interaction.

## Change Matrix

| Change class | Required starting scope | Add when applicable |
| --- | --- | --- |
| Documentation only | L0 for affected Markdown; Agent Workspace validation for public agent knowledge | Command example verification when commands changed |
| Pure TypeScript logic | L1 TypeScript/ESLint plus owning L2 tests | L3 when public service output changes |
| Content schema or core pipeline | L1 Astro/TypeScript, owning L2/L3, Astro production build | Relevant route or rendering contract |
| Feature UI or feature-local CSS | L1 Astro/ESLint plus owning L4 suite | L5 when shared layout or Design contracts change |
| Shared Shell, navigation, global style, or Design | L1 including Design checks, relevant L5 suites, smoke | Full E2E when multiple page compositions change |
| Build script | L1 plus safe script-level L3 test or dry run | Relevant build stage; complete build only when the composed pipeline changes |
| Toolchain, dependencies, test configuration, or CI | Direct tool self-tests and static gates | L6 before handoff unless the change is documentation-only |
| Test code | Static validation for tests plus the changed test module | Broader owning suite when fixtures or shared support change |

## Full-Regression Escalation

Run L6 when any condition applies:

- `src/services/core`, content schema, shared URL contracts, global layout/navigation lifecycle, Design foundations, or global style entry points change in a cross-cutting way;
- package dependencies, lockfiles, Astro/TypeScript/Playwright configuration, build orchestration, impact mapping, or CI selection logic changes;
- three or more unrelated feature owners are affected;
- a changed runtime path is not classified by the impact map;
- selected validation reveals an unexpected cross-module dependency;
- the run is scheduled, manually requested as full, or targets a release.

An expensive check may be skipped only when a lower layer proves the same contract or the environment cannot run it. Environment gaps must remain explicit.

## Test Ownership

Tests should be organized by behavior owner:

```text
tests/
  fixtures/           stable routes, content, and viewport data
  support/            shared Playwright helpers without feature assertions
  unit/               pure module behavior
  integration/        service and pipeline boundaries
  e2e/
    smoke/            small critical-route availability suite
    shell/            navigation, page entry, responsive shell
    features/         home, post list, post detail, activity center, widgets
    contracts/        Design and shared rendering contracts
```

Do not place unrelated behavior in a convenient existing spec. Avoid duplicating the same contract across smoke and feature suites; smoke should assert availability while the owning feature suite asserts detail.

## Command Contract

| Command | Scope |
| --- | --- |
| `pnpm test:fast` | All Unit and Integration tests |
| `pnpm test:smoke` | Critical-route Playwright smoke only |
| `pnpm test:e2e:shell` | Navigation and responsive Shell contracts |
| `pnpm test:e2e:full` | All Playwright regression specs |
| `pnpm build:astro` | Content/font preparation plus the Astro build stage, without Pagefind |
| `pnpm verify:full` | Static checks, fast tests, full E2E, and complete production build |

Pre-commit uses staged-file categories for local static gates and never runs browser tests. Pull request and ordinary `main` push CI consume the same impact plan. Weekly scheduled runs, manual full runs, releases, and risk-based escalation keep L6 as the mapping safety net. `pnpm test:impact:check` guards `src/features/**` and `tests/e2e/**` so newly added paths cannot silently fall through to full validation.

## Handoff Evidence

Every code-task handoff must state:

- changed paths owned by the task;
- impact classification and shared contracts considered;
- exact commands run and observed results;
- higher validation layers not run and why;
- whether a full-regression escalation condition was triggered.

Never claim a suite passed when only test discovery, a subset, or package-manager preflight ran.
