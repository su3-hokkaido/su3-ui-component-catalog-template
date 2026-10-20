[Japanese is here](./README_JA.md)

# su3-ui-component-catalog-template

A Storybook-based UI component catalog template: React + TypeScript components styled with
Tailwind CSS v4, a Storybook per product deployed to Cloudflare Pages, visual regression tests in
Docker, and an npm package published with Changesets.

Fork it or use it as a GitHub template to start a component catalog for a new organization. It
works as is: the sample components are built, tested, deployed and published.

- One Storybook per product (`productId`), with shared components in every build and a portal page
  listing the products.
- Short URLs to any component: `/{productId}/c/{category}/{component}`.
- Components prefixed with `uic:`, so they never collide with the consumer's own Tailwind CSS or
  styles; shipped as prebuilt CSS or as design tokens for the consumer's Tailwind.
- Docker-first development through `make`, with the same checks locally and in CI.
- Playwright visual regression tests of every story, in light and dark themes, on desktop and
  mobile.

## Tech stack

| Area                   | Tool                                                                         |
| ---------------------- | ---------------------------------------------------------------------------- |
| UI                     | React 19, TypeScript 6 (`strict`)                                            |
| Styling                | Tailwind CSS 4 (CSS-first `@theme` tokens, prefix `uic`, no preflight), cva  |
| Catalog                | Storybook 10 (Vite builder; a11y, docs and themes addons)                    |
| Unit tests             | Vitest + React Testing Library (jsdom)                                       |
| Visual regression test | Playwright in the official Docker image (`linux/amd64`)                      |
| Lint / format          | ESLint 10 (flat config), Prettier                                            |
| Library build          | tsdown (ESM + CJS + type declarations), Tailwind CLI for `styles.css`        |
| Runtime / packages     | Node.js 26 (`.nvmrc`, `devEngines`), pnpm 12 (`packageManager`)              |
| Environment            | Docker + docker compose, Makefile                                            |
| Deploy                 | Cloudflare Pages (direct upload with Wrangler from GitHub Actions)           |
| Release                | Changesets, GitHub Releases, npm Trusted Publishing                          |
| Secrets                | AWS Secrets Manager (source of truth), optionally pushed to Cloudflare Pages |

## Quick start

Requirements: Docker (Docker Desktop on macOS and Windows) and `make`. Node.js is not needed on the
host. The AWS CLI v2 is needed only for the secrets commands.

```sh
make setup   # copy .env.*.sample, build the image, install dependencies
make dev     # Storybook for PRODUCT_ID=sample at http://localhost:5070
```

Other everyday commands:

```sh
make dev PRODUCT_ID=sample   # Storybook for one product (default: sample)
make preview                 # every product, built and served by nginx at http://localhost:5071
make ci                      # the checks CI runs: format, lint, types, tests, builds
make vrt                     # visual regression test in the Playwright image
```

Ports and the default product are set in `.env.docker` (`DEV_PORT`, `PREVIEW_PORT`,
`PRODUCT_ID`). With Node.js 26 and pnpm on the host, most commands also have a `local-` variant
(for example `make local-dev`; `make help` lists them). The VRT always runs in Docker.

## Project structure

```
.
├── .changeset/          # pending changesets and the Changesets config
├── .github/             # workflows (CI, VRT, deploy, release), setup action, templates
├── .storybook/          # Storybook config; PRODUCT_ID selects the stories
├── deploy/
│   ├── cloudflare/      # _redirects (clean URLs) and deploy.sh
│   ├── local/           # nginx.conf for make preview (same rules as Cloudflare)
│   ├── aws/             # notes for S3 + CloudFront
│   └── azure/           # notes for Azure Static Web Apps
├── docs/                # project_plan.md and per-task design.md / task.md
├── portal/              # page listing every product, served at /
├── scripts/             # Storybook site build, new-product, package checks, secrets
├── src/
│   ├── lib/             # cn() and the class prefix
│   ├── styles/          # theme.css (tokens) and the Tailwind entries
│   ├── shared/          # components in every product
│   │   └── components/{category}/{Component}/
│   ├── products/
│   │   └── sample/      # one directory per productId
│   │       └── components/{category}/{Component}/
│   └── index.ts         # package root: re-exports src/shared
└── tests/vrt/           # Playwright suite and the committed baselines
```

