# Failure Index

This index clusters known failure patterns so agents can recognize them quickly and reuse known fixes.

## CLI

### zsh-glob-expansion

- Symptom: `zsh: no matches found` for Astro route files or glob-like paths.
- Playbook: [zsh-glob-expansion](./runtime-playbook.md#zsh-glob-expansion)

### pnpm-version-config-drift

- Symptom: pnpm warns that `package.json#pnpm` is ignored, then reports lockfile config mismatch.
- Playbook: [pnpm-version-config-drift](./runtime-playbook.md#pnpm-version-config-drift)

### pnpm-non-tty-node-modules-purge

- Symptom: `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` before a script runs.
- Playbook: [pnpm-non-tty-node-modules-purge](./runtime-playbook.md#pnpm-non-tty-node-modules-purge)

### pnpm-store-location-mismatch

- Symptom: `ERR_PNPM_UNEXPECTED_STORE` because existing `node_modules` is linked from a different pnpm store than the active pnpm config wants to use.
- Playbook: [pnpm-store-location-mismatch](./runtime-playbook.md#pnpm-store-location-mismatch)

## Framework

### astro-telemetry-side-effects

- Symptom: Astro command fails while trying to write under user preferences/home directory.
- Playbook: [astro-telemetry-side-effects](./runtime-playbook.md#astro-telemetry-side-effects)

## Styles

### global-style-entrypoint-drift

- Symptom: global card styles disappear, `.card-base` loses background/radius, or CSS variables such as `--card-bg` are empty at runtime.
- Playbook: [global-style-entrypoint-drift](./runtime-playbook.md#global-style-entrypoint-drift)

### fullscreen-banner-responsive-override

- Symptom: fullscreen banner mode does not fill the first viewport, or waves are not aligned to the first screen bottom.
- Playbook: [fullscreen-banner-responsive-override](./runtime-playbook.md#fullscreen-banner-responsive-override)

## Browser Verification

### playwright-chromium-mac-sandbox

- Symptom: Playwright Chromium launch fails with `MachPortRendezvousServer` and `Permission denied (1100)` before localhost navigation.
- Playbook: [playwright-chromium-mac-sandbox](./runtime-playbook.md#playwright-chromium-mac-sandbox)
- Capability contract: [Runtime Requirements](./runtime-requirements.md#capability-resolution)
- Routing policy: [Automated and Regression Lane](./workflow.md#automated-and-regression-lane)

## TypeScript

### tsconfig-baseurl-drift

- Symptom: import resolution, editor diagnostics, or generated type behavior changes after TS config edits.
- Playbook: [tsconfig-baseurl-drift](./runtime-playbook.md#tsconfig-baseurl-drift)

## Markdown

### md051-emoji-heading-fragments

- Symptom: markdownlint reports `MD051/link-fragments` even when the visible heading text appears to match.
- Playbook: [md051-emoji-heading-fragments](./runtime-playbook.md#md051-emoji-heading-fragments)

## Architecture

### service-layer-bypass-risk

- Symptom: pages or UI components start querying Astro content directly for normal post list data.
- Required response: route the change through `src/services/core` or feature services unless it is a specialized static endpoint.

### content-store-contract-drift

- Symptom: category/tag/archive behavior diverges across pages.
- Required response: inspect `src/services/core/content-store.ts`, `src/services/core/types.ts`, and URL helpers together.
