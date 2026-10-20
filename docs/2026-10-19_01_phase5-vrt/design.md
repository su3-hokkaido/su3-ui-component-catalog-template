# Phase 5: Playwright visual regression test — Design

## Background

`docs/project_plan.md` §14 step 5, implementing §11 together with the `vrt` service (§5) and
`make vrt` / `make vrt-update` (§6). After Phase 4 the repository builds every product's Storybook
into `dist/storybook/{productId}` and the npm package, but nothing checks how components render.
Running the suite in GitHub Actions is Phase 6.

## Requirements

- Playwright `toHaveScreenshot` against the built Storybook (the output of
  `pnpm run build-storybook:all`, which `make preview` also serves).
- Stories are enumerated from Storybook's `index.json`; adding a story needs no test code.
- Per-story settings in `parameters.vrt`: `disable` and `viewports`.
- Chromium only, desktop and mobile viewports, light and dark themes, animations disabled, fonts
  loaded before capture.
- Runs in the official Playwright image, pinned to `linux/amd64`, whose tag matches
  `@playwright/test` exactly. Baselines are committed.

## Non-goals

- The `vrt.yml` workflow and the diff-report artifact (Phase 6).
- README / README_JA description of the baseline review process (Phase 8).
- Other browsers, interaction states driven by the test, per-story thresholds.

## Technical approach

### Runner image and service

- Dockerfile stage `vrt`: `FROM mcr.microsoft.com/playwright:v1.64.1-noble`. It installs only
  `@playwright/test`, at the exact version read from `package.json`, into `/app/node_modules`, and
  runs as `pwuser` (uid 1001, the GitHub Actions runner uid). The full project is not installed:
  the image ships Node.js 24, which does not satisfy `engines.node`, and the suite needs nothing
  else.
- compose service `vrt` (profile `vrt`, `platform: linux/amd64`) bind-mounts only what the suite
  reads or writes: `package.json` (`"type": "module"`), `playwright.config.ts`, `tests/vrt`
  (baselines are written here), `dist/storybook` (read-only), `test-results` and
  `playwright-report`. Mounting the whole repository would hide the image's `node_modules`.
- `src/conventions.test.ts` checks that the image tag equals `devDependencies['@playwright/test']`,
  so they are bumped together.

### Makefile

- `make vrt`: rebuild every Storybook in the dev image (`pnpm run build-storybook:all`, Node.js 26,
  native architecture), then `docker compose --profile vrt run --rm --build vrt`.
- `make vrt-update`: the same with `--update-snapshots=changed` (writes missing baselines and
  rewrites only the ones that differ).
- There is no `local-vrt`: rendering must come from the image (§11).

### Suite (`tests/vrt/`)

- `stories.ts`: pure helpers covered by Vitest (no Playwright import).
  - `collectVrtStories`: `type: 'story'` entries of every `dist/storybook/{productId}/index.json`.
    `src/shared` stories are in every product's build, so they are captured once, from the first
    product (baseline directory `shared`); product stories go under `{productId}`.
  - `parseVrtParameters`: validates `parameters.vrt` (`{ disable?: boolean; viewports?:
('desktop' | 'mobile')[] }`) and throws on unknown keys or values, so a typo cannot silently
    skip or capture a story.
  - `snapshotName` / `expectedSnapshots`: baseline paths.
