# Phase 7: Secrets scripts — Design

## Background

`docs/project_plan.md` §14 step 7, implementing §7 and the `make secrets-pull-aws` /
`make secrets-push-cloudflare` targets of §6. Cloudflare secrets are write-only, so AWS Secrets
Manager is the source of truth: the pull writes `.env.local` from it, and the optional push copies
the same values to Cloudflare Pages. A static Storybook needs almost no runtime secrets, so the
template provides the mechanism only. `.env.local.sample`, listed in §7, does not exist yet.

## Requirements

- `make secrets-pull-aws`: sign in with `aws sso login --profile $AWS_PROFILE` when needed, read
  the secret with `aws secretsmanager get-secret-value`, and generate `.env.local`.
- `make secrets-push-cloudflare` (optional): push the Secrets Manager values to a Pages project
  with `wrangler pages secret bulk`. One direction only; it changes remote state, so it asks for
  confirmation and Claude never runs it.
- Distribute `.env.local.sample`; document every variable with an English comment.
- Owner decisions: the AWS CLI runs on the host (its `~/.aws` SSO profiles and browser login), and
  the non-secret settings `AWS_PROFILE`, `AWS_REGION` and `AWS_SECRET_ID` live in `.env.docker`,
  overridable on the make command line.
- The host needs Docker and the AWS CLI, not Node.js (Docker is the default, §5).

## Non-goals

