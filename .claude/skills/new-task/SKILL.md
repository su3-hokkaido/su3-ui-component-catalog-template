---
name: new-task
description: Scaffold the requirements/design and task-breakdown documents for a new unit of work, following this project's development workflow. Use at the start of any non-trivial task, before writing code, when the user asks to "start a task", "plan X", or "create the design doc".
---

# new-task

Create the paired planning documents this project requires before implementation begins.

## Steps

1. Determine today's date in `yyyy-mm-dd` form and choose the next zero-padded sequence number `NN`
   by listing existing directories under `docs/`. Pick a short kebab `overview` slug.
   The target directory is `docs/{yyyy-mm-dd}_{NN}_{overview}/`.

2. Enter plan mode and clarify requirements with the user first if anything is ambiguous. Do not
   write code yet.

3. Write `design.md` in that directory with, at minimum:
   - Background / why (link to the relevant section of `docs/project_plan.md`)
   - Requirements and non-goals
   - Technical approach and key decisions (stack: Next.js + TS, Cloudflare Pages/Functions, next-intl)
   - Affected files/directories and any i18n or design-token impact

4. Write `task.md` in the same directory as a Markdown checklist. Break the work into units small
   enough that each maps to a single commit. Example:
   ```markdown
   # Tasks
   - [ ] Add tokens for the new section in src/styles/tokens.ts
   - [ ] Build the section component in src/sections/
   - [ ] Add i18n keys across all six locales
   - [ ] Add Vitest coverage
   - [ ] Wire the section into the page
   ```

5. Suggest the branch command for the user to run (Claude must not run git):
   `git switch -c feature/{overview}`.

6. As implementation proceeds, keep `task.md` updated by checking items off. This is mandatory.

## Notes

- Documentation content (design.md/task.md prose) may be Japanese since it is for the user; keep
  code identifiers and any embedded code English.
- Do not use emojis.
