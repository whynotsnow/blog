# Runtime Playbook

This playbook records known runtime and tooling pitfalls for this repository. Check it before running commands that touch the same area.

## Shell

### content-sync-fallback-drift

Pattern:

- External content is enabled, but a missing URL/SHA, failed fetch, or invalid directory silently continues with local or previously activated content.
- A build entrypoint bypasses `pnpm content:prepare`, or wraps preparation with `|| true`.

Use:

- Keep `ENABLE_CONTENT_SYNC` defaulted to local mode and require both `CONTENT_REPO_URL` and a full `CONTENT_REPO_COMMIT_SHA` in external mode.
- Route `pnpm build`, `pnpm build:astro`, development, and Playwright through the same preparation entry.
- Treat external preparation failure as fatal. Only explicit local mode may consume repository content.
- Use Git argument arrays with `shell: false`; never log a credential-bearing repository URL.
- Confirm the `[content] mode=external commit=<sha>` line when tracing a deployment.

### zsh-glob-expansion

Pattern:

- Unquoted Astro route paths such as `src/pages/posts/[...slug].astro` can be expanded by `zsh` before the command runs.

Use:

- Quote paths that contain `[]`, `*`, `?`, or route glob syntax.
- Prefer `rg --files | rg 'pattern'` when locating route files.

Example:

```bash
sed -n '1,220p' 'src/pages/posts/[...slug].astro'
```

### bash-groups-special-variable

Pattern:

- A GitHub Actions Bash step exits with code 1 immediately after an otherwise valid JSON plan is printed.
- The step assigns to `GROUPS`, for example `GROUPS=$(...)`, then writes a job output.
- No JSON parse error or coverage error appears in the log, only `Process completed with exit code 1`.

Use:

- Do not use `GROUPS` as a shell variable name in Bash-backed workflow steps. Bash exposes `GROUPS` as a special array containing the current user's group IDs.
- Use a neutral name such as `SELECTED_GROUPS`, `VALIDATION_GROUPS`, or `PLAN_GROUPS` before writing to `$GITHUB_OUTPUT`.
- When diagnosing CI plan failures, distinguish the successful `cat test-plan.json` output from the later output-write step. A valid printed JSON document means the failure may be shell assignment, not malformed JSON.

### generated-font-dev-drift

Pattern:

- CSS references generated WOFF2 files, but only a postbuild task creates them, so `astro dev` returns 404 and the browser uses a system fallback.
- A font script parses an obsolete TypeScript re-export with regular expressions, treats missing configuration as disabled optimization, and lets the build succeed without required output.
- Source TTF files live under `public`, so Astro publishes the full multi-megabyte sources even when subset WOFF2 files are also generated.

Use:

- Keep original fonts under `src/assets/fonts/source` with lowercase ASCII filenames; never use `public` as the compiler input directory.
- Run `content:prepare`, then `font:prepare`, before Astro starts in development, production builds, checks, and Playwright web servers.
- Treat `scripts/fonts/config.mjs` as the font build contract. Do not parse `siteConfig` or TypeScript source with regular expressions.
- Keep character collection deterministic and local. Runtime API text must use a system fallback or an already persisted data source; do not use network responses, time values, or random sampling as font inputs.
- Let Astro Font API publish generated `.font-build` WOFF2 files with hashed URLs. Preload the small Latin subset only; load CJK and future locale packages through `unicode-range` and actual text use.
- Use `pnpm font:check` to detect stale or missing generated output, and verify development responses plus `dist/_astro/fonts` when changing the pipeline.

## Astro

### astro-telemetry-side-effects

Pattern:

- Astro commands can try to write telemetry config under the user home directory.
- In restricted environments this can fail before project diagnostics run.

Use:

```bash
ASTRO_TELEMETRY_DISABLED=1 pnpm check
```

When pnpm itself is blocked, use the local binary only if dependencies are already installed:

```bash
ASTRO_TELEMETRY_DISABLED=1 ./node_modules/.bin/astro check
```

## pnpm

### pnpm-version-config-drift

Pattern:

- This project declares `pnpm@10.22.0`.
- Running with pnpm 11 can ignore the `pnpm` field in `package.json`, including `pnpm.overrides`.
- That can trigger lockfile config mismatch errors before scripts run.

Use:

- Prefer the project-declared pnpm version.
- In Codex or a temporary shell, run `source .codex/env-setup.sh` before project `pnpm` commands when PATH resolves to a different pnpm.
- Use `corepack pnpm <command>` when invoking a one-off command without sourcing the environment script.
- Run `node scripts/check-env.mjs` or `corepack pnpm run check-env` to verify the active package manager.
- If a `pnpm` command fails before running the target script, report that the package manager preflight failed rather than claiming the script failed.
- Do not rewrite the lockfile just to satisfy a different global pnpm version unless the user explicitly asks.

