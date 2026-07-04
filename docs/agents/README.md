# Agent Documentation

This directory is for AI coding agents. All documents in this directory must be written in English so agents can parse and follow them reliably.

## Documents

| Document | Purpose |
| --- | --- |
| [Workflow](./workflow.md) | How agents should inspect, modify, validate, and hand off work. |
| [Project Map](./project-map.md) | Repository shape, data flow, route map, service boundaries, and extension points. |
| [Runtime Playbook](./runtime-playbook.md) | Known command, framework, Markdown, and package-manager pitfalls with reusable responses. |
| [Failure Index](./failure-index.md) | Clustered index of known failure patterns. |
| [Execution Log](./execution-log.md) | Short record of AI-assisted work that teaches reusable project knowledge. |
| [Memory](./memory.json) | Structured persistent memory for architecture constraints and recurring failures. |

## Agent OS

This project uses Agent OS to ensure AI-assisted development is memory-driven, pattern-aware, architecture-constrained, and failure-learned.

Key principle:

> This project is not debugged repeatedly. It is learned once and reused forever.

Agent OS exists because this project is a content engineering system with:

- layered service architecture;
- build-time transformation pipeline;
- multiple routing strategies;
- Astro, Svelte, and TypeScript constraints.

Without structured agent memory, the same tooling bugs reappear, architectural decisions get reinterpreted, and fixes are repeated instead of reused.

## Read Documents On Demand

Agents must read documentation based on the task scope, not as a blanket preflight step.

- Always start with `AGENTS.md`.
- Use `docs/README.md` only to choose the right document when the task area is unclear.
- Read `workflow.md` for non-trivial implementation, validation, or handoff work.
- Read `project-map.md` before touching architecture, content flow, routes, or service boundaries.
- Read `memory.json` and `runtime-playbook.md` before running commands or changing areas with known failures.
- Read the matching Chinese document under `../developers/` when human-facing behavior, content authoring, configuration, deployment, or maintenance rules are affected.
- Do not claim a command passed unless it was actually run.

## Rules

- Keep agent instructions concise and operational.
- Link to developer documents when human-facing behavior, configuration, content authoring, or deployment is affected.
- Do not duplicate long Chinese developer guides here; summarize the agent-relevant actions and point to `../developers/`.
- If implementation behavior changes, update this directory when the agent workflow or project map would otherwise become stale.
