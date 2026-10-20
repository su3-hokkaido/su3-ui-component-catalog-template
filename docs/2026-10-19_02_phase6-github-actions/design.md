# Phase 6: GitHub Actions (CI, VRT, deploy, release) — Design

## Background

`docs/project_plan.md` §14 step 6, implementing §8 (workflows and the guards for template copies
and forks) and the publishing parts of §9. After Phase 5 every check runs locally (`make ci`,
`make vrt`), but nothing runs on GitHub, nothing is deployed, and Changesets is not installed.

## Requirements

- `ci.yml`, `vrt.yml`, `_deploy.yml`, `deploy_dev.yml`, `deploy_prod.yml` and `release.yml` with
  the triggers and jobs of §8.
- CI runs the same checks as `make ci`; the VRT runs in the same Playwright image as `make vrt`
  and uploads the diff report on failure.
- `develop` deploys to the Cloudflare Pages preview environment and `main` to production, through
  GitHub Environments `development` and `production`. Cloudflare specifics stay in
  `deploy/cloudflare/` and `_deploy.yml`.
- Releases use Changesets: Version Packages PR, then tag `vX.Y.Z`, GitHub Release and npm publish
  with Trusted Publishing (OIDC, provenance), then a `main` -> `develop` back-merge PR.
- Template copies and forks: CI passes; deploy jobs skip with a notice when
  `vars.CLOUDFLARE_PROJECT_NAME` is empty; publishing runs only when `github.repository` equals
  `vars.NPM_PUBLISH_REPOSITORY`.
- The pnpm store is cached (not in the release job).
- Owner decisions for this phase: the published `package.json` has no `engines` (the Node.js 26
  constraint moves to `devEngines`), and actions are pinned by commit SHA with Dependabot.

## Non-goals

- Per-PR preview deploys (optional in §8): pull requests from forks have no secrets, and the
  `develop` preview covers review needs.
- Running workflows locally (`act`); real runs are checked on GitHub by the owner.
- README / README_JA sections for the setup (Phase 8). The owner setup is listed below until then.
- Secrets scripts (Phase 7).

## Technical approach

### Node.js constraint

- `engines` is removed from `package.json` (it would be published and warn every consumer not on
  Node.js 26). `devEngines.runtime` (`name: node`, `version: ">=26 <27"`, `onFail: "error"`) keeps
  the development constraint: pnpm 12 validates it and, with `error`, does not download a runtime.
- `src/conventions.test.ts` checks that `engines` is absent and that the `devEngines` major, `.nvmrc`
  and the Dockerfile `NODE_VERSION` agree. Workflows read `.nvmrc`.

### Shared setup (`.github/actions/setup/action.yml`)

Composite action used by every job: `pnpm/action-setup` (version from `packageManager`),
`actions/setup-node` (`node-version-file: .nvmrc`, `cache: pnpm` unless the `cache` input is
`false`), then `pnpm install --frozen-lockfile`.

### Workflows

All workflows set `permissions: contents: read` at the top and widen it per job only where
needed, check out with `persist-credentials: false` (the release job too: changesets/action pushes the
version commit and tags through the GitHub API with its own token), and use
`concurrency` per workflow and ref; pull request runs cancel the previous run, deploys and releases
never do.

