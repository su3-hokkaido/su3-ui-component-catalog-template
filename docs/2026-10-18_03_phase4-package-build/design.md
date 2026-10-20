# Phase 4: Package build, exports and consumer PoC — Design

## Background

`docs/project_plan.md` §14 step 4, implementing §9 (package publishing) and the distribution part
of §10. After Phase 3 the repository builds Storybook per product, but nothing builds the npm
package. Consumers need the components as ESM and CJS with types, one sub-path per product, and
CSS for two setups: projects without Tailwind (`styles.css`) and projects with their own Tailwind
(`theme.css`). §10 also asks for a proof of concept of the consumer-side Tailwind form.

## Requirements

- `make build` writes the package to `dist`: ESM + CJS + `.d.mts` / `.d.cts` for the root entry
  (`src/index.ts`: shared components and `cn`) and for every product, plus `styles.css` and
  `theme.css`.
- `package.json` `exports`: `.`, `./{productId}`, `./styles.css`, `./theme.css`
  (and `./package.json`); `sideEffects: ["**/*.css"]`; `react` / `react-dom` peers and an optional
  `tailwindcss` peer.
- `styles.css` contains only prefixed utilities used by shipped code and the tokens (light and
  dark), and no preflight.
- `make new-product PRODUCT_ID=...` scaffolds a product and its export; `make ci` fails when a
  product directory has no matching export (§9).
- `make ci` builds the package and checks it.
- PoC: the package installs into Vite and Next.js projects with and without Tailwind.

## Non-goals

- Publishing, Changesets, `publishConfig`, Trusted Publishing and the remaining publish metadata
  (`repository`, `homepage`, `bugs`, `keywords`, a real `version`) (Phase 6).
- README / README_JA documentation of the consumer setups (Phase 8; the confirmed form is recorded
  below and in §10).
- VRT (Phase 5).

## Technical approach

### Bundler: tsdown

tsup 9.0.0 (the tool named in §2) states in its README that it is no longer maintained and points
to tsdown. The owner approved tsdown 0.23.1 (exact pin, because it is pre-1.0). `tsdown.config.ts`:

- Entries: `index` (`src/index.ts`) and `products/{productId}` for each directory in
  `src/products` (`scripts/lib/products.ts`), so products build to `dist/products/` and a
  productId can never clash with `index` or a chunk name.
- `format: ['esm', 'cjs']`, `dts: true`, `platform: 'neutral'`, `target: 'es2023'`,
  `fixedExtension: true` (`.mjs` / `.cjs` / `.d.mts` / `.d.cts` regardless of the package type).
