# Tasks

- [x] Add design.md / task.md
- [x] Move the Node.js constraint from `engines` to `devEngines`, with a convention test and updated Dockerfile comments
- [x] Add Changesets (`@changesets/cli`, `.changeset/config.json`, scripts, `make changeset`, the initial changeset)
- [x] Add the composite setup action, `ci.yml` and `vrt.yml`
- [x] Add `deploy/cloudflare/deploy.sh`, `_deploy.yml`, `deploy_dev.yml` and `deploy_prod.yml`
- [x] Add `release.yml` (publish guard, back-merge PR)
- [x] Add Dependabot for GitHub Actions and the PR / issue templates
- [x] Update project_plan.md and CLAUDE.md
- [x] Verify (actionlint, zizmor, shellcheck, `changeset version` in a copy, `pnpm pack`, `CI=true make vrt`), run `make format` and `make ci`, run the component-reviewer, then hand back