### Products

A `productId` is a directory under `src/products/` (lower-case kebab-case, for example
`acme-web`). Each product gets its own Storybook containing `src/shared` plus that product, built
into `dist/storybook/{productId}/`, and its own package sub-path
(`su3-ui-component-catalog/{productId}`). The portal at `/` lists every product and its
components.

Dependency direction (enforced by ESLint): products may import from `src/shared`; `src/shared`
never imports from a product; products never import from each other.

### URLs and story naming

- Every component has a clean URL that opens its `Default` story:
  `/{productId}/c/{category}/{component}`, for example `/sample/c/buttons/toggle`. It works with
  `make preview` (nginx) and on Cloudflare Pages (`_redirects`). `make dev` uses Storybook's own
  URLs.
- A story `title` is `{Category}/{Component}` (for example `Buttons/Toggle`) and never contains
  the productId. Every story file exports a `Default` story.
- URL segments are Storybook's sanitized IDs: lower case, other characters replaced with `-`. The
  title `Buttons/IconButton` gives `/sample/c/buttons/iconbutton`.
- A title must be unique within a build, so a product cannot reuse a title from `src/shared`;
  `make ci` fails on duplicates.

### Adding a component

Each component directory holds exactly four files, for example
`src/products/sample/components/buttons/Toggle/`:

```
Toggle.tsx           # the component: uic: classes, cn(), cva variants, className prop
Toggle.stories.tsx   # title 'Buttons/Toggle', with a Default story
Toggle.test.tsx      # Vitest + React Testing Library
index.ts             # re-export
```

The component is then re-exported from `src/shared/index.ts` or
`src/products/{productId}/index.ts`. Styling rules: Tailwind utilities only, always with the
`uic:` prefix; colors, spacing, radius and fonts from the tokens in `src/styles/theme.css`; no
arbitrary values such as `bg-[#123456]`; no reliance on preflight (pair `uic:border` with
`uic:border-solid`). `make ci` checks the layout, titles and exports.

With Claude Code, `/new-component` scaffolds the four files and the export; `CLAUDE.md` holds the
full conventions and the checklist (baselines, changeset, `make ci`).

### Visual regression test

`make vrt` builds every Storybook and runs Playwright in the official image, pinned to
`linux/amd64`, so local runs and CI render identically. Every story from each product's
`index.json` is captured in light and dark themes on `desktop` (1280x720) and `mobile` (Pixel 7);
shared stories are captured once. A story can opt out or limit viewports:

```tsx
export const Animated: Story = {
  parameters: { vrt: { viewports: ['desktop'] } }, // or { disable: true }
};
```

Baselines are committed under `tests/vrt/__screenshots__/{viewport}/{shared|productId}/`.

- After a visual change or a new story, run `make vrt-update` and commit the changed images.
- Delete the baselines of removed or renamed stories (the run fails while they exist), and of
  stories or viewports you exclude with `parameters.vrt`.
- **Review**: a pull request that changes baselines must have its image diffs reviewed (GitHub's
  image diff in "Files changed"). When the VRT fails in CI, download the `vrt-report` artifact and
  open `playwright-report/index.html` to see expected, actual and diff images.

## Using this template

After "Use this template" or a fork, work through the sections below. `docs/project_plan.md` has
the full specification and the reasoning behind each decision.

### Renaming the package and scope

Replace `su3-ui-component-catalog` (for example with `@acme/ui`) in:

- `package.json`: `name` and `repository` (npm checks that provenance comes from the repository
  named there); also `description`, and `version` if you restart numbering.
- `README.md` and `README_JA.md`: the title and every import example.
- `.changeset/*.md`: the package name in pending changesets (for example
  `.changeset/initial-release.md`).
