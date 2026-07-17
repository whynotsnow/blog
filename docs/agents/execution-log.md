# Execution Log

This log records completed AI-assisted work only when it teaches the project something reusable.

Keep entries short. Link to `memory.json`, `failure-index.md`, or `runtime-playbook.md` when a task discovers or reuses a pattern.

## 2026-07-04

### Added Agent Workspace Spec documentation layer

- Added persistent agent memory, runtime playbook, failure index, and this execution log.
- Updated workflow rules so future agents check memory and known pitfalls before non-trivial work.
- Reused known package-manager failure pattern: pnpm 11 can ignore the project `pnpm` field and fail before scripts run.
- Risk: memory can become stale if agents do not update it after new recurring failures.

## 2026-07-06

### Fixed Playwright config Node globals typing

- Added `@types/node` as a direct dev dependency so `playwright.config.ts` can type `process.env` under pnpm's isolated dependency layout.
- Recorded `pnpm-store-location-mismatch` after dependency install hit `ERR_PNPM_UNEXPECTED_STORE` when `.codex/env-setup.sh` selected a different store than the existing `node_modules`.

## 2026-07-10

### Fixed fullscreen banner viewport sizing

- Recorded `fullscreen-banner-responsive-override`: fullscreen banner rules must be final overrides because later responsive height media queries can reset `#banner-wrapper` below `100vh`.
- Recorded `playwright-chromium-mac-sandbox`: local Chromium launch can fail with `MachPortRendezvousServer Permission denied (1100)` before localhost validation starts.

### Added sandbox-to-host browser validation routing

- Added a runtime capability matrix that separates the Codex command sandbox, host Terminal, controlled Chrome, CI, and user-operated fallbacks.
- Changed the known Playwright Mach port response from immediate validation-gap reporting to capability-aware re-routing.
- Kept Computer Use as command transport only; successful Chrome or Playwright execution remains the source of browser validation truth.

### Consolidated browser validation policy

- Made `workflow.md` the single source of truth for tool routing and split failure handling into manual and automated lanes.
- Limited `runtime-capabilities.md` to environment facts and per-session capability detection.
- Removed the circular Chrome-to-Playwright-to-Chrome fallback and linked failure records to the canonical policy.

### Added the public/private Agent Workspace Spec boundary

- Made `docs/agents/` the sanitized, version-controlled public knowledge layer.
- Added ignored local, raw, and quarantine storage for identity, machine state, unfiltered output, and unreviewed memory.
- Added a disclosure policy and a pre-commit check for private directories, user-home paths, private keys, and credential-bearing URLs.

### Added team-aware local profiles

- Added locally salted Git identity matching with opaque developer, machine, and session IDs.
- Separated public runtime requirements from private machine and session capability state.
- Added schemas, public examples, and profile commands for initialization, identity linking, runtime refresh, and session creation.

### Adopted Agent Workspace Spec 0.1.0

- Replaced the Agent OS working name with Agent Workspace Spec and separated the normative spec from its local implementation state.
- Added a versioned manifest, normative requirements, conformance levels, schemas, examples, and a reference validator.
- Migrated ignored local profiles to `.agent-workspace/local/` without exposing identity or runtime state.

### Prepared the tooling boundary for Skill extraction

- Consolidated profile, disclosure, and conformance commands behind one manifest-declared CLI entry.
- Moved reference tooling under `.agent-workspace/tools/` and removed required package-manager aliases.
- Added upward workspace discovery so a future Skill can invoke the CLI from nested project directories.

### Formalized the Skill operator boundary

- Defined `.agent-workspace/tools/` as the workspace-local implementation layer rather than the future Skill implementation.
- Required Skills, hooks, CI, and maintainers to prefer the manifest-declared tooling entry.
- Added manifest schema coverage and repository-relative tooling path validation.

### Extracted the Agent Workspace Skill

- Created a reusable Agent Workspace Skill as an external operator for Agent Workspace Spec repositories.
- Kept this repository's `.agent-workspace/tools/` as the project-local implementation rather than moving project-specific validation into the Skill.
- Forward-tested the Skill against both this repository and a minimal temporary workspace.

## 2026-07-11

### Restricted Chrome to developer-operated validation