- Dependencies and peers stay external (tsdown's default); `react/jsx-runtime` is imported, not
  bundled.
- `clean` is limited to the package output, because `dist/storybook` (Phase 3) shares `dist`.
- `banner: 'use client'` on JavaScript files (not declarations), see the PoC.
- `copy` puts `src/styles/theme.css` in `dist`.
- `exports: false`: tsdown does not write package.json; the map is owned by
  `scripts/lib/package-exports.ts` (below).

### Stylesheets

`src/styles/index.css` is split so that the shipped CSS and Storybook share one token source:

| File          | Role                                                                                                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme.css`   | `@custom-variant dark`, `@theme static` tokens, `.dark` overrides. Shipped unchanged as `dist/theme.css`.                                                                                                              |
| `index.css`   | Storybook entry: layer order, Tailwind `theme.css` / `utilities.css` with `prefix(uic)`, `@import './theme.css'`. Automatic source detection, so stories can use utilities.                                            |
| `package.css` | `styles.css` entry: the same imports with `source(none)` and `@source` on `dist/*.mjs` and `dist/products/*.mjs`, so only shipped code contributes classes. Built by the Tailwind CLI after tsdown (`pnpm run build`). |

`prefix.test.ts` now checks every stylesheet: Tailwind imports carry the prefix, each entry imports
`theme.css`, and overrides use `--uic-*`.

### Exports and product wiring

- `scripts/lib/package-exports.ts`: `entryExport(name)` returns
  `{ import: { types: .d.mts, default: .mjs }, require: { types: .d.cts, default: .cjs } }`;
  `expectedExports(productIds)` returns the full map (root, products sorted, `styles.css`,
  `theme.css`, `package.json`). Top-level `main` / `module` / `types` are kept for older tools.
- `scripts/new-product.ts <productId>` (`make new-product` / `make local-new-product`): validates
  kebab-case, refuses an existing directory, writes `src/products/{productId}/index.ts`
  (`export {};` with a pointer to `/new-component`) and rewrites `exports` from the directory
  list. Storybook, the ESLint dependency zones, the Storybook site build and tsdown already derive
  products from the directories.
- `src/conventions.test.ts`: `package.json` `exports` must equal `expectedExports(products)`, so a
  product added by hand without its export fails `make ci`.
- `files: ["dist", "!dist/storybook"]` keeps the Storybook site out of the tarball.

### Package checks (`pnpm run check:package`, part of `ci`)

1. `publint --strict`.
2. `attw --pack . --profile node16 --exclude-entrypoints ./styles.css ./theme.css`: type
   resolution for node16 (CJS and ESM) and bundler. The node10 profile is skipped because it does
   not support sub-path exports; CSS entries are excluded because attw only resolves JavaScript.
3. `scripts/check-package.ts`: every `exports` target exists; every JavaScript file starts with
   `'use client'` and does not bundle React; `styles.css` has the component utilities, the tokens
   and the dark overrides, no preflight and no unprefixed class selector; `theme.css` has the
   `@theme` block.

### Docker and Makefile

- Dockerfile `build` stage runs `pnpm run build` before the Storybook build (§5).
- Makefile: `build`, `local-build`, `new-product`, `local-new-product` (`PRODUCT_ID` required).

## Consumer PoC (results)

Run in the scratchpad (not committed) against `pnpm pack` of this branch, with Node.js 26.11,
React 19.3.1, Tailwind CSS 4.3.3, Vite 8.3.4 and Next.js 16.4.2 (App Router, Turbopack). The app
renders `Button` from the root and `Toggle` from `/sample`, and uses its own `bg-red-500 p-4`.

| Setup                                                                | Vite  | Next.js | Result                                                                                       |
| -------------------------------------------------------------------- | ----- | ------- | -------------------------------------------------------------------------------------------- |
| No Tailwind, `import 'su3-ui-component-catalog-template/styles.css'` | ok    | ok      | `uic:` utilities, tokens and `.dark` present; no preflight                                   |
| App Tailwind (`@import 'tailwindcss'`) + separate `ui-catalog.css`   | ok    | ok      | Both the app's classes and palette and the library's `uic:` classes and tokens are generated |
| Single file: app Tailwind and the prefixed imports + `theme.css`     | fails | -       | Build succeeds, but `bg-red-500` and `--color-red-500` disappear (see below)                 |

Confirmed consumer form (recorded in §10, documented in README in Phase 8):

```css
/* ui-catalog.css, imported next to the app's own Tailwind entry */
@layer theme, utilities;
@import 'tailwindcss/theme.css' layer(theme) prefix(uic);
@import 'tailwindcss/utilities.css' layer(utilities) prefix(uic) source(none);
@import 'su3-ui-component-catalog-template/theme.css';
@source '../node_modules/su3-ui-component-catalog-template/dist';
```

Findings:

- **Single file does not work.** `theme.css` starts with `--color-*: initial` (the library allows
  only its semantic colors), and in one compile that also removes the consumer's palette. Keeping
  the library in its own entry isolates it. `source(none)` limits that entry to the library's
  files; without it the output was identical (unprefixed classes are ignored under a prefix), so
  it is recommended for build speed and clarity rather than correctness.
- **`'use client'` is required for Next.js.** With it, a server component page imports `Toggle`
  directly and prerenders. Removing it from `dist/products/sample.mjs` fails the build with
  `useState is not a function`.
- Both compiles emit Tailwind's internal `--tw-*` custom properties and `@property` rules. They are
  identical between the two compiles, so the duplication is harmless.

## Affected files

- New: `tsdown.config.ts`, `src/styles/theme.css`, `src/styles/package.css`,
  `scripts/new-product.ts`, `scripts/check-package.ts`, and the tested helpers
  `scripts/lib/package-exports.ts` and `scripts/lib/products.ts`.
- Modified: `package.json` (package metadata, `exports`, scripts, devDependencies),
  `pnpm-lock.yaml`, `pnpm-workspace.yaml` (`@parcel/watcher: false`), `src/styles/index.css`,
  `src/styles/prefix.test.ts`, `src/lib/prefix.ts` (comment), `src/conventions.test.ts`,
  `scripts/build-storybook-all.ts` (shared product listing), `Dockerfile`, `Makefile`,
  `docs/project_plan.md` (§2, §3, §6, §9, §10, §14, §17), `CLAUDE.md`, `.claude/agents/component-reviewer.md`,
  `.claude/skills/new-task/SKILL.md`, `.claude/skills/new-component/SKILL.md` (tokens now live in
  `theme.css`; tsdown).
- Design tokens: moved to `theme.css` unchanged. Story titles, clean URLs and VRT: unaffected.
  README: Phase 8.

## Judgment calls not covered by project_plan.md

- **tsdown instead of tsup** (owner decision; see above).
- **`exports` written by our script, not by tsdown's `exports` option.** tsdown can generate the
  map, but then its shape would change with tsdown versions and `package.json` would be rewritten
  on every build. A tested helper keeps the map stable and lets the conventions test compare it.
- **`new-product.ts` instead of `new-product.sh`**, for the same reasons as Phase 3's build
  script (JSON editing, shared validation with the other scripts).
- **`'use client'` banner on every JavaScript file.** All components are client components (they
  take event handlers, and some use state). Without the directive, App Router users would have
  to wrap every import.
- **`styles.css` scans the built JavaScript instead of `src`**, so the shipped CSS matches the
  shipped code exactly.
- **`tailwindcss` peer range `^4.3.0`**: the PoC verified 4.3.3 only, so the range starts at the
  tested minor. It only produces a warning on older versions.
- **`@parcel/watcher` build script denied** (`allowBuilds: false`): it comes with
  `@tailwindcss/cli` for `--watch` and only compiles from source when no prebuilt binary exists.
- **Open item for Phase 6 (before the first publish):** `engines.node` (`>=26 <27`) is in the
  published `package.json`, so consumers on other Node.js versions would get engine warnings (or
  errors with `engine-strict`) although the components do not depend on Node.js. Options: move the
  development constraint to `devEngines`, or widen `engines`. To decide with the owner.
