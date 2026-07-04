# Agent Documentation

This directory is for AI coding agents. All documents in this directory must be written in English so agents can parse and follow them reliably.

## Documents

| Document | Purpose |
| --- | --- |
| [Workflow](./workflow.md) | How agents should inspect, modify, validate, and hand off work. |
| [Project Map](./project-map.md) | Repository shape, data flow, route map, service boundaries, and extension points. |

## Read Documents On Demand

Agents must read documentation based on the task scope, not as a blanket preflight step.

- Always start with `AGENTS.md`.
- Use `docs/README.md` only to choose the right document when the task area is unclear.
- Read `workflow.md` for non-trivial implementation, validation, or handoff work.
- Read `project-map.md` before touching architecture, content flow, routes, or service boundaries.
- Read the matching Chinese document under `../developers/` when human-facing behavior, content authoring, configuration, deployment, or maintenance rules are affected.
- Do not claim a command passed unless it was actually run.

## Rules

- Keep agent instructions concise and operational.
- Link to developer documents when human-facing behavior, configuration, content authoring, or deployment is affected.
- Do not duplicate long Chinese developer guides here; summarize the agent-relevant actions and point to `../developers/`.
- If implementation behavior changes, update this directory when the agent workflow or project map would otherwise become stale.