- Prohibited agents from using controlled Chrome for debugging, inspection, or validation.
- Established Playwright as the primary agent-operated browser validation tool, with static checks and existing tests preferred first.
- Added a required manual Chrome guide for browser questions that Playwright cannot answer and removed controlled Chrome from sandbox fallback guidance.

### Added budgeted in-app Browser visual review

- Allowed the in-app Browser only after Playwright cannot reliably answer one predefined visual question.
- Limited the default review to one route, one viewport, one navigation, and one screenshot or page-state inspection.
- Kept Playwright launch failures on the Playwright execution lane and retained developer-operated Chrome as the final manual fallback.

### Decoupled page layout from Widget placement

- Replaced the mutable global `WidgetManager` with explicit viewport/region Widget placement presets and pure resolvers.
- Added page layout policies: ordinary pages default to switchable `three-column`, while post detail pages are fixed to `content-right`.
- Moved the complete Main Grid, page Widgets, Footer, and page TOC into the Swup replacement boundary while preserving the existing Banner and persistent Music Player/Pio boundary.
- Removed cross-viewport Widget migration and the historical mobile `drawer` abstraction; empty regions remain valid configuration outcomes.
- Updated the Swup container selector from the inner `main` element to `#swup-container`, ensuring route-specific Main Grid policies and Widget regions are replaced together during navigation.
- Made `#swup-container` the route-level crossfade owner and reduced nested content/Widget movement so three-column to two-column navigation no longer exposes an abrupt grid swap.
- Unified banner mode at the home-page height on every route, including matching carousel geometry, Main Grid offset, navbar threshold, and TOC threshold.

## 2026-07-13

### Replaced the announcement Widget with a shell-level site notice

- Moved the site notice out of viewport-specific Widget placement and into the Main Content Shell before the page Grid.
- Added reusable Semantic status accents while keeping notice Surface composition and dismissal behavior feature-local.
- Versioned dismissal state by notice ID so a newly published notice is not hidden by an older dismissal.
- Made the sticky Widget smoke check scroll to the target threshold instead of depending on a fixed document offset, which changes when shell-level content is added.

## 2026-07-14

### Made Supporting Row flow a Page Layout Policy decision

- Added explicit `stack`, `two-column`, and `auto-grid` Supporting Widget flow strategies without coupling page geometry to Widget inventory.
- Kept Widget Card container queries responsible for Profile and Site Stats internal presentation after the Page Layout Policy assigns Slot width.

### Renamed the responsive Widget region by responsibility

- Replaced the endpoint-specific `tablet.sidebar` placement and `.tablet-sidebar-region` selector with `supporting.beforeContent` and `.supporting-region`.
- Kept legacy viewport and Container Shell geometry unchanged while making the shared region name describe its role instead of a device class.

### Separated Shell Strategy from view preferences

- Renamed the page-level responsive contract to `ResponsiveShellStrategy` and the post renderer contract to `PostListViewMode`.
- Stopped Post List View changes and legacy `postListLayout` storage from writing or implying Desktop Page Layout Preference.
- Removed unused Tablet and Mobile fields from Page Layout Policy so every remaining field has an active renderer consumer.

### Replaced viewport listing breakpoints with layered Container Queries

- Added named Page Shell, post Feed, and Widget Card containers so each layer responds to its actual available width.
- Made post columns fluid; the later width-budget state machine now owns Card maxima and Sidebar transition points.
- Kept Banner geometry viewport- and mode-owned while making its inner typography fluid.

### Unified Wide Navbar, content, and Sidebar geometry

- Kept Banner viewport-wide while reducing Navbar and Main Shell to `1480px`.
- Rebased the state machine on smaller Cards and gaps: `1400px` for three Cards + Sidebar, `1024px` for two Cards + Sidebar, and `736px` for the no-Sidebar composition.
- Bound Sidebar visibility to the same `608px` minimum used by the two-column Feed, eliminating the one-Card + Sidebar boundary state.

### Removed responsive compatibility overlap from content pages

