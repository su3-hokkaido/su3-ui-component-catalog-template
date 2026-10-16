# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Please check `docs/project_plan.md`

## Top-level rules

- **Think exclusively in English, but respond to the user in Japanese.**
- Run independent tool calls **in parallel**, not sequentially.
- **No emojis** anywhere (code, comments, docs, commits, PRs).

## Language conventions for code

- **API docs** (JSDoc) and **structural comments** (Vitest labels, `zod-openapi` descriptions) in
  **English**.
- Comments explaining the **background/reasoning** of an implementation ("why") in **Japanese**.

## Libraries and tooling

- To learn a library/framework API, **use the Context7 MCP** for current docs rather than memory —
  especially for Next.js and next-intl, which move fast.
- Hidden folders (e.g. `.tmp`) may be missed by directory listings; find them with `Glob`
  (`**/.tmp/**`) or `Bash` (`find`).

## Mutation policy (important)

**Claude must not run any command that changes data or remote/online state.** This covers:

- **git writes**: `add`, `commit`, `push`, `checkout`, `branch`, `merge`, `reset`, `rebase`, `tag`,
  `remote`. Read-only git (`status`, `diff`, `log`, `show`) is fine.
- **Deploys / DB via wrangler**: `wrangler deploy`, `wrangler pages deploy`, `wrangler d1`. Local
  `wrangler dev` and builds are allowed. Also blocked: `vercel`, `netlify`, `npm/pnpm publish`,
  `make deploy*`.
- **Database mutations**: `psql`, `mysql`, `mongosh`, `redis-cli`, `sqlite3`, `prisma migrate`,
  `prisma db push`, `drizzle-kit push`.
- **Remote GitHub changes**: `gh pr create/merge/close/edit`, `gh release`, `gh api`, `gh secret`,
  `gh workflow run`.

All of the above are denied in `.claude/settings.json` (defense in depth). When such an action is
needed: **do not run it** — prepare the change and give the user the exact command(s) with a
one-line reason. Branch names start with `feature/`. Never commit automatically; present the diff
and a proposed commit message, then wait.

## Development workflow

Per-task docs live under `docs/{yyyy-mm-dd}_{NN}_{overview}/`.

1. Use the **`/new-task`** skill: enter plan mode, then write `design.md` (requirements/design).
2. Break the design into a `task.md` checklist, each item sized to one commit.
3. Give the user the `git switch -c feature/...` command to start.
4. Implement; **update `task.md`** as items complete.
5. Run `make lint typecheck test` and the formatter before handing back.
6. Have the `component-reviewer` subagent review the diff, then present it for the user to commit.

## Subagents and skills

- **`i18n-translator`** (agent): keeps the six locale catalogs complete and in sync.
- **`component-reviewer`** (agent): reviews diffs for design-token / modularization / i18n /
  external-fallback compliance. Run before every handoff.
- **`/new-task`** (skill): scaffolds `design.md` + `task.md` for a new unit of work.
- **`/add-i18n-key`** (skill): adds/renames a message key across all six locales.

## Pull requests

When asked to prepare a PR (the user runs `gh` / creates it), use:

- **Title**: brief summary.
- **Key Changes**: what changed and anything reviewers should watch.
- **Testing**: which tests pass, which were added, and the exact command to run them.
- **Related Tasks**: links/numbers.
- **Other**: additional notes.

## Task-completion notifications

Completion notifications are emitted automatically by the **`Stop` hook** in `.claude/settings.json`
(the harness runs it every turn). Do **not** also send `osascript` notifications manually — that
would double-notify.