- `.env.docker.sample`: the example `AWS_SECRET_ID`.
- `LICENSE`: the copyright holder. `.github/CODEOWNERS`: the owners.
- `portal/index.html`: the portal's title, heading and author link.
- GitHub repository variables: `NPM_PUBLISH_REPOSITORY` (your `owner/repo`) and
  `CLOUDFLARE_PROJECT_NAME` (see below).
- The Tailwind prefix, if you want your own (next section).

The package is published publicly to npm (`access: public` in `.changeset/config.json`). For a
private package on GitHub Packages instead:

1. Use a name scoped to your GitHub organization (for example `@acme/ui`) and add to
   `package.json`:

   ```json
   {
     "publishConfig": { "registry": "https://npm.pkg.github.com" }
   }
   ```

2. Set `access` to `restricted` in `.changeset/config.json`.
3. In `release.yml`, give the job `packages: write` and pass `NODE_AUTH_TOKEN: ${{ github.token }}`
   to the Changesets step, with an `.npmrc` entry for the registry. GitHub Packages does not use
   npm Trusted Publishing, so `id-token: write` is no longer needed.
4. Consumers add `@acme:registry=https://npm.pkg.github.com` and a token to their `.npmrc`.

### Changing the Tailwind prefix

The prefix `uic` keeps the library's classes and CSS variables apart from the consumer's. To use
your own (for example `acme`):

1. `src/lib/prefix.ts`: `CLASS_PREFIX`.
2. `src/styles/index.css` and `src/styles/package.css`: `prefix(uic)` in the Tailwind imports.
3. `src/styles/theme.css` and `.storybook/preview.css`: the `--uic-*` variables.
4. Every `uic:` class in `src/` (search and replace `uic:`).
5. The consumer snippet in README and README_JA, and the conventions in `CLAUDE.md`,
   `.claude/agents/` and `.claude/skills/`.

`make ci` fails if the prefix in `src/lib/prefix.ts` and the stylesheets disagree. Prefixed
classes do not change rendering, so the VRT baselines stay valid.

### Adding a productId

```sh
make new-product PRODUCT_ID=acme-web
```

This creates `src/products/acme-web/index.ts` and adds the `./acme-web` sub-path to `exports` in
`package.json`. Storybook, the portal, the ESLint dependency rules, the package build and the VRT
pick the product up automatically. Then add components to it and run
`make dev PRODUCT_ID=acme-web`.

### Cloudflare setup

The workflows deploy `develop` to a preview and `main` to production on Cloudflare Pages. Until
`CLOUDFLARE_PROJECT_NAME` is set, the deploy jobs are skipped with a notice, so a new copy of the
template passes CI without any setup.

1. Create the Pages project once, with `main` as its production branch: in the dashboard (Workers
   & Pages > Create > Pages > Direct Upload), or with Wrangler and an API token in your shell:

   ```sh
   npx wrangler pages project create <project-name> --production-branch main
   ```

2. Create an API token with the permission Account / Cloudflare Pages / Edit.
3. In the GitHub repository:
   - Environments: `development` and `production` (add protection rules to `production` as
     needed).
   - Secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (repository or environment
     level).
   - Variable: `CLOUDFLARE_PROJECT_NAME` (repository level, because the deploy job's condition is
     evaluated before its environment applies).
   - Branch protection for `main` and `develop`: pull requests required, with the CI and VRT
     checks. Deploys run on push and do not wait for CI.

`develop` is then served at `https://develop.<project-name>.pages.dev` and `main` at
`https://<project-name>.pages.dev`. A custom domain is added in the Cloudflare dashboard (Workers &
Pages > the project > Custom domains) or through the API; it needs no change in the repository.

The clean-URL rule is `deploy/cloudflare/_redirects`, copied into the build; keep it in sync with
`deploy/local/nginx.conf`.

### Choosing a secrets store

A static Storybook needs almost no secrets, so the template provides the mechanism only. AWS
Secrets Manager is the source of truth, because Cloudflare secrets cannot be read back.

