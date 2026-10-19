# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Storybook-based UI component catalog template (React + TypeScript + Tailwind CSS v4), deployed
per productId to Cloudflare Pages and published to npm. The full specification is
`docs/project_plan.md`; read the relevant section before starting any task.

## Top-level rules

- **Think exclusively in English, but respond to the user in Japanese.**
- Run independent tool calls **in parallel**, not sequentially.
- **No emojis** anywhere (code, comments, docs, commits, PRs).

## Language conventions

- **Everything written into the repository is English**: code, all comments (JSDoc, structural
  comments, and comments explaining the reasoning behind an implementation), documentation,
  per-task docs under `docs/`, commit messages and PR descriptions.
- The only exception is `README_JA.md`, which is Japanese and mirrors `README.md`.
- Conversation with the user in the Claude Code CLI is Japanese; that does not change the language
  of anything committed.

## Coding conventions

Summary of `docs/project_plan.md` §3, §4, §10 and §13:

- Layout: `src/shared/components/{category}/{Component}/` and
  `src/products/{productId}/components/{category}/{Component}/`. `{category}` is lower-case
  kebab-case.
- Each component directory contains exactly `Component.tsx`, `Component.stories.tsx`,
  `Component.test.tsx` and `index.ts`, and the component is re-exported from the scope's
  `index.ts` (`src/shared/index.ts` or `src/products/{productId}/index.ts`).
- Story `title` is `{Category}/{Component}` (no productId), and every story file exports a
  `Default` story, because clean URLs (`/{productId}/c/{category}/{component}`) point at
  `--default`. Titles must be unique across `shared` and each product.
- Styling: Tailwind utilities only, always with the `uic:` prefix; no per-component CSS files; no
  arbitrary values (`bg-[#123456]`); colors, spacing, radius and fonts come from the `@theme`
  tokens in `src/styles/theme.css`.
- Components must not rely on preflight (it is not shipped); set what you need explicitly, e.g.
  `uic:border uic:border-solid`.
- Merge classes with `cn()` (`src/lib/cn.ts`) and accept a `className` prop; define variants with
  cva.
- Dependency direction: products may import `shared`; `shared` never imports products; products
  never import each other.
- No a11y addon violations. Optional per-story VRT settings go in `parameters.vrt`:
  `{ disable?: boolean; viewports?: ('desktop' | 'mobile')[] }` (validated by `tests/vrt/stories.ts`).
- After a visual change or a new story, run `make vrt-update` and review the changed baselines in
  `tests/vrt/__screenshots__/`; delete the baselines of removed or renamed stories, and of stories or viewports you exclude
  with `parameters.vrt` (the orphan check cannot see those).

## Libraries and tooling

- To learn a library/framework API, **use the Context7 MCP** for current docs rather than memory —
  especially Storybook, Tailwind CSS v4, Vitest, Playwright, tsdown and Changesets, which move fast.
  For Cloudflare (Pages, `_redirects`, wrangler), use the Cloudflare documentation search.
- Docker is the default environment. Run commands through `make` targets (`make help` lists them);
  `local-*` targets exist for running on the host.
- Hidden folders (e.g. `.tmp`) may be missed by directory listings; find them with `Glob`
  (`**/.tmp/**`) or `Bash` (`find`).

## Mutation policy (important)

**Claude must not run any command that changes data or remote/online state.** This covers:

- **git writes**: `add`, `commit`, `push`, `checkout`, `switch`, `branch`, `merge`, `reset`,
  `rebase`, `tag`, `remote`, `stash`. Read-only git (`status`, `diff`, `log`, `show`, `ls-files`)
  is fine.
- **Deploys and Cloudflare state**: `wrangler deploy`, `wrangler pages deploy`,
  `wrangler secret` / `wrangler pages secret`, `wrangler pages project`, `wrangler kv`,
  `wrangler r2`, `wrangler d1`, and mutating Cloudflare MCP tools (`*_create`, `*_delete`,
  `*_update`, `*_edit`, `d1_database_query`). Local `wrangler dev` and builds are allowed.
- **Publishing / releases**: `npm publish`, `pnpm publish`, `changeset publish` (in any form),
  `npm dist-tag`, `npm unpublish`, `npm deprecate`, `docker push`, `make secrets-push-cloudflare`,
  `make deploy*`, `make release*`. `changeset` (creating a changeset file) and `changeset version`
  only change local files and are allowed.
- **Secrets stores**: any `aws secretsmanager` write (`put-secret-value`, `create-secret`,
  `update-secret`, `delete-secret`). Reading via `make secrets-pull-aws` needs the user's
  interactive `aws sso login`, so ask the user to run it.
- **Remote GitHub changes**: `gh pr create/merge/close/edit`, `gh release`, `gh api`, `gh secret`,
  `gh variable`, `gh workflow run`, `gh repo create/edit/delete`, `gh issue create/edit/close`,
  `gh label`.
- **Database CLIs**: `psql`, `mysql`, `mongosh`, `redis-cli`, `sqlite3`.

Most of the above are denied in `.claude/settings.json` (defense in depth). When such an action is
needed: **do not run it** — prepare the change and give the user the exact command(s) with a
one-line reason. Never commit automatically; present the diff and a proposed commit message, then
wait.

## Development workflow

Branches: `main` (production), `develop` (integration). Feature branches are named `feature/...`,
cut from `develop`, and merged back into `develop` via PR. Per-task docs live under
`docs/{yyyy-mm-dd}_{NN}_{overview}/` and are written in English.

1. Use the **`/new-task`** skill: enter plan mode, then write `design.md` (requirements/design).
2. Break the design into a `task.md` checklist, each item sized to one commit.
3. Give the user the branch commands to start (`git switch develop && git pull` then
   `git switch -c feature/...`).
4. Implement; **update `task.md`** as items complete. Use **`/new-component`** to add components.
5. If the change is user-visible in the published package, add a changeset (`make changeset`).
6. Run `make format` and `make ci` before handing back. If `README.md` or `README_JA.md` changed,
   run the `readme-sync` agent.
7. Have the `component-reviewer` subagent review the diff, then present it for the user to commit.

## Subagents and skills

- **`component-reviewer`** (agent): reviews diffs against the coding conventions above (tokens and
  prefix, cn/cva, component layout and exports, story naming, dependency direction, a11y,
  language). Run before every handoff.
- **`readme-sync`** (agent): keeps `README.md` and `README_JA.md` structurally identical.
- **`/new-task`** (skill): scaffolds `design.md` + `task.md` for a new unit of work.
- **`/new-component`** (skill): scaffolds a component directory (component, story, test, index)
  and wires its export.

## Pull requests

When asked to prepare a PR (the user runs `gh` / creates it), the base branch is `develop` (or
`main` for a release PR), and the description uses:

- **Title**: brief summary.
- **Key Changes**: what changed and anything reviewers should watch.
- **Testing**: which tests pass, which were added, and the exact command to run them.
- **Related Tasks**: links/numbers.
- **Other**: additional notes, including judgment calls not covered by `docs/project_plan.md`.

## Task-completion notifications

Completion notifications are emitted automatically by the **`Stop` hook** in `.claude/settings.json`
(the harness runs it every turn). Do **not** also send `osascript` notifications manually — that
would double-notify.
