# Changesets

Each pull request that changes the published package adds a changeset here with `make changeset`
(or `pnpm run changeset`): pick the bump (major / minor / patch) and describe the change for the
changelog. Changes that do not reach the package (docs, workflows, stories only) need none.

On `main`, `.github/workflows/release.yml` turns the pending changesets into a Version Packages
pull request; merging it tags `vX.Y.Z`, creates the GitHub Release and publishes to npm. See
`docs/project_plan.md` sections 8 and 9 and https://changesets.dev.
