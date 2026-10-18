# Phase 3: Per-product builds, portal and clean URLs — Design

## Background

`docs/project_plan.md` §14 step 3, implementing §4 (URL design per productId) and the `preview`
parts of §5 and §6. After Phase 2, Storybook runs for one product at a time in Docker. The deployed
site needs one Storybook per productId, a portal at `/`, and clean URLs
`/{productId}/c/{category}/{component}` that open the component's `Default` story, both on
Cloudflare (`_redirects`) and locally (`make preview`, nginx).

## Requirements

- One Storybook build per productId in `dist/storybook/{productId}/`, each containing `src/shared`
  plus that product.
- `dist/storybook/index.html`: a portal that links every product and every component's clean URL.
- `dist/storybook/_redirects`: the §4 rule, copied from `deploy/cloudflare/_redirects`.
- `make preview` builds every product and serves the output with nginx on
  http://localhost:5071 with the same rule (§15: `/sample/c/buttons/toggle` opens the Toggle story,
  and assets under `/sample/` are not redirected).
- `make ci` builds every product, so a duplicate story id inside any product build fails CI.
- A story whose title does not map onto the clean-URL rule fails the build.

## Non-goals

- Deploying to Cloudflare, `wrangler.jsonc`, deploy scripts and workflows (Phase 6). Only
  `wrangler pages dev` is run, locally, to check `_redirects`.