- Creating or updating secrets in AWS (done in the AWS console or by the owner's tooling).
- Using `.env.local` in CI; CI credentials stay in GitHub Secrets (§7).
- Other secret stores; README explains where to swap one in (Phase 8).

## Technical approach

### Secret format

One Secrets Manager secret per environment whose `SecretString` is a flat JSON object, the
format the console's key/value editor writes:

```json
{ "STORYBOOK_API_URL": "https://api.example.com", "STORYBOOK_FEATURE_X": "true" }
```

### `scripts/lib/secrets.ts` and `scripts/secrets-to-env.ts`

- `parseSecretString(text)`: accepts a JSON object whose keys match `^[A-Za-z_][A-Za-z0-9_]*$` and
  whose values are strings, numbers or booleans (numbers and booleans are stringified). Errors
  name the key, never the value.
- `toDotenv(secrets, source)`: a managed-file header (marker line, source secret id, "overwritten
  by make secrets-pull-aws"), then one `KEY=<quoted value>` line per key, sorted.
- Quoting follows what Vite's `loadEnv` (dotenv + dotenv-expand, used by the Storybook Vite
  builder) reads back, checked by experiment:
  - every `$` is written as `\$`, because unescaped `$NAME` is expanded;
  - single quotes, then backticks, keep backslashes and the other quote characters literally;
  - double quotes turn `\n` into a newline and keep other backslashes, so they are used only for
    values with newlines (written as `\n`) or values containing both `'` and a backtick;
  - a carriage return has no escape that `loadEnv` reads back, and a trailing backslash would
    escape the closing quote;
  - values that no quoting represents exactly (a carriage return, a backslash before `$`, a
    newline together with `"` or `\`, a trailing backslash with every quote character in use) are
    rejected with the key name. The tests round-trip every accepted case through `loadEnv`.
- `scripts/secrets-to-env.ts` reads the `SecretString` on stdin and prints `--format env`
  (default, with `--source <secret id>`), `json` (string values, for wrangler) or `names`. It
  runs in the dev container (`docker compose run --rm -T storybook node ...`), or with host Node.js
  for the `local-*` targets.

### `scripts/secrets-pull-aws.sh`

- Settings come from the environment first, then from `.env.docker` (a plain `KEY=value` lookup,
  the file is not sourced): `AWS_PROFILE`, `AWS_REGION` (optional), `AWS_SECRET_ID` (required);
  `ENV_FILE` (default `.env.local`) and `SECRETS_NODE` (how to run Node.js; set by the Makefile).
- Runs `aws sts get-caller-identity`; when that fails, `aws sso login` (interactive), then
  `aws secretsmanager get-secret-value --query SecretString --output text`.
- Writes to a temporary file next to the target with `umask 077` and moves it into place, so the
  file is complete and only readable by the user (mode 600). Prints the key names only.
- Refuses to replace an existing file whose first line is not the managed marker (a hand-written
  file) unless `FORCE=1`. `.env.local.sample` starts with the marker, so the copy made by
  `make setup` is replaced without `FORCE`.

### `scripts/secrets-push-cloudflare.sh`

- Same AWS settings, plus `CLOUDFLARE_PROJECT_NAME` (environment or `.env.docker`). `PAGES_ENV`
  (`production` or `preview`, required) and `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` come
  from the environment or the make command line only, so the target is chosen on every run.
- The prompt names the project, environment and account; without a terminal it requires `YES=1`.
  The values are read again after the confirmation, so a change to the secret in between is
  pushed too.
- Lists the key names and asks `Push N secrets to <project> (<env>)? [y/N]` unless `YES=1`, then
  pipes the `json` format into `wrangler pages secret bulk --project-name ... --env ...` (stdin is
  supported by Wrangler 4.151). Values never touch the disk. Wrangler runs in the dev container
  with the two Cloudflare variables passed through, or on the host for the `local-*` target.

### Makefile

`secrets-pull-aws` and `secrets-push-cloudflare` (AWS CLI on the host, Node.js and Wrangler in the
dev container) and `local-secrets-pull-aws` / `local-secrets-push-cloudflare`. Settings given on
the command line (`make secrets-pull-aws AWS_PROFILE=dev`) are forwarded only when present, like
`PRODUCT_ID`.

## Affected files

- New: `scripts/lib/secrets.ts`, `scripts/lib/secrets.test.ts`, `scripts/lib/aws-secrets.sh`
  (shell helpers shared by both scripts), `scripts/secrets-to-env.ts`,
  `scripts/secrets-pull-aws.sh`, `scripts/secrets-push-cloudflare.sh`, `.env.local.sample`.
- Modified: `.env.docker.sample`, `Makefile` (a `Secrets` help section; the help column is wider
  for the longer `local-` names), `docs/project_plan.md` (§3, §7, §17). `CLAUDE.md` needs no
  change: its mutation policy already covers the push and the interactive `aws sso login`.
- Existing `.env.docker` files are kept by `make setup`; add the new settings by hand.
- Design tokens, package `exports`, story titles, clean URLs, VRT baselines: unaffected. README:
  Phase 8 (secrets store section).

## Verification (results)

- Vitest: 23 tests for the helper (`__proto__` is rejected as a name), including a round trip of 13 tricky values (`$`, quotes,
  backslashes, `#`, padding, line breaks, Unicode) through Vite's `loadEnv`, and checks that the
  marker in `aws-secrets.sh` and the first line of `.env.local.sample` match `MANAGED_MARKER`.
- shellcheck: no findings for the three shell files.
- End-to-end with stub `aws` and `wrangler` executables on `PATH`, macOS `/bin/bash` 3.2, Node.js
  in the dev container and `ENV_FILE` in a scratch directory (the real `.env.local` was never
  touched):
  - no session: `aws sso login` ran with the profile and region, then the secret was read; the
    file has mode 600 and the expected quoting, and only names were printed;
  - a hand-written file was kept (clear error), `FORCE=1` replaced it, an invalid secret left the
    previous file intact with no temporary file behind, and a missing `AWS_SECRET_ID` failed;
  - `make secrets-pull-aws AWS_SECRET_ID=... AWS_PROFILE=...` forwarded the command-line settings
    and read the rest from `.env.docker`;
  - push: missing `PAGES_ENV` or token failed before any AWS call; answering `n`, or no input,
    cancelled without calling Wrangler; `YES=1` ran
    `wrangler pages secret bulk --project-name demo --env preview` with the JSON on stdin;
    without a terminal and without `YES=1` it stops with a hint instead of a silent cancel;
  - the `.env.docker` lookup (bash 3.2) handles `export`, spaces around `=`, a trailing ` #`
    comment, quotes, empty values, repeated keys (last wins) and the environment taking
    precedence; an empty existing `ENV_FILE` is replaced without `FORCE`.
- Not run: real IAM Identity Center sign-in, Secrets Manager and Cloudflare calls (owner).

## Judgment calls not covered by project_plan.md

- **The JSON-to-dotenv conversion is a tested TypeScript helper run in the dev container**, not
  `jq`, which is not on every host and cannot express the quoting rules above.
- **Values that Vite cannot read back exactly are rejected** instead of being written with a
  silent change.
- **Overwrite guard and atomic write with mode 600**, so a hand-written `.env.local` is never lost
  and a partial file is never left behind.
- **The push reads from AWS, not from `.env.local`**, so Secrets Manager stays the single source,
  and requires an explicit `PAGES_ENV` plus confirmation.
- `STORYBOOK_*` variables are embedded in the built Storybook (Storybook's documentation says not
  to put secrets there); `.env.local.sample` says so.