### pnpm-non-tty-node-modules-purge

Pattern:

- pnpm may attempt to recreate `node_modules`.
- In a non-TTY environment, it can abort with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`.

Use:

- Treat this as package-manager preflight failure, not as failure of the requested validation command.
- If retrying, use a safe CI-style execution only when appropriate and explain the changed behavior.

### pnpm-store-location-mismatch

Pattern:

- `source .codex/env-setup.sh` may configure pnpm to use the project-local `.pnpm-store`.
- If the existing `node_modules` was linked from the user-level pnpm store, dependency install commands can fail with `ERR_PNPM_UNEXPECTED_STORE` before changing dependencies.

Use:

- Treat this as package-manager preflight failure, not as a dependency resolution failure.
- Prefer preserving the existing `node_modules` store when making a narrow dependency change:

```bash
source .codex/env-setup.sh
pnpm --store-dir "$HOME/Library/pnpm/store/v10" add -D <package>
```

- In restricted sandboxes, writing to the user-level store may require approval. Request escalation instead of reinstalling `node_modules` or rewriting the lockfile.

## TypeScript

### tsconfig-baseurl-drift

Pattern:

- TypeScript path configuration changes can affect Astro, TS server, and import resolution differently.

Use:

- Check `tsconfig.json`, `astro.config.mjs`, and imports together.
- Run `pnpm check` after TS config changes.

## Styles

### global-style-entrypoint-drift

Pattern:

- Core UI classes such as `.card-base` lose background, radius, or other shared styles.
- Runtime computed styles show empty CSS variables such as `--card-bg`.
- A stylesheet error may stay hidden if `src/styles/main.css` or `src/styles/variables.styl` is no longer imported by the top-level layout.

Use:

- Confirm `src/layouts/Layout.astro` imports `src/styles/main.css` and `src/styles/variables.styl`.
- Check the dev server output after restoring global imports; missing imports can mask Stylus compile errors.
- For CSS custom property values that contain `var()` inside Stylus color functions, emit raw CSS with `unquote("...")` instead of calling Stylus `rgba(...)`.

### fullscreen-banner-responsive-override

Pattern:

- Fullscreen banner mode does not fill the first viewport, or header waves appear above/below the expected bottom edge.
- Generic responsive rules later in `src/styles/main-grid-layout.css` set `#banner-wrapper` to `75vh`, `80vh`, `90vh`, or landscape-specific heights after fullscreen-specific rules.
- The banner wrapper also starts with an inline negative `top`, so fullscreen mode must explicitly reset both `top` and `transform`.

Use:

- Keep fullscreen banner override rules after all generic banner height and orientation media queries.
- In fullscreen banner mode, force `#banner-wrapper` to `top: 0`, `height: 100vh`, `min-height: 100vh`, `max-height: none`, and `transform: translateY(0)`.
- Start the fullscreen main content at the fullscreen Banner block size (`100dvh`) and disable its generic `top` transition. Interpolating from a normal responsive Banner height temporarily overlays content on the fullscreen Banner.
- Apply height inheritance to `#banner-carousel`, `.carousel-list`, `.carousel-item`, image wrapper slots, `#banner-single-container`, and images.
- Scope wave positioning to `#header-waves` and restore `#header-waves > svg` to normal in-container sizing when generic `.waves` mobile rules would affect both the outer container and inner svg.

### banner-entry-geometry-feedback

Symptoms:

- Category or post entry scrolling lands at slightly different positions across viewports or Swup visits.
- Scrolling changes Navbar height/state, which then makes a previously measured Banner offset incorrect.
- Browser history returns with `.mobile-main-no-banner`, so the listing layer starts at the Navbar offset and covers the Banner carousel.
- A `top` transition can make a geometry read observe the old content-layer position even after its class is corrected.

Response:

