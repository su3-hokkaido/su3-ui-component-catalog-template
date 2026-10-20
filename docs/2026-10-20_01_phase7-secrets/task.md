# Tasks

- [x] Add design.md / task.md
- [x] Add scripts/lib/secrets.ts with Vitest tests (including a round trip through Vite's loadEnv) and scripts/secrets-to-env.ts
- [x] Add scripts/secrets-pull-aws.sh, `.env.local.sample`, the AWS settings in `.env.docker.sample` and the `secrets-pull-aws` Makefile targets
- [x] Add scripts/secrets-push-cloudflare.sh and the `secrets-push-cloudflare` Makefile targets
- [x] Update project_plan.md (CLAUDE.md needs no change)
- [x] Verify (shellcheck, stub `aws` / `wrangler` end-to-end runs against a scratch file), run `make format` and `make ci`, run the component-reviewer, then hand back