- Fixed a selector-specificity leak that left Tablet Supporting Row Widgets visible below the Desktop Sidebar after the Shell crossed `880px`.
- Aligned the Supporting Row transition with the Feed's `608px` minimum and added negative visibility assertions for inactive Widget regions.
- Disabled legacy root-font `pageScaling` on `container-content` pages, including cleanup when navigating from a legacy page, so the 1280/1281 viewport boundary cannot resize rem-based UI independently from px Shell budgets.
- Isolated viewport Grid rules in `page-grid-legacy.css`, scoped them away from `container-content`, and removed unused mobile layout selectors, a redundant Feed query, a no-op post-detail media block, and the unreferenced legacy `PostPage.astro`.
- Rebased the post Sidebar TOC rail on `--width-shell-wide` and moved category/post-detail internal responsive behavior to their owning containers.
- Tightened the legacy page width from `90rem` to `86rem`, reduced the Container Shell to `1400px`, and rebased multi-column Feed maxima so article Cards top out near `344px` without changing the established state boundaries.
- Moved the three-column transition to a `1200px` Shell so surplus width is reused earlier instead of accumulating as large centered margin.
- Unified the Navbar, Container Shell, and three-column Main Grid on a `1352px` outer maximum, moving the responsive safe gutter outside the Shell so its declared width matches its usable layout width.

### Split home and category listing compositions

- Added a fixed listing layout policy with responsive one-, two-, and three-column post grids plus explicit home and category Widget placements.
- Made home a six-post section-based guide while category pages use independent twelve-post Astro/Svelte pagination.
- Kept category URL, history, Tag filtering, and client pagination behavior beside the category components instead of adding another `src/features` module.
- Expanded home into three six-post guide sections and normalized Grid Cards with fixed geometry plus a semantic fallback cover.

### Decoupled content-page entry scrolling from Banner geometry

- Made home the only `banner-aware` Navbar page while category and post detail keep a persistent `fixed-visible` Navbar.
- Replaced live Banner rectangle measurement and the extra zero-height entry anchor with direct `.page-main-content` alignment plus CSS scroll clearance in both Banner and Fullscreen modes.
- Preserved native Hash scrolling while applying the page-level content-entry contract to both normal and browser-history Banner-mode visits.
- Added a persistent Shell navigation progress indicator with a minimum visible duration, without coupling it to entry positioning or hydration completion.
- Rebound page lifecycle hooks by Swup instance and moved normal/history entry positioning into one page-owned coordinate routine.
- Fixed history-only Banner overlap by deriving Banner retention from the incoming interaction policy, suppressing the stale content-layer `top` transition during settled geometry synchronization, and publishing progress idle only after exact alignment.
- Removed duplicate category scrolling by excluding `content-start` pages from the legacy layout client's instant top reset; normal links now use one smooth entry scroll while history keeps one settled instant correction.
- Replaced browser-native smooth behavior with a cancellable `380ms` Shell animation starting after content replacement, leaving Swup smooth scrolling disabled and preserving reduced-motion behavior.
- Replaced the fixed `300vh` transition extender with an exact previous/new scroll-height Guard and aligned Grid intrinsic sizing with the fixed Card height to prevent scrollbar thumb jumps.
- Stabilized the fixed Site Notice viewport so notice rotation no longer performs post-load height writes; confirmed that the fixed notice does not change document scroll height.
- Moved the fixed Site Notice into its own non-animated Swup replacement container so route transforms cannot change its containing block or loading position.
- Repositioned the Site Notice as a viewport-right, single-line status card below interactive overlay layers, with safe full-width margins on Mobile.
- Restored fullscreen Banner flow geometry by starting Main Content at `100dvh` and removing the transient `top` interpolation that exposed content over the Banner.

## 2026-07-15

### Replaced the generic Widget system with page-owned modules

- Moved site statistics into the Footer and derived totals from content-store metadata instead of rescanning post bodies.
- Grouped Calendar, taxonomy, Profile, navigation, music, Pio, and post TOC components under their owning domains; retained `PanelCard` only as a visual container.
- Removed the Widget registry, placement presets, region resolver, duplicate responsive instances, and obsolete configuration aggregation.
- Made Archive own Calendar and taxonomy panels in its main flow, and made Home the only page that supplies one Profile support node.
- Changed category and post-detail layouts to content-only compositions while preserving Container Query feed widths and Swup replacement behavior.
- Verified the final code architecture with Astro diagnostics, type checks, production build, Design boundary checks, and the complete home smoke suite.
## 2026-07-15

### Replaced blanket validation with impact-based testing