- Keep Navbar behavior explicit in the page interaction policy; only home is `banner-aware`.
- In Banner and Fullscreen modes, use the actual `.page-main-content` region as the only category/post entry target and calculate its document coordinate minus the CSS `scroll-margin` clearance. Do not maintain a separate zero-height anchor or delegate the final coordinate to `scrollIntoView()`.
- Derive Banner retention from the incoming container's page interaction policy, not a transient `window.location.pathname` during content replacement.
- Keep page-entry scrolling and Banner visibility under one runtime owner. The legacy layout client must not add `mobile-main-no-banner` or force an instant top scroll when the incoming container declares `content-start`.
- Keep Hash navigation native. For `popstate`, disable cached/reset scrolling and let the page-level entry routine own the final coordinate.
- Start one Shell-owned eased entry animation after `content:replace` for normal content-page links, and use the same cancellable animation path on first-load direct category/post URLs with a slightly longer duration. Browser history keeps one settled instant correction phase. Disable Swup smooth scrolling and do not add a second `visit:end` correction for the same normal visit.
- Cancel the Shell animation on wheel, touch, pointer, or scroll-navigation key input, and fall back to instant positioning for `prefers-reduced-motion`.
- Never use a fixed `300vh` transition spacer. Capture the previous document height, compensate only a shorter incoming `content-start` page with the exact difference, and release that dynamic Guard with a short height transition after entry positioning settles.
- Keep Grid item intrinsic sizing equal to the fixed `29rem` Card height so `content-visibility: auto` cannot revise the document height as off-screen rows become visible.
- At Shell progress settlement, temporarily suppress the content layer's `top` transition, synchronize its Banner class, force layout, align `.page-main-content` with instant scrolling, then restore the transition on the next frame.
- Publish the progress `idle` state only after this correction so tests and consumers cannot observe an intermediate coordinate.
- Bind lifecycle callbacks to the current `window.swup` instance. A permanent boolean can silently leave callbacks attached to an obsolete instance after route scripts refresh the global instance.
- Keep fixed Shell overlays outside the transformed `#swup-container`. A transformed ancestor becomes the fixed element's containing block during route animation, making the overlay jump between content-relative and viewport-relative coordinates.

## Browser Verification

### playwright-spec-split-concurrency-drift

Pattern:

- Playwright schedules files in parallel. Splitting one large spec into several owner-based files can increase the effective worker count without changing a single assertion.
- The new concurrency can overload the Astro dev server or expose implicit readiness dependencies, producing navigation timeouts, missing globals, or transient missing elements.

Use:

- Compare `playwright test --list` before and after the split so scenario count remains stable.
- Set an explicit `workers` budget that preserves known-safe full-suite concurrency; targeted affected specs still benefit from running fewer files.
- Centralize navigation and preference setup in `tests/support` and wait for the actual contract a test consumes.
- Re-run failing owner specs independently to distinguish a behavior regression from concurrency pressure.
- Do not add retries merely to hide an implicit worker-count change.

### playwright-chromium-mac-sandbox

Pattern:

- `pnpm exec playwright` or direct Playwright launch fails before page navigation with `bootstrap_check_in ... MachPortRendezvousServer ... Permission denied (1100)`.
- The failure happens while launching local Chromium and is a browser process permission issue, not a page, CSS, or Astro runtime assertion failure.

Use:

- Report this as Playwright validation unavailable in the current sandbox, not necessarily unavailable for the task.
- Do not claim browser validation passed.
- Do not use in-app Browser merely because Playwright failed to launch. Browser is allowed only for a predefined visual question that Playwright cannot answer reliably.
- Do not retry from the same restricted process or assume that pointing Playwright at system Chrome removes the process sandbox.
- Do not fall back to agent-controlled Chrome. Resolve required surfaces through [Runtime Requirements](./runtime-requirements.md#capability-resolution), detect actual session availability, then follow the automated lane in [Agent Workflow](./workflow.md#automated-and-regression-lane).
- If no Playwright-capable surface is available, give the developer the exact command to run. Use the developer-operated manual lane only when Playwright cannot express the required check, not merely because it failed to launch.
- Continue non-browser checks such as `pnpm check`, formatting checks, and code inspection independently of the browser result.

### vite-deps-dynamic-import-cache-drift

Pattern:

- Chrome or Playwright Chromium reports `Failed to fetch dynamically imported module` for `/node_modules/.vite/deps/...` while other browsers continue to work.
- The missing module is a Vite-optimized dependency wrapper, often generated from a runtime `import()` in an integration such as `@swup/astro`.
- Restarting one side of the environment may not help if an old dev server remains alive, if a browser tab keeps a stale module URL, or if the Vite dependency cache was rebuilt while the browser still references a previous URL.

Use:

- First check for and stop stale Astro/Vite dev servers on the local dev port before changing app code.
- Re-run the same Playwright scenario on a fresh port to distinguish a code regression from stale dev-server or browser module state.
- In developer-operated Chrome, use a hard reload with DevTools cache disabled, or clear site data for the localhost origin, then reload after starting a fresh dev server.
- If the error persists on a fresh port and clean browser cache, inspect the integration that emits the dynamic import and the current `node_modules/.vite/deps/_metadata.json` before adding application-level error handling.

## Markdown

### md051-emoji-heading-fragments

Pattern:

- markdownlint `MD051` can require fragments that preserve the emoji variation selector for headings containing emoji.

Use:

- Run `markdownlint-cli2` for docs changes that touch links or headings.
- Verify fragments after moving or renaming docs.
