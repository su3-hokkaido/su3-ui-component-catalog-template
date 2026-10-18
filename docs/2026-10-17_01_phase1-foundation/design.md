# Phase 1: Foundation — Design

## Background

`docs/project_plan.md` §14 step 1. Every later phase (Docker, per-product builds, package build,
VRT, CI) depends on a working toolchain and on reference components that demonstrate the
conventions in §10 and §13. The repository currently contains only documentation and Claude Code
configuration.

## Requirements

- pnpm, TypeScript (`strict`), ESLint (flat config), Prettier, Vitest + React Testing Library,
  Storybook (Vite builder), Tailwind CSS v4 are installed and configured.
- Tailwind uses the `uic` prefix and ships no preflight (§10). Colors come only from design tokens;
  dark mode uses the `.dark` class and is switchable from the Storybook toolbar.
- `cn()` (clsx + tailwind-merge, prefix-aware) and cva are available.
- `.storybook/main.ts` selects stories from `src/shared/**` plus `src/products/{PRODUCT_ID}/**`
  (§4.1). `PRODUCT_ID` defaults to `sample`.
- Reference components with component, story, test and export (§3):
  - `src/shared/components/actions/Button` (`Actions/Button`)
  - `src/products/sample/components/buttons/Toggle` (`Buttons/Toggle`), built on the shared Button
- The dependency direction in §3 is enforced by ESLint.
- The conventions in §13 that can be checked mechanically are enforced by a test.
- One command runs every check: `pnpm run ci` (format check, lint, typecheck, unit tests with
  coverage, Storybook build).

## Non-goals

- Docker, compose and the Makefile (Phase 2). Until then commands run on the host with pnpm;
  `make ci` will wrap `pnpm run ci`.
- Building every product, the portal and clean-URL redirects (Phase 3).
- tsup, `exports`, `styles.css` / `theme.css` (Phase 4).
- Playwright VRT (Phase 5), GitHub Actions and Changesets (Phase 6), README (Phase 8).

## Technical approach

### Versions

Latest releases as of 2026-10-17, except where noted:

| Package                                                          | Version           | Note                                                    |
| ---------------------------------------------------------------- | ----------------- | ------------------------------------------------------- |
| Node.js                                                          | 26                | Owner decision. Becomes Active LTS in late October 2026 |
| pnpm                                                             | 12.14.0           | Pinned with `packageManager`                            |
| TypeScript                                                       | 6.0.x             | Not 7.x, see judgment calls                             |
| React / React DOM                                                | 19.3              | `peerDependencies` + `devDependencies`                  |
| Storybook (`@storybook/react-vite`, addons a11y / docs / themes) | 10.6              |                                                         |
| Vite / `@vitejs/plugin-react`                                    | 8.3 / 6.1         |                                                         |
| Tailwind CSS / `@tailwindcss/vite`                               | 4.3               |                                                         |
| Vitest / `@vitest/coverage-v8`                                   | 5.0               | `jsdom` 30                                              |
| Testing Library (react / jest-dom / user-event)                  | 16.3 / 7.0 / 14.6 |                                                         |
| ESLint / typescript-eslint                                       | 10.12 / 8.71      | No `eslint-plugin-jsx-a11y`, see judgment calls         |
| Prettier / `prettier-plugin-tailwindcss`                         | 3.9 / 0.8         |                                                         |
| clsx / tailwind-merge / class-variance-authority                 | 2.1 / 3.7 / 0.7   |                                                         |

### Styling

`src/styles/index.css` imports only Tailwind's theme and utilities layers, both with
`prefix(uic)`, and omits preflight. `@theme` resets the default palette (`--color-*: initial`) and
defines semantic color tokens (`primary`, `primary-foreground`, `surface`, `foreground`, `muted`,
`muted-foreground`, `border`, `ring`). Dark values override the generated, prefixed variables
inside `.dark`. Spacing, radius, font size and font family keep Tailwind's default scales, which
are already token-based.

`src/lib/prefix.ts` exports `CLASS_PREFIX`. `cn()` passes it to `extendTailwindMerge`, and a test
asserts that `src/styles/index.css` uses the same prefix.

### Storybook