- Split the monolithic Playwright regression into smoke, Shell, Feature, and Contract owners while preserving the 32-scenario inventory.
- Added fast Unit and Integration layers plus independent test TypeScript validation.
- Added a versioned impact map with conservative full-regression fallback for unknown runtime paths.
- Made pre-commit select staged static gates and made pull request and ordinary `main` push CI select Quality, Fast, Browser, and Build jobs, while scheduled and manual runs retain full regression.
- Preserved an explicit two-worker Playwright budget after learning that spec-file splits otherwise increase effective concurrency.

## 2026-07-16

### Scoped shared Shell compensation to container-content

- Kept `rem` as the type and spacing unit while replacing removed root scaling with Feature-owned Banner, Navbar, and Footer tokens.
- Made the `container-content` layout strategy the automatic compensation boundary so future consumers inherit the same shared Shell behavior without route-specific handling.
- Limited the first compensation pass to Typography and internal Spacing above `1280px` in Desktop Landscape, returning to default values at `2000px` without depending on input-device media reporting.
- Preserved viewport-based Banner geometry, Main Grid and shared component widths, Card dimensions, Container Query thresholds, Navbar control heights, and post TOC behavior for later layout-specific work.
- Added a shared Navbar Shell height and clearance contract for outer height, Main Content offset, Page Entry alignment, Site Notice positioning, and runtime Banner thresholds while preserving the `44px` Navigation targets.

### Refined Banner and Navbar responsive interaction

- Kept the existing Page Shell and entry-scroll policies while moving carousel runtime ownership beside the Banner component.
- Added restrained Ken Burns and Crossfade motion with hover, touch, visibility, viewport-change, and reduced-motion handling.
- Replaced duplicate Navbar appearance styles with one Semantic-token-driven state sheet and responsive blur budgets.
- Added stable mobile viewport sizing, low-height landscape wave bounds, Safe Area padding, and a text-owned Banner contrast gradient.
- Reduced initial carousel requests by keeping later frames inert until needed and using one responsive `picture` per materialized slide.
- Learned that a non-interactive visual overlay must not intercept pointer events when the underlying Banner owns hover interaction; the Shell E2E contract now covers that boundary.

### Integrated Music Player with Floating Tools

- Kept Audio and playlist ownership inside the existing Music Player while adding a narrow command/state event contract for the Floating Tools entry.
- Hid the Mini Player until first playback, then kept it available after pause while the Music entry continued to open the full control panel.
- Moved the Floating Tools shell outside the animated Main Content Layer so fixed overlays use the viewport as their containing block.
- Replaced the invalid Astro-style `class:list` usage in the Svelte Settings Panel with a real feature class binding; this restored the viewport-bounded desktop popover and mobile bottom sheet styles.
- Added browser contracts for initial music visibility, first playback, persistent paused controls, viewport-safe Settings geometry, panel avoidance, and local Shell icons.

### Refined hidden Music Player feedback

- Made the hidden control use the first loaded playlist cover and reserve its Theme-aware gradient icon treatment for missing playlists or failed cover requests.
- Changed the ambiguous left mode control into an explicit Sequential/Shuffle toggle with distinct icons, pressed state, and feedback even for a one-song playlist.
- Added browser coverage for cover-backed hidden controls, fallback rendering, and the playback-order state transition.

### Unified the expanded Music Player surface

- Rebuilt the expanded controls as a compact Semantic-token surface while preserving the existing Floating Tools command and playback-state model.
- Attached Playlist above the controls inside the same Surface so layout avoidance covers the complete player instead of two independent overlays.
- Added coordinated Floating Tools position, loading, playing, and persistent-state transitions with a reduced-motion fallback.
- Placed Floating Tools and Music Player in one fixed Flex layout so browser layout preserves their gap during panel and Playlist transitions without timing-sensitive position interpolation or observation.
- Made the hidden fallback the initial Music Player state, with a rotating note for Playlist loading, first-cover promotion on success, and a static fallback on failure.
- Increased the no-Playlist panel clearance and replaced generic Floating Tools glyphs with local icons that represent Widgets, Display Settings, TOC, and Pio visibility.
- Consolidated Music visibility into Hidden, Expanded, and Mini states with one Fly/Fade transition contract and outside-click/default-state recovery, eliminating empty bottom-right UI states.
- Restricted the first Display Settings entrance to opacity and subtle vertical transform so runtime positioning variables never animate across the viewport.
- Gave the Hidden and Mini Music states stable outer dimensions and one bottom-right shared-container anchor; fixed-size content is clipped through synchronized width, height, and radius interpolation so it never reflows into a staged reveal.