- Store one secret per environment whose value is a flat JSON object (the console's key/value
  format), for example `{"STORYBOOK_API_URL": "https://api.example.com"}`.
- Set `AWS_PROFILE`, `AWS_REGION` and `AWS_SECRET_ID` in `.env.docker` (or on the command line).
- `make secrets-pull-aws` signs in with `aws sso login` when needed and writes `.env.local` (mode
  600). It refuses to replace a hand-written `.env.local` unless `FORCE=1`.
- Optional: `make secrets-push-cloudflare PAGES_ENV=preview` (or `production`) pushes the same
  secret to the Pages project after a confirmation (`YES=1` skips it, and is required without a
  terminal). It reads `CLOUDFLARE_PROJECT_NAME` like the AWS settings, and `CLOUDFLARE_API_TOKEN`
  and `CLOUDFLARE_ACCOUNT_ID` from your shell.

Storybook exposes only `STORYBOOK_*` variables to stories, and they are embedded in the built
site: never put real secrets in them.

To use another store (1Password, Doppler, ...), replace the fetch in
`scripts/secrets-pull-aws.sh` (`scripts/lib/aws-secrets.sh`) with that store's CLI and keep
`scripts/secrets-to-env.ts`, which turns the JSON into `.env.local`. CI credentials stay in GitHub
Secrets either way.

### Switching the deploy target to AWS / Azure

All deploy specifics are in `deploy/cloudflare/` and `.github/workflows/_deploy.yml`; the build
(`dist/storybook`, a static site) does not change. To switch, replace the deploy script and the
reusable workflow, and translate the clean-URL rule. Outlines:

- [deploy/aws/README.md](./deploy/aws/README.md): Amazon S3 + CloudFront.
- [deploy/azure/README.md](./deploy/azure/README.md): Azure Static Web Apps.

## Installing the published package

```sh
pnpm add su3-ui-component-catalog
```

Peer dependencies: `react` and `react-dom` 19. `tailwindcss` 4.3+ is needed only for the second
CSS pattern below.

```tsx
import { Button } from 'su3-ui-component-catalog'; // shared components
import { Toggle } from 'su3-ui-component-catalog/sample'; // the sample product

export function Example() {
  return (
    <>
      <Button variant="secondary">Cancel</Button>
      <Toggle defaultPressed>Bold</Toggle>
    </>
  );
}
```

The package ships ESM and CJS with type declarations, and its JavaScript starts with
`'use client'`, so Next.js App Router server components can import the components directly.

### Pattern 1: prebuilt CSS (projects without Tailwind)

Import the stylesheet once, for example in the app's entry or root layout:

```ts
import 'su3-ui-component-catalog/styles.css';
```

It contains only the classes the components use, the design tokens and the dark theme. It has no
reset (preflight), so it never changes the rest of the page.

### Pattern 2: your own Tailwind CSS (projects that already use Tailwind)

A Tailwind prefix applies per compile, so your Tailwind build cannot generate the library's
`uic:` classes. Add a separate CSS entry for the library and import it next to your own Tailwind
entry:

```css
/* ui-catalog.css (separate from the app's own Tailwind entry) */
@layer theme, utilities;
@import 'tailwindcss/theme.css' layer(theme) prefix(uic);
@import 'tailwindcss/utilities.css' layer(utilities) prefix(uic) source(none);
@import 'su3-ui-component-catalog/theme.css';
@source '../node_modules/su3-ui-component-catalog/dist';
```

Adjust the `@source` path to where the file sits relative to `node_modules`. Keep it a separate
file: the library's `theme.css` resets the default palette (`--color-*: initial`), which in a
single compile would also remove your own colors such as `bg-red-500`. Both patterns were checked
with Vite and Next.js (details in `docs/2026-10-18_03_phase4-package-build/design.md`).

### Dark mode

The components switch to the dark theme inside any element with the `dark` class, for example
`<html class="dark">`.

## Release flow

