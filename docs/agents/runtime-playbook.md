# Runtime Playbook

This playbook records known runtime and tooling pitfalls for this repository. Check it before running commands that touch the same area.

## Shell

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
pnpm --store-dir /Users/whynotsnow/Library/pnpm/store/v10 add -D <package>
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
- Apply height inheritance to `#banner-carousel`, `.carousel-list`, `.carousel-item`, image wrapper slots, `#banner-single-container`, and images.
- Scope wave positioning to `#header-waves` and restore `#header-waves > svg` to normal in-container sizing when generic `.waves` mobile rules would affect both the outer container and inner svg.

## Browser Verification

### playwright-chromium-mac-sandbox

Pattern:

- `pnpm exec playwright` or direct Playwright launch fails before page navigation with `bootstrap_check_in ... MachPortRendezvousServer ... Permission denied (1100)`.
- The failure happens while launching local Chromium and is a browser process permission issue, not a page, CSS, or Astro runtime assertion failure.

Use:

- Report this as UI validation unavailable in the current sandbox, not necessarily unavailable for the task.
- Do not claim browser validation passed.
- Do not replace it with in-app Browser localhost validation; project policy reserves Browser for documentation/API lookup only.
- Do not retry from the same restricted process or assume that pointing Playwright at system Chrome removes the process sandbox.
- Detect external execution surfaces in [Runtime Capabilities](./runtime-capabilities.md#capability-detection), then follow the automated lane in [Agent Workflow](./workflow.md#automated-and-regression-lane).
- Continue non-browser checks such as `pnpm check`, formatting checks, and code inspection independently of the browser result.

## Markdown

### md051-emoji-heading-fragments

Pattern:

- markdownlint `MD051` can require fragments that preserve the emoji variation selector for headings containing emoji.

Use:

- Run `markdownlint-cli2` for docs changes that touch links or headings.
- Verify fragments after moving or renaming docs.