- `stories.spec.ts`: one test per story and theme, in each viewport project.
  - The built files are served from disk with `context.route` under a fixed origin, so no web
    server process is needed.
  - Opens `{productId}/iframe.html?id={storyId}&viewMode=story&globals=theme:{theme}` (the
    `@storybook/addon-themes` global toggles `.dark`), waits until
    `__STORYBOOK_PREVIEW__.currentRender.phase` is `finished` (fails on `errored` / `aborted` and
    on Storybook's error display), then waits for `document.fonts.ready`.
  - Reads `parameters.vrt` from the rendered story (index.json has no parameters), skips the test
    when disabled or when the project is not in `viewports`, then
    `toHaveScreenshot([scope, '{storyId}-{theme}.png'], { fullPage: true })`.
  - "has no baseline without a story" fails when a baseline file belongs to no story (a removed or
    renamed story), listing the files to delete.
- `playwright.config.ts`: projects `desktop` (`devices['Desktop Chrome']`, 1280x720) and `mobile`
  (`devices['Pixel 7']`, 412x839 CSS pixels; screenshots use CSS scale); snapshot path
  `tests/vrt/__screenshots__/{project}/{scope}/{storyId}-{theme}.png` without a platform suffix
  (always Linux); `animations: 'disabled'`, `caret: 'hide'`; reporters `list` and `html`.
- Wiring: `tsconfig.json` includes `tests`; Vitest runs `tests/vrt/**/*.test.ts` and covers
  `tests/vrt/stories.ts`.

## Verification (results)

Run on Apple Silicon (Docker Desktop, amd64 through Rosetta) with Playwright 1.64.1:

- `make vrt-update` created 36 baselines (9 stories x 2 themes x 2 viewports; 232 KB); 38 tests
  including the two orphan checks.
- `make vrt` then passed on both clean runs (about 90 s each, of which 1.2 min is the suite). The
  first run of the image took about 16 minutes because Rosetta translates the binaries once.
- With temporary edits (reverted afterwards):
  - changing the light `--color-primary` failed exactly the light stories that use it, in both
    viewports, with diff images in `playwright-report`;
  - `parameters: { vrt: { disable: true } }` skipped the story in both viewports and
    `viewports: ['desktop']` skipped it on mobile;
  - a stray baseline file failed "has no baseline without a story" for that viewport.

## Affected files

- New: `playwright.config.ts`, `tests/vrt/stories.ts`, `tests/vrt/stories.test.ts`,
  `tests/vrt/stories.spec.ts`, `tests/vrt/__screenshots__/**` (36 baselines).
- Modified: `package.json` / `pnpm-lock.yaml` (`@playwright/test` 1.64.1), `Dockerfile`,
  `compose.yaml`, `Makefile`, `tsconfig.json`, `vitest.config.ts`, `src/conventions.test.ts`,
  `docs/project_plan.md` (§3, §5, §11, §17), `CLAUDE.md`, `.claude/agents/component-reviewer.md`.
  `/new-component` already runs `make vrt-update`, and §6 already lists the targets.
- Design tokens, package `exports`, story titles and clean URLs: unaffected. README: Phase 8.

## Judgment calls not covered by project_plan.md

- **Only `@playwright/test` in the runner image**, because the image's Node.js 24 does not satisfy
  `engines.node` (`>=26 <27`) and the suite needs no other dependency. Storybook is built in the
  dev image first.
- **Files served by request routing instead of a web server**: no port, no extra dependency, and
  the served files are exactly the build output.
- **Shared stories captured once**, from the first product, because every product's build contains
  the same shared stories with the same CSS.
- **Reading `__STORYBOOK_PREVIEW__.currentRender`**, an internal of Storybook 10, for render
  completion and parameters. Storybook has no public API for either from outside the preview; the
  access is in one function, and a Storybook upgrade that changes it fails the suite loudly.
- **Viewports**: `Desktop Chrome` and `Pixel 7` device profiles; full-page screenshots.
- **Orphan-baseline test**, so removed stories do not leave stale images in git. It works from
  `index.json`, so baselines of a story or viewport later excluded with `parameters.vrt` must be
  deleted by hand (CLAUDE.md says so).
- **The runner is `pwuser` (uid 1001)**, the GitHub Actions runner uid, so baselines and reports
  written to bind mounts belong to the checkout user in CI. Docker Desktop maps ownership on
  macOS and Windows; on a Linux host whose uid is not 1001, `tests/vrt` must be writable by uid
  1001 for `make vrt-update`. The Makefile creates `test-results` and `playwright-report` first so
  that Docker does not create them as root.
- **The `vrt` stage comes before `preview`** in the Dockerfile, so a build without `--target`
  still produces the preview image.
- **`--update-snapshots=changed`** for `make vrt-update`, so unchanged baselines are not rewritten.
