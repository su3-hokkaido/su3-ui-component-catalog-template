# Phase 8: README / README_JA / CLAUDE.md — Design

## Background

`docs/project_plan.md` §14 step 8, implementing §12. After Phase 7 the template is complete, but
`README.md` is a single heading and `README_JA.md` does not exist. Earlier phases deferred their
user-facing documentation to this phase: the consumer CSS patterns (Phase 4 PoC), the VRT baseline
review (Phase 5), the owner's one-time GitHub / Cloudflare / npm setup (Phase 6) and the secrets
workflow (Phase 7). §3 also lists `deploy/aws/` and `deploy/azure/` as "README only".

## Requirements

- `README.md` in English with the nine sections of §12, in order, starting with
  `[日本語はこちら](./README_JA.md)`.
- `README_JA.md` in Japanese with the same headings in the same order and identical code blocks,
  starting with `[English](./README.md)`; checked by the `readme-sync` agent.
- README lists every place a fork must change (§9, §10), documents both consumer CSS patterns
  with code (§10), the baseline review process (§11), the release flow and back-merge (§8), the
  owner setup, the secrets store choice (§7) and switching the deploy target (§8).
- `CLAUDE.md`: coding and directory conventions, the component checklist and `make ci` before
  handing back (§12 Other).
- `deploy/aws/README.md` and `deploy/azure/README.md` (§3).

## Non-goals

- `CONTRIBUTING.md` (optional in §12): README's release flow, the PR template and `CLAUDE.md`
  cover contribution.
- Testing the AWS / Azure guides; they are outlines.
- Changing code or behavior.

## Technical approach

- Every fact in README comes from the implemented files (`make help`, `package.json`, the
  workflows, the scripts, the phase design docs), not from the plan alone.
- README is written for two readers: someone adopting the template (quick start, structure,
  "Using this template") and someone consuming the package (installation, CSS patterns).
- The command table mirrors `make help`, grouped the same way.
- `README_JA.md` is translated section by section; code blocks, paths and commands are copied
  byte for byte.
- A scratch script checks that every relative link resolves, every `make` target mentioned exists
  and every package sub-path mentioned is in `exports`.

## Affected files

- New: `README_JA.md`, `deploy/aws/README.md`, `deploy/azure/README.md`.
- Modified: `README.md`, `CLAUDE.md`, `docs/project_plan.md` (§3, §12, §17), `package.json`
  (`repository`, found missing in review: npm provenance checks that `repository.url` matches the
  publishing GitHub repository, so the first automated publish would fail without it).
- Design tokens, package `exports`, story titles, clean URLs, VRT baselines: unaffected.
  `README.md` is not in the published package's `files`, but npm always includes it, so the npm
  page shows it.

## Verification (results)

- readme-sync agent: the 21 headings match in level and order, every code block is byte-identical,
  the language links are in place; it translated the descriptive words of the tech stack table.
- A scratch script checked every relative link, `make` target, repository path and package
  sub-path named in README, README_JA, the deploy READMEs and CLAUDE.md. The only hits were
  intentional: example paths (`src/products/acme-web/...`), the future `deploy/aws/deploy.sh`,
  the `make local-<target>` pattern and the `make deploy*` / `make release*` names in the
  mutation policy.
- component-reviewer: checked README against the Makefile, package.json, the workflows, scripts,
  styles and VRT config; its findings (missing `repository`, "every command has a local- variant",
  the push settings, `--access public` for scoped names, where duplicate titles fail, what
  `/new-component` creates, two checklist items) are applied.
- `make format` and `make ci` pass.

## Judgment calls not covered by project_plan.md

- **No `CONTRIBUTING.md`** (see non-goals).
- **The AWS and Azure guides are labelled as untested outlines**, because nothing in CI exercises
  them.
