# Tasks

- [x] Add design.md / task.md
- [x] Add @playwright/test, playwright.config.ts, the Dockerfile `vrt` stage, the compose `vrt` service and `make vrt` / `make vrt-update`
- [x] Add tests/vrt/stories.ts with Vitest tests, the Playwright image version convention test, and the tsconfig / Vitest wiring
- [x] Add tests/vrt/stories.spec.ts (story enumeration, themes, viewports, `parameters.vrt`, orphan baselines)
- [x] Create the baselines with `make vrt-update`; check that `make vrt` passes twice, that a visual change fails, and that `parameters.vrt` and the orphan check work (temporary edits, reverted)
- [x] Update project_plan.md, CLAUDE.md and the component-reviewer agent
- [x] Run `make format`, `make ci` and `make local-ci`, run the component-reviewer, then hand back
