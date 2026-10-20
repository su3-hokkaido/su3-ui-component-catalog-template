# Phase 2: Docker / compose / Makefile — Design

## Background

`docs/project_plan.md` §14 step 2, implementing §5 (container / local development) and §6
(Makefile). Phase 1 made the toolchain work on the host with `pnpm run ci`. The plan requires that
the project works without Node.js on the host and that `make` is the single entry point for every
command.

## Requirements

- `make setup && make dev` alone opens Storybook at http://localhost:5070 on a machine that has
  Docker but no Node.js (§15, first acceptance criterion).
- `make ci` runs the Phase 1 checks (format check, lint, typecheck, unit tests, Storybook build)
  inside the container.
- `make dev PRODUCT_ID=xxx` selects the product; an unknown product fails fast.
- The host port is configurable with `DEV_PORT` in `.env.docker`; `.env.docker.sample` documents
  every variable.
- File changes on the host are picked up by the dev server in the container.
- Host-side `local-*` targets run the same pnpm scripts for people who have Node.js installed.
- `make help` lists every target with a description.

## Non-goals

- `preview` Dockerfile stage, `preview` compose service, `make preview` and the all-products
  Storybook build (Phase 3; they need `deploy/local/nginx.conf` and `scripts/build-storybook-all.sh`).
- `make build` (Phase 4), `make vrt` / `make vrt-update` and the `vrt` service (Phase 5),
  `make changeset` (Phase 6), `make new-product` (Phase 3), `make secrets-*` and
  `.env.local.sample` (Phase 7). Each phase adds its own targets.
- README (Phase 8).

## Technical approach

### Dockerfile

Multi-stage, base image `node:26-trixie-slim` (Debian 13; the major matches `.nvmrc`):

| Stage   | Contents                                                                                                                                                                          |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`  | pnpm at the exact `packageManager` version, `/app` owned by the `node` user, pnpm store at `/app/node_modules/.pnpm-store`                                                        |
| `dev`   | `SBCONFIG_HOSTNAME=0.0.0.0`, `pnpm run dev --ci`. The source comes from the bind mount                                                                                            |
| `build` | `pnpm install --frozen-lockfile` (store in a BuildKit cache mount), copies the source, `pnpm run build-storybook` for `PRODUCT_ID`. Phase 3 switches it to the all-products build |

### compose.yaml

One `storybook` service built from the `dev` stage:

- Ports `${DEV_PORT:-5070}:5070`. The container port is fixed; Storybook serves HMR from the same
  server, so changing only the host side works (verified with `DEV_PORT=5080`).
- `PRODUCT_ID: ${PRODUCT_ID:-sample}`.
- The repository is bind-mounted at `/app`; `node_modules` is a named volume, so the Linux
  dependencies never mix with a host `node_modules` (macOS binaries) and vice versa.
- `init: true` so that signals reach Storybook and the container stops promptly.

### Makefile

- `COMPOSE` adds `--env-file .env.docker` only when that file exists, and forwards `PRODUCT_ID`
  only when it is given. Variables from the shell or the command line override `.env.docker`
  (compose's precedence rules).
- Tool targets run `docker compose run --rm storybook pnpm ...`. One-off containers publish no
  ports, so they also work while `make up` is running.
- `make setup` copies every `.env.*.sample` to its real name without overwriting, builds the image
  and runs `pnpm install --frozen-lockfile`.
- `make install` runs `pnpm install` (use it after pulling a lockfile change);
  `make install PKG=name` runs `pnpm add --save-exact`, matching the exact pins in package.json.
  `PKG="-D name"` adds a dev dependency.
- `make clean` removes the containers, the `node_modules` volume and the built image.
- The Makefile works with GNU Make 3.81 (the version shipped with macOS).

### Targets added in this phase

`help`, `setup`, `dev`, `up`, `down`, `logs`, `shell`, `install`, `lint`, `format`, `typecheck`,
`test`, `test-watch`, `build-storybook`, `ci`, `clean`, and `local-install`, `local-dev`,
`local-lint`, `local-format`, `local-typecheck`, `local-test`, `local-build-storybook`,
`local-ci`.

Until Phase 3, `make build-storybook` and the `build` stage build Storybook for one product
(`PRODUCT_ID`), not every product as §5 and §6 describe; the package build in the `build` stage
arrives with tsup in Phase 4.

## Affected files

- New: `Dockerfile`, `.dockerignore`, `compose.yaml`, `.env.docker.sample`, `Makefile`.
- `docs/project_plan.md` §2 (how pnpm is installed in the image) and §5 (stages, host binding,
  pnpm store, one-off containers).
- `.claude/settings.json`: allow editing `.dockerignore`.
- No impact on design tokens, package `exports`, story titles / clean URLs, VRT baselines or
  README / README_JA.

## Judgment calls not covered by project_plan.md

- **pnpm is installed with `npm install --global`, not Corepack.** Node.js 25+ no longer bundles
  Corepack, and pnpm 12 is distributed as a native binary (the host-side self-switch from pnpm 10
  failed in Phase 1). Installing the exact version with npm needs no extra tool. The version is
  read from `packageManager` at build time, so package.json stays the single source of truth; the
  cost is that any package.json change invalidates that layer, which takes a few seconds.
- **Storybook binds `0.0.0.0` through `SBCONFIG_HOSTNAME` in the `dev` stage** instead of
  `--host` in the `dev` script, so `pnpm dev` on the host keeps listening on localhost only.
- **The pnpm store lives inside the `node_modules` volume** (`npm_config_store_dir`). With a
  separate volume pnpm would copy instead of hard-linking, and one volume keeps `make clean`
  simple.
- **Containers run as `node` (uid 1000).** On Docker Desktop for macOS the bind mount maps
  ownership automatically. On Linux hosts whose user is not uid 1000, files written by the
  container (coverage, `storybook-static`) may need `chown`; this is documented here rather than
  worked around until someone needs it.
- **Storybook prints "Change detection unavailable: git is not available"** in the container. The
  image deliberately does not include git (git operations happen on the host); the warning has no
  effect on the dev server.
- `.env.docker.sample` also contains `PREVIEW_PORT` (used from Phase 3) and `PRODUCT_ID`, so that
  every compose setting lives in one file from the start.