Versions follow SemVer and are managed with Changesets; tags are `vX.Y.Z`.

1. A feature branch (`feature/...`, from `develop`) that changes the published package adds a
   changeset: `make changeset`, then pick major, minor or patch and describe the change.
2. The pull request is merged into `develop` (deployed to the preview).
3. Every push to `develop` makes `create-d2m-pr.yml` open or update the `develop` -> `main` release
   pull request (git-pr-release, listing the merged pull requests). Merging it deploys to
   production.
4. On `main`, `release.yml` opens or updates the "chore: version packages" pull request with the
   version bump and `CHANGELOG.md`.
5. Merging it tags `vX.Y.Z`, creates the GitHub Release and publishes to npm with Trusted
   Publishing (no npm token stored).
6. The workflow then opens a pull request merging `main` back into `develop`; merge it with a
   merge commit so both branches keep the version bump.

One-time setup by the repository owner:

- GitHub: Settings > Actions > General > allow GitHub Actions to create and approve pull requests.
- Pull requests opened with the default `GITHUB_TOKEN` do not trigger CI. If CI must run on the
  release, version and back-merge pull requests, add a `RELEASE_TOKEN` secret (a GitHub App token or a
  fine-grained token with contents and pull-requests write).
- npm: a trusted publisher can only be added to a package that already exists, so publish the
  first version manually once (two-factor authentication required). From a clean checkout of
  `main`, with Node.js 26 and pnpm on the host:

  ```sh
  pnpm install --frozen-lockfile
  pnpm run build
  pnpm publish
  ```

  A scoped name (for example `@acme/ui`) needs `pnpm publish --access public` for this first
  publish. Then, on npmjs.com, add a trusted publisher for the package (this repository, workflow
  `release.yml`, no environment), and set the repository variable `NPM_PUBLISH_REPOSITORY` to
  `owner/repo`. Publishing runs only in that repository, so forks and template copies never
  publish.

## Make commands

`make help` lists every target. Settings such as `PRODUCT_ID` are passed as `make <target>
NAME=value`.

| Command                         | Description                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `make setup`                    | Copy `.env.*.sample` (never overwrites), build the image, install dependencies                  |
| `make dev`                      | Storybook dev server for `PRODUCT_ID` (default `sample`) at http://localhost:5070               |
| `make up` / `make down`         | Start the dev server in the background / stop every container                                   |
| `make logs`                     | Follow the dev server logs                                                                      |
| `make shell`                    | Shell in a one-off container                                                                    |
| `make preview`                  | Build every product and serve it with nginx at http://localhost:5071                            |
| `make install`                  | Install dependencies; `PKG="name"` (or `PKG="-D name"`) adds one, pinned exactly                |
| `make lint` / `make format`     | ESLint / Prettier (write)                                                                       |
| `make typecheck`                | TypeScript                                                                                      |
| `make test` / `make test-watch` | Vitest with coverage / watch mode                                                               |
| `make build`                    | Build the package into `dist` (tsdown, `styles.css`, `theme.css`)                               |
| `make build-storybook`          | Build every product's Storybook (or only `PRODUCT_ID`) and the portal                           |
| `make ci`                       | Everything CI runs: format check, lint, types, tests, package build and checks, Storybook build |
| `make vrt`                      | Visual regression test in the Playwright image                                                  |
| `make vrt-update`               | Update the changed or missing baselines                                                         |
| `make new-product`              | Scaffold `src/products/PRODUCT_ID` and its package export                                       |
| `make changeset`                | Add a changeset                                                                                 |
| `make secrets-pull-aws`         | Generate `.env.local` from AWS Secrets Manager                                                  |
| `make secrets-push-cloudflare`  | Push that secret to Cloudflare Pages (`PAGES_ENV=production\|preview`); changes remote state    |
| `make clean`                    | Remove the containers, the `node_modules` volume and the built images                           |
| `make local-<target>`           | The same on the host instead of Docker (`make help` lists them)                                 |

## License

[MIT License](./LICENSE)