### Refined Hidden and Mini Music transitions

- Replaced the subtle Hidden/Mini crossfade with a bottom-right capsule morph and staged Mini controls, metadata, and cover entrance.
- Made an activated Hidden fallback restore the Mini Player directly while preserving the pre-playback path to the Expanded Player and the Floating Tools command path.
- Added a shared-element handoff in which the Hidden orb travels to the Mini cover position before the real cover takes over, with reduced-motion and intermediate-frame browser coverage.
- Isolated browser validation on a fresh Playwright port when an existing developer preview server exposed stale client-island state; the fresh server passed the complete Floating Tools feature suite.

### Completed Footer spacing compensation

- Kept Banner viewport geometry and Footer width unchanged while moving the remaining Footer Stats and Meta spacing behind Footer-local compensation tokens.
- Preserved content-driven Footer height and added cross-page Shell assertions for compensated spacing and invariant Banner height.

### Compensated Post Card vertical geometry

- Restored the Desktop Landscape density of shared Astro and Svelte Grid Cards through Post List-local height, cover-boundary, typography, and spacing tokens.
- Kept Feed widths, Container Query breakpoints, and the `56.25cqi` cover ratio unchanged while binding intrinsic placeholders to the compensated Card height.
- Made browser geometry assertions consume computed layout sizes so Card entrance transforms cannot masquerade as width or height contract changes.

### Unified Post Card renderer structure

- Aligned Astro and Svelte Cards on the core `UIPost` contract and the same Title, Card Meta, Summary, Tags, and Cover regions without changing Feed or Shell width budgets.
- Isolated listing Metadata from the post-detail renderer and moved shared Grid/List Card geometry out of renderer utility classes into the Post List feature stylesheet.
- Added cross-renderer browser assertions for the shared semantic structure and Metadata geometry.

### Stabilized Post Card content density

- Removed the global `14px` to `16px` root-font jump at the Tailwind `768px` boundary and kept the root at the browser-standard `16px` across listing viewports.
- Fixed Grid Card Typography independently from viewport compensation, reduced Title and Summary to one and two reserved lines, and moved the Pinned state onto the Cover.
- Kept one Meta row with localized compact word counts and capped Tags at six source items plus two fitted visual rows without changing Feed, Shell, or Container Query width budgets.

### Contracted the shared Shell around validated Card widths

- Established `296px` as the safe Grid Card minimum and about `320px` as the preferred width after Chinese-first Meta, English overflow, and six-Tag pressure checks.
- Contracted the shared Navbar and Main Shell maximum from `1352px` to `1280px`, the three-column Feed to `992px`, and the two-column Feed to `656px` while preserving the `248px–272px` Profile support range.
- Retained the `608px`, `932px`, `880px`, and `1200px` Container Query boundaries because boundary geometry still maps directly to the validated Card, Feed, gap, and Sidebar minimum budgets.

## 2026-07-17

### Stabilized Post Card height by Feed density

- Replaced fixed Grid Card heights with natural Cover-plus-Content geometry so a narrower Cover no longer transfers unused height into the text region.
- Kept approximate `28rem` single-column and `25rem` multi-column intrinsic placeholders for `content-visibility` without treating them as rendered height contracts.
- Kept fixed Title, Meta, two-line Summary, and two-line Tag slots, but removed the Tag slot's automatic top margin and duplicate top padding so one section gap owns the transition from Summary to Tags.
- Kept the Tag region limited to two rows without its own trailing inset, while preserving the Content bottom padding, Card-width-driven cover geometry, and intrinsic placeholders.

### Unified the category filter across Astro fallback and Svelte Tag mode

- Kept one Svelte-owned Category Filter and stable Page Content Shell while preserving the Astro Post Grid and Pagination as the unfiltered SSR fallback.
- Limited Tag-mode hydration updates to the filtered Post List, Pagination, active Tag, and result count instead of replacing the Filter with a legacy Taxonomy renderer.
- Removed the duplicate legacy-token Taxonomy component and added browser coverage for desktop geometry, Semantic Surface usage, active Tag state, and Mobile collapse behavior.