- `make new-product`: it must also wire the product into package `exports` (§9), which arrives in
  Phase 4, so the target moves there (Phase 2's design listed it under Phase 3).
- Package build (Phase 4), VRT (Phase 5), README (Phase 8).

## Technical approach

### Build script

`scripts/build-storybook-all.ts`, run by Node 26 directly (type stripping; no build step):

1. Lists the directories in `src/products` and checks that each is lower-case kebab-case, because
   a productId is a URL path segment. Optional arguments build a subset
   (`make build-storybook PRODUCT_ID=sample`).
2. Removes `dist/storybook`, then runs `storybook build --output-dir dist/storybook/{productId}`
   with `PRODUCT_ID={productId}` for each product. The script ignores an inherited `PRODUCT_ID`,
   because compose always sets one for the dev server.
3. Reads each build's `index.json`, takes every story named `Default`, and derives the clean URL
   from the title segments with Storybook's sanitize rules. If the rebuilt id
   `{category}-{component}--default` differs from the real story id (for example a title with
   three segments, or a custom `id`), the build fails, because the redirect would point at a story
   that does not exist.
4. Writes the portal (`portal/index.html` with the product list inserted at the
   `<!-- products -->` marker, every value HTML-escaped) and copies `_redirects`.

The pure parts (validation, sanitize, clean URLs, portal rendering) live in
`scripts/lib/storybook-site.ts` and are unit-tested; the conventions test reuses the productId
validator.

`package.json` gains `build-storybook:all`; `ci` uses it instead of the single-product
`build-storybook`, which stays available for Storybook's own tooling.

### Portal

Static HTML with inline CSS and a light/dark palette from `prefers-color-scheme`. It is not a
component and is not part of the package, so the Tailwind and token rules for components do not
apply to it.

### Redirect rules

| Where      | File                           | Rule                                                                                                                               |
| ---------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare | `deploy/cloudflare/_redirects` | `/:productId/c/:category/:component /:productId/?path=/story/:category-:component--default 302`, plus the same with a trailing `/` |
| nginx      | `deploy/local/nginx.conf`      | `location ~ ^/([^/]+)/c/([^/]+)/([^/]+)/?$ { return 302 /$1/?path=/story/$2-$3--default; }`                                        |

nginx also sets `absolute_redirect off`, so its own directory redirect (`/sample` -> `/sample/`)
keeps the host port published by compose, and returns 404 for `/_redirects`, as Cloudflare does
not serve that file either.

### Docker and Makefile

- Dockerfile `build` stage: `pnpm run build-storybook:all` (the per-product build argument is
  gone). New `preview` stage: `nginxinc/nginx-unprivileged:1.30-alpine` (non-root, port 8080) with
  `deploy/local/nginx.conf` and `dist/storybook` copied from `build`.
- compose: `preview` service behind the `preview` profile, `${PREVIEW_PORT:-5071}:8080`.
- Makefile: `make preview` (`up --build`, foreground); `make build-storybook` and
  `make local-build-storybook` build every product (or `PRODUCT_ID`) into `dist/storybook`;
  `make down` and `make clean` include profile services (`--profile '*'`).

### Verified behavior

| Request                          | nginx (`make preview`)                                | `wrangler pages dev`                                  |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `/`                              | 200 portal                                            | 200 portal                                            |
| `/sample`                        | 301 -> `/sample/`                                     | 308 -> `/sample/`                                     |
| `/sample/c/buttons/toggle` (`/`) | 302 -> `/sample/?path=/story/buttons-toggle--default` | same                                                  |
| `/sample/index.json`, assets     | 200                                                   | 200                                                   |
| `/sample/iframe.html?id=...`     | 200                                                   | 308 -> `/sample/iframe?id=...` (query kept), then 200 |
| `/nope/c/x` (unknown path)       | 404                                                   | 200 (Pages serves `/` when there is no `404.html`)    |

## Affected files

- New: `scripts/build-storybook-all.ts`, `scripts/lib/storybook-site.ts` (+ test),
  `portal/index.html`, `deploy/cloudflare/_redirects`, `deploy/local/nginx.conf`.
- Modified: `package.json` (`build-storybook:all`, `ci`, `wrangler` devDependency),
  `pnpm-lock.yaml`, `pnpm-workspace.yaml` (`allowBuilds: workerd`), `tsconfig.json` (`scripts`,
  `allowImportingTsExtensions`, `erasableSyntaxOnly`), `vitest.config.ts` (scripts tests and
  coverage), `src/conventions.test.ts`, `Dockerfile`, `compose.yaml`, `Makefile`,
  `docs/project_plan.md` (§3, §4, §5).
- `.gitignore`, `.prettierignore`, `.dockerignore` and `eslint.config.js` ignore `.wrangler/`
  (local state written by `wrangler pages dev`).
- No impact on design tokens, package `exports`, story titles or VRT baselines. Clean URLs are now
  generated and enforced. README (Phase 8) will document `make preview` and the URL rule.

## Judgment calls not covered by project_plan.md

- **TypeScript instead of `build-storybook-all.sh`.** Reading `index.json`, escaping HTML and
  checking story ids is fragile in shell; Node 26 runs `.ts` files directly, and the helpers get
  unit tests and the same lint and type rules as the rest of the code. `tsconfig.json` enables
  `allowImportingTsExtensions` (Node needs the `.ts` extension in imports) and
  `erasableSyntaxOnly` (Node only strips types; enums and similar syntax would fail at run time).
- **wrangler is added now** (exact pin; `workerd` allowed to run its install script) to check
  `_redirects` locally with `wrangler pages dev`. Phase 6 needs it for deploys anyway. Nothing is
  deployed.
- **Trailing-slash variant in `_redirects`**, matching nginx's `/?$`, so
  `/sample/c/buttons/toggle/` also works.
- **nginx captures only `[a-z0-9-]`** (sanitized ids), unlike Cloudflare placeholders, which
  match any characters except `/`. nginx decodes the URI before matching, so a looser capture could
  inject encoded control characters into the `Location` header. Real clean URLs are unaffected.
- **A subset build (`make build-storybook PRODUCT_ID=...`) rebuilds `dist/storybook` from
  scratch**, so the output never mixes products from different runs.
- **To check on the first real deploy (§15):** whether Cloudflare keeps a query string sent with a
  clean URL (nginx's `return` drops it). Clean URLs are not expected to carry one.
- **Unknown paths on Cloudflare return the portal with 200** (Pages' behavior without a
  `404.html`). Adding a 404 page is left for later; it does not affect the acceptance criteria.
- **Cloudflare now recommends Workers Static Assets for new projects** ("Pages continues to
  work"). `_redirects` has the same syntax on both, so this phase is unaffected; the Pages vs
  Workers choice is revisited with the owner in Phase 6.