| File              | Trigger                               | Steps                                                                                                                                   |
| ----------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`          | `pull_request`, push `main`/`develop` | setup, `pnpm run ci` (the script `make ci` runs)                                                                                        |
| `vrt.yml`         | `pull_request`                        | setup, `pnpm run build-storybook:all`, `docker compose --profile vrt run --rm --build vrt` with `CI=true`; on failure upload the report |
| `_deploy.yml`     | `workflow_call`                       | notice job when not configured; otherwise setup, `build-storybook:all`, `deploy/cloudflare/deploy.sh <branch>`                          |
| `deploy_dev.yml`  | push `develop`                        | `_deploy.yml` with environment `development`, branch `develop`                                                                          |
| `deploy_prod.yml` | push `main`                           | `_deploy.yml` with environment `production`, branch `main`                                                                              |
| `release.yml`     | push `main`                           | setup (no cache), `changesets/action`; after a publish, the back-merge PR                                                               |

- VRT: the runner builds Storybook with the project's Node.js and lockfile, then runs the compose
  `vrt` service exactly as `make vrt` does. The runner user is uid 1001, the image's `pwuser`, so
  the bind mounts are writable. `playwright-report` and `test-results` are uploaded on failure
  (14 days).
- Deploy: `deploy/cloudflare/deploy.sh` checks its inputs and runs
  `pnpm exec wrangler pages deploy dist/storybook --project-name ... --branch ...`. The Pages
  project's production branch is `main`, so `--branch main` is production and `--branch develop`
  is the `develop.<project>.pages.dev` preview alias. The deployment URL is read from Wrangler's
  ND-JSON output file and becomes the environment URL.
- Release: `publish-script` is `pnpm run release` only when the publish guard matches and empty
  otherwise (changesets/action never publishes without it, but still opens the Version Packages
  PR). `release` builds the package, runs `check:package`, then `changeset publish`, which runs
  `pnpm publish`; pnpm exchanges the GitHub OIDC token itself and attaches provenance. After a
  publish, `gh pr create --base develop --head main` opens the back-merge PR unless one is open.
  In API mode changesets/action creates the `vX.Y.Z` tag at the pushed `main` commit
  (`context.sha`), so the tag points at what was published whatever the default branch is.

### Changesets

- `@changesets/cli` 3.0.3 (changesets/action v2 requires v3). `.changeset/config.json`: default
  changelog, `access: public`, `baseBranch: develop` (feature PRs target `develop`),
  `commit: false`.
- Scripts `changeset` and `release`; `make changeset`.
- An initial changeset (minor) so that the first automated release is 0.1.0.

### Supply chain

- Every action is pinned to a full commit SHA with the version in a comment. Dependabot updates
  them weekly against `develop` (`/` and the composite action directory).

## Verification (results)

- actionlint 1.7.12: no findings. shellcheck: no findings for `deploy.sh`. zizmor 1.31.1
  (offline): no medium or high findings after adding the Dependabot cooldown; the remaining six
  are `self-repository` help notes (see judgment calls).
- `deploy.sh`: exits with a clear message without a branch, without each variable and without a
  complete `dist/storybook`. With a stub `pnpm` on `PATH` it passes `--project-name`, `--branch`
  and `--commit-hash` and writes `url=` to `GITHUB_OUTPUT` from the branch alias, falling back to
  the deployment URL. Nothing was deployed.
- pnpm 12 fails `pnpm install` with `ERR_PNPM_BAD_RUNTIME_VERSION` when `devEngines.runtime` does
  not match (checked with `>=99`), and the project installs without lockfile runtime entries.
- In a throwaway copy: `changeset status` lists a minor bump; `changeset version` sets 0.1.0,
  writes a Prettier-clean `CHANGELOG.md` and consumes the changeset.
- `pnpm pack`: the packed `package.json` has no `engines` (`devEngines` is packed but only applies
  to the project being developed, not to consumers).
- `CI=true make vrt` (the command path of `vrt.yml`): 38 passed. The first attempt failed because
  npm (`npx`) enforces `devEngines` against the image's Node.js 24; the image and `make vrt-update`
  now call `node_modules/.bin/playwright`. `make vrt-update` leaves every baseline unchanged, and
  the preview image still builds.
- `make format` and `make ci` pass (82 tests).
- Not verifiable locally: the workflows on GitHub, the deploy and the release. The owner checks
  CI and VRT on this phase's PR, and the deploy and release after the setup below.

## Owner setup (one time; README covers it in Phase 8)

1. GitHub: create the environments `development` and `production` (add protection rules to
   `production` as wanted); add the secrets `CLOUDFLARE_API_TOKEN` (Account / Cloudflare Pages /
   Edit) and `CLOUDFLARE_ACCOUNT_ID` (repository or environment level); add the repository
   variable `CLOUDFLARE_PROJECT_NAME` (must be repository level: a job `if` is evaluated before the
   environment applies).
2. Cloudflare: create the Pages project once with
   `wrangler pages project create <name> --production-branch main`.
3. GitHub: Settings > Actions > General > "Allow GitHub Actions to create and approve pull
   requests" (Version Packages and back-merge PRs). Optionally add a `RELEASE_TOKEN` secret (a
   GitHub App token or fine-grained PAT with contents and pull-requests write), because PRs
   opened with `GITHUB_TOKEN` do not trigger CI.
4. npm: a trusted publisher can only be added to a package that exists. From a clean checkout of
   `main`: `pnpm install --frozen-lockfile && pnpm run build && pnpm publish` (publishes 0.0.0
   with 2FA). Then on npmjs.com add the trusted publisher (repository, workflow `release.yml`, no
   environment), optionally restrict publishing to trusted publishers, and set the repository
   variable `NPM_PUBLISH_REPOSITORY` to `owner/repo`. The next Version Packages PR releases 0.1.0
   automatically; 0.0.0 can then be deprecated.

5. GitHub: protect `main` and `develop` (pull request required, CI and VRT required checks).
   Deploys run on push without waiting for CI, so the protection is what keeps a failing commit
   from being deployed.
6. Deploy secrets may be at repository or environment level: GitHub uses the environment secret
   of the reusable workflow's deploy job over the value passed by the caller. If a deploy reports
   `CLOUDFLARE_API_TOKEN is not set`, put the secrets at repository level.

## Affected files

- New: `.github/actions/setup/action.yml`, `.github/workflows/{ci,vrt,_deploy,deploy_dev,deploy_prod,release}.yml`,
  `.github/dependabot.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/*` (with `config.yml`),
  `deploy/cloudflare/deploy.sh`, `.changeset/config.json`, `.changeset/README.md`, the initial
  changeset.
- Modified: `package.json` / `pnpm-lock.yaml` (`devEngines`, `@changesets/cli`, scripts),
  `Makefile` (`changeset`, `local-changeset`, Playwright called directly in `vrt-update`),
  `Dockerfile` (comments; the `vrt` stage calls Playwright directly), `src/conventions.test.ts`,
  `docs/project_plan.md` (§2, §3, §8, §9, §17), `CLAUDE.md`.
- Design tokens, package `exports`, story titles, clean URLs, VRT baselines: unaffected. The
  published `package.json` loses `engines`. README: Phase 8.

## Judgment calls not covered by project_plan.md

- **CI runs `pnpm run ci` on the runner** (Node.js from `.nvmrc`) instead of `make ci` in Docker:
  the same script, with the pnpm store cache and no image build. The VRT keeps the Docker image,
  because rendering must come from it (§11).
- **No `wrangler.jsonc`**: Pages direct upload takes the project and branch as flags, `--config`
  is not supported for Pages, and a root Wrangler file would become the source of truth for the
  project's settings.
- **The first npm publish is manual (0.0.0)**, because a trusted publisher needs an existing
  package.
- **No GitHub Environment on the release job**: it runs on every push to `main` (it also maintains
  the Version Packages PR), so required reviewers would block each run.
- **Optional `RELEASE_TOKEN`**, so that the Version Packages and back-merge PRs can trigger CI.
- **Playwright is called without `npx`** in the `vrt` image, because npm enforces
  `devEngines.runtime` of the mounted `package.json` and the image's Node.js is 24.
- **`./` for local actions and workflows**, not the newer `$/` self-repository syntax zizmor
  suggests (GitHub supports it from 2026-07): `./` is what actionlint and older GitHub Enterprise
  Server versions that template copies may run on understand. The setup action is only loaded
  after `actions/checkout`, so the workspace is the repository itself.
- **Deploy secrets are passed explicitly** to `_deploy.yml` rather than with `secrets: inherit`,
  so the reusable workflow receives only the two it needs; environment secrets still take
  precedence inside the deploy job.
- **`baseBranch: develop`** in the Changesets config, because feature PRs are compared with
  `develop`.
