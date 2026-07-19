# Agent Workspace Spec Disclosure Policy

This policy defines what Agent Workspace Spec information may be tracked in the public repository. Apply it before persisting runtime observations or promoting local memory.

## Storage classes

| Class | Location | Git policy | Examples |
| --- | --- | --- | --- |
| Public | `AGENTS.md`, `docs/agents/`, `spec/agent-workspace/` | Tracked | Reusable workflows, architecture constraints, sanitized failure patterns, schemas, placeholder examples |
| Local | `.agent-workspace/local/` | Ignored | Personal identity, machine paths, private repository metadata, local capability overrides |
| Raw | `.agent-workspace/raw/` | Ignored | Command output, traces, prompts, screenshots, temporary diagnostics |
| Quarantine | `.agent-workspace/quarantine/` | Ignored | Candidate memory that has not completed disclosure review |
| Secret | Dedicated environment or secret store | Never persist in Agent Workspace Spec | Tokens, passwords, cookies, private keys, credential values |

## Operational use of private state

Local, Raw, and Quarantine files are private session inputs, not forbidden inputs. Agents may read and analyze them when their developer, machine, session, or diagnostic context is relevant to the current task. Agents should not inspect private state merely to complete a routine or make a handoff appear more thorough.

Private values must not be reproduced, enumerated, quoted, or copied into tracked files or handoffs. A handoff may report only the minimum task-relevant, sanitized conclusion derived from private state, such as whether a required capability is available or which class of runtime limitation blocked a check. It must not expose identities, user-home paths, hostnames, opaque profile IDs, private URLs, credentials, or raw observations.

## Team identity model

Use the active Git identity only as a local matching signal. The profile initializer converts it into a locally salted fingerprint and maps it to an opaque developer ID. Public Agent Workspace Spec files must never contain the identity, fingerprint, developer ID, machine ID, or session ID.

Developer, machine, and session are separate scopes:

- developer profiles store private preferences and actor type;
- machine profiles store cached environment and capability state;
- session profiles store ephemeral capability observations;
- automation identities receive separate profiles and must not inherit a human developer profile.

One developer may link multiple Git identities locally with `node .agent-workspace/tools/agent-workspace.mjs profile link-identity <developer-id>`. Never infer that two identities belong to the same person without an explicit local linking action.

## Public promotion requirements

Promote an observation into public Agent Workspace Spec memory only when it is:

1. reusable beyond one execution;
2. necessary for maintaining the public project;
3. stripped of personal identity, user-home paths, private URLs, internal hostnames, IP addresses, resource IDs, and raw user content;
4. reduced to the minimum useful error signature rather than a complete log;
5. reviewed for credentials and high-entropy values;
6. written into the document that owns the rule, without duplicating policy elsewhere.

Use placeholders such as `$HOME`, `<user>`, `<repository>`, `<host>`, and `<resource-id>` when the shape matters but the value does not.

## Runtime memory lifecycle

1. Capture unfiltered observations in `.agent-workspace/raw/` only when persistence is necessary.
2. Move reusable candidates to `.agent-workspace/quarantine/` and assign a proposed `public` or `local` classification.
3. Sanitize and reduce public candidates to a stable pattern.
4. Run `node .agent-workspace/tools/agent-workspace.mjs validate`.
5. Review the staged diff before committing.
6. Delete raw material when it no longer serves an active diagnostic purpose.

Never promote content automatically merely because the same failure occurred more than once. Recurrence establishes usefulness, not disclosure safety.

## History rule

Removing sensitive content from the current tree does not remove it from Git history. Before publishing an existing repository, audit the full history separately. If a real credential was committed, rotate it before considering history rewriting.
