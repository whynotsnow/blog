# Failure Index

This index clusters known failure patterns so agents can recognize them quickly and reuse known fixes.

## CLI

### content-sync-fallback-drift

- Symptom: an external-content build succeeds with local, stale, or untraceable content after preparation failed or was skipped.
- Playbook: [content-sync-fallback-drift](./runtime-playbook.md#content-sync-fallback-drift)

### zsh-glob-expansion

- Symptom: `zsh: no matches found` for Astro route files or glob-like paths.
- Playbook: [zsh-glob-expansion](./runtime-playbook.md#zsh-glob-expansion)

### bash-groups-special-variable

- Symptom: a GitHub Actions Bash step prints a valid validation plan JSON, then exits with code 1 after assigning to `GROUPS`.
- Playbook: [bash-groups-special-variable](./runtime-playbook.md#bash-groups-special-variable)

### ci-unavailable-push-base

- Symptom: a GitHub Actions push validation plan fails with `Invalid symmetric difference expression <before>...HEAD` after a force push or rewritten history.
- Playbook: [ci-unavailable-push-base](./runtime-playbook.md#ci-unavailable-push-base)

### pnpm-version-config-drift

- Symptom: pnpm warns that `package.json#pnpm` is ignored, then reports lockfile config mismatch.
- Playbook: [pnpm-version-config-drift](./runtime-playbook.md#pnpm-version-config-drift)

### pnpm-non-tty-node-modules-purge

- Symptom: `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` before a script runs.
- Playbook: [pnpm-non-tty-node-modules-purge](./runtime-playbook.md#pnpm-non-tty-node-modules-purge)

### pnpm-store-location-mismatch

- Symptom: `ERR_PNPM_UNEXPECTED_STORE` because existing `node_modules` is linked from a different pnpm store than the active pnpm config wants to use; do not solve it by adding a project-local `.pnpm-store`.
- Playbook: [pnpm-store-location-mismatch](./runtime-playbook.md#pnpm-store-location-mismatch)

### generated-font-dev-drift

- Symptom: Dev requests configured WOFF2 URLs with 404 responses while source TTF files exist, or production silently falls back because the font generator found no configuration.
- Playbook: [generated-font-dev-drift](./runtime-playbook.md#generated-font-dev-drift)

### astro-content-cache-asset-drift

- Symptom: production HTML references an Expressive Code asset such as `/_astro/ec.<hash>.css`, but `dist/_astro` contains a different hash and the missing asset request returns HTML with a stylesheet MIME error.
- Playbook: [astro-content-cache-asset-drift](./runtime-playbook.md#astro-content-cache-asset-drift)

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

### feature-media-visibility-and-lightbox-drift

- Symptom: migrated album or diary media renders as clickable blank regions, or Fancybox opens without the project lightbox styling and image sizing.
- Playbook: [feature-media-visibility-and-lightbox-drift](./runtime-playbook.md#feature-media-visibility-and-lightbox-drift)

### banner-entry-geometry-feedback

- Symptom: category or post entry scrolling differs between link and browser-history navigation, or history leaves the grid covering the Banner carousel.
- Playbook: [banner-entry-geometry-feedback](./runtime-playbook.md#banner-entry-geometry-feedback)

## Browser Verification

### same-origin-iframe-frame-policy

- Symptom: a same-origin iframe, such as the Live2D companion host, fails in production with `X-Frame-Options` set to `deny`.
- Playbook: [same-origin-iframe-frame-policy](./runtime-playbook.md#same-origin-iframe-frame-policy)

### vercel-git-autodeploy-approval-bypass

- Symptom: Vercel Git Integration can deploy `main` directly, or `ignoreCommand` relies on a custom non-secret environment variable to allow production builds.
- Playbook: [vercel-git-autodeploy-approval-bypass](./runtime-playbook.md#vercel-git-autodeploy-approval-bypass)

### mermaid-prerender-ci-browser-lifecycle

- Symptom: CI Mermaid prerender tests fail because Chromium was not installed in the job, or production build fails with `page.close` / `page.evaluate` reporting that the browser context was already closed.
- Playbook: [mermaid-prerender-ci-browser-lifecycle](./runtime-playbook.md#mermaid-prerender-ci-browser-lifecycle)

### playwright-spec-split-concurrency-drift

- Symptom: splitting a large spec into multiple files unexpectedly increases worker concurrency, dev-server load, timeouts, or readiness flakes even though assertions did not change.
- Playbook: [playwright-spec-split-concurrency-drift](./runtime-playbook.md#playwright-spec-split-concurrency-drift)

### playwright-stale-dev-server-reuse

- Symptom: full Playwright regression reports missing client islands across unrelated modules, often with `Cannot read properties of undefined (reading 'call')`, while the same suites pass after stopping an old Astro/Vite server.
- Playbook: [playwright-stale-dev-server-reuse](./runtime-playbook.md#playwright-stale-dev-server-reuse)

### playwright-chromium-mac-sandbox

- Symptom: Playwright Chromium launch fails with `MachPortRendezvousServer` and `Permission denied (1100)` before localhost navigation.
- Playbook: [playwright-chromium-mac-sandbox](./runtime-playbook.md#playwright-chromium-mac-sandbox)
- Capability contract: [Runtime Requirements](./runtime-requirements.md#capability-resolution)
- Routing policy: [Automated and Regression Lane](./workflow.md#automated-and-regression-lane)

### vite-deps-dynamic-import-cache-drift

- Symptom: Chrome or Playwright Chromium reports `Failed to fetch dynamically imported module` for `/node_modules/.vite/deps/...`, often after Vite dependency optimization or dev-server restarts.
- Playbook: [vite-deps-dynamic-import-cache-drift](./runtime-playbook.md#vite-deps-dynamic-import-cache-drift)

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