- `main.ts` reads `PRODUCT_ID`, fails fast with a clear message if `src/products/{PRODUCT_ID}`
  does not exist, and adds `@tailwindcss/vite` in `viteFinal`.
- `preview.ts` imports the stylesheet, enables autodocs, and uses
  `withThemeByClassName` from `@storybook/addon-themes` to toggle `.dark` on `<html>`.
- `preview.css` (Storybook only, not distributed) sets the canvas background and text color from
  the tokens, because the library ships no page-level styles.

### Linting

`eslint.config.js` combines `@eslint/js`, type-aware `typescript-eslint`, `eslint-plugin-react-hooks`,
`eslint-plugin-storybook`, and `eslint-plugin-import-x`'s `no-restricted-paths`. The zones are
generated from the directories under `src/products/`:

- `src/shared` must not import from `src/products`.
- `src/products/{a}` must not import from `src/products/{b}`.

`eslint-config-prettier` is applied last.

### Tests

- Vitest with `jsdom`. A setup file registers the jest-dom matchers.
- Component tests query by role and label.
- `src/conventions.test.ts` checks every component directory under `src/shared/components` and
  `src/products/*/components`:
  - it contains exactly the four required files;
  - its story file has a `{Category}/{Component}` title that matches the directory names and
    exports `Default`;
  - story titles are unique within each build (shared plus one product);
  - the component is re-exported from its scope's `index.ts`.

## Affected files

- New: `package.json`, `pnpm-lock.yaml`, `.nvmrc`, `tsconfig.json`, `eslint.config.js`,
  `pnpm-workspace.yaml` (`allowBuilds` for esbuild and unrs-resolver), `.prettierrc`,
  `.prettierignore`, `vitest.config.ts`, `.storybook/main.ts`, `.storybook/preview.ts`,
  `.storybook/preview.css`, `src/**`.
- Updated: `docs/project_plan.md` §2 (pnpm pinning, TypeScript, ESLint, Storybook addons).
- Design tokens: initial set defined in `src/styles/index.css`.
- Package `exports`: none yet (Phase 4). `src/index.ts`, `src/shared/index.ts` and
  `src/products/sample/index.ts` are the future entry points.
- Story titles / clean URLs: `Actions/Button` (`/sample/c/actions/button`) and `Buttons/Toggle`
  (`/sample/c/buttons/toggle`, the URL used in §15).
- VRT baselines, README / README_JA: none yet.

## Judgment calls

- **TypeScript 6.0 instead of 7.0.** The latest typescript-eslint declares
  `typescript >=4.8.4 <6.1.0`. TypeScript 7 is the native port, and tools that use the
  TypeScript JS API (typescript-eslint, Storybook's react-docgen) may not work with it yet.
  Revisit once typescript-eslint supports 7.
- **No `eslint-plugin-jsx-a11y`.** Its latest release (2024) supports ESLint 9 at most. The owner
  chose ESLint 10. Accessibility is covered by the Storybook a11y addon and role-based tests.
- **pnpm pinned by `packageManager`, not Corepack alone.** Node.js 25 and later no longer ship
  Corepack. pnpm itself honors the `packageManager` field and switches to that version, which
  covers host usage. The Phase 2 Dockerfile installs Corepack explicitly.
- **Default color palette removed.** Without it, `uic:bg-red-500` simply does not exist, so
  colors can only come from tokens (§13). Other scales stay at Tailwind defaults to avoid
  re-specifying well-designed scales.
- **Color tokens declared with `@theme static`.** Every color token is emitted as a CSS variable
  even when no utility uses it, so tokens are reliably available to the Storybook canvas and to
  consumer styles.
- **pnpm 12 on the host.** pnpm 12 is distributed as a native binary, and pnpm 10's automatic
  version switching cannot install it, so the host pnpm must itself be 12.x
  (`npm i -g pnpm@12.14.0`). pnpm 12 blocks dependency build scripts by default; only esbuild and
  unrs-resolver are allowed in `pnpm-workspace.yaml`.
- **`@storybook/addon-themes` added** to implement the dark-mode toolbar required by §10.
- **Toggle composes the shared Button** to demonstrate the allowed dependency direction
  (products may import `shared`).
