# Single entry point for every command (docs/project_plan.md section 6).
# Targets run inside Docker by default; the local-* targets run the same pnpm scripts on the host.

.DEFAULT_GOAL := help

# Forward PRODUCT_ID only when it is given (e.g. `make dev PRODUCT_ID=sample`); otherwise
# .env.docker, then the default in compose.yaml, applies.
COMPOSE := $(if $(PRODUCT_ID),PRODUCT_ID='$(PRODUCT_ID)') docker compose $(if $(wildcard .env.docker),--env-file .env.docker)
# One-off container for tool commands. It publishes no ports, so it also works while `make up` runs.
RUN := $(COMPOSE) run --rm storybook
# Node.js and Wrangler for the secrets scripts, which run on the host (for the AWS CLI) and pipe
# values through stdin, hence -T. The Cloudflare credentials are passed through from the host.
SECRETS_NODE := docker compose $(if $(wildcard .env.docker),--env-file .env.docker) run --rm -T storybook node
SECRETS_WRANGLER := docker compose $(if $(wildcard .env.docker),--env-file .env.docker) run --rm -T \
	-e CLOUDFLARE_API_TOKEN -e CLOUDFLARE_ACCOUNT_ID storybook pnpm exec wrangler

##@ General

.PHONY: help
help: ## List targets
	@awk 'BEGIN {FS = ":.*## "} \
		/^##@/ {printf "\n%s\n", substr($$0, 5)} \
		/^[a-zA-Z0-9_-]+:.*## / {printf "  %-30s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: setup
setup: ## Copy .env.*.sample files (never overwrites), build the image and install dependencies
	@for sample in .env.*.sample; do \
		[ -e "$$sample" ] || continue; \
		target="$${sample%.sample}"; \
		if [ -e "$$target" ]; then echo "Kept existing $$target"; \
		else cp "$$sample" "$$target" && echo "Created $$target from $$sample"; fi; \
	done
	$(COMPOSE) build
	$(RUN) pnpm install --frozen-lockfile

##@ Docker

.PHONY: dev
dev: ## Start the Storybook dev server in the foreground (PRODUCT_ID=sample, http://localhost:5070)
	$(COMPOSE) up storybook

.PHONY: up
up: ## Start the Storybook dev server in the background
	$(COMPOSE) up --detach storybook

.PHONY: preview
preview: ## Build every productId and serve it with nginx in the foreground (http://localhost:5071)
	$(COMPOSE) --profile preview up --build preview

.PHONY: down
down: ## Stop and remove the containers, including preview
	$(COMPOSE) --profile '*' down

.PHONY: logs
logs: ## Follow the dev server logs
	$(COMPOSE) logs --follow storybook

.PHONY: shell
shell: ## Open a shell in a one-off container
	$(RUN) bash

.PHONY: install
install: ## Install dependencies; with PKG, add a package pinned exactly (PKG="-D name" for dev)
	$(RUN) pnpm $(if $(PKG),add --save-exact $(PKG),install)

.PHONY: lint
lint: ## Run ESLint
	$(RUN) pnpm run lint

.PHONY: format
format: ## Format every file with Prettier
	$(RUN) pnpm run format

.PHONY: typecheck
typecheck: ## Type-check with tsc
	$(RUN) pnpm run typecheck

.PHONY: test
test: ## Run unit tests with coverage
	$(RUN) pnpm run test

.PHONY: test-watch
test-watch: ## Run unit tests in watch mode
	$(RUN) pnpm run test:watch

.PHONY: build
build: ## Build the npm package into dist (tsdown, styles.css, theme.css)
	$(RUN) pnpm run build

.PHONY: build-storybook
build-storybook: ## Rebuild dist/storybook with every productId (or only PRODUCT_ID) and the portal
	$(RUN) pnpm run build-storybook:all $(PRODUCT_ID)

.PHONY: ci
ci: ## Run the CI checks (format check, lint, typecheck, tests, package build and checks, Storybook build)
	$(RUN) pnpm run ci

.PHONY: vrt
vrt: ## Rebuild every Storybook and run the visual regression test in the Playwright image
	$(RUN) pnpm run build-storybook:all
	@# Created here so that Docker does not create the bind-mount sources as root.
	mkdir -p test-results playwright-report
	$(COMPOSE) --profile vrt run --rm --build vrt

.PHONY: vrt-update
vrt-update: ## Rebuild every Storybook and update the changed or missing VRT baselines
	$(RUN) pnpm run build-storybook:all
	mkdir -p test-results playwright-report
	$(COMPOSE) --profile vrt run --rm --build vrt node_modules/.bin/playwright test --update-snapshots=changed

.PHONY: new-product
new-product: ## Scaffold src/products/PRODUCT_ID and add its package export (PRODUCT_ID is required)
	$(if $(PRODUCT_ID),,$(error PRODUCT_ID is required, e.g. make new-product PRODUCT_ID=acme-web))
	$(RUN) pnpm run new-product '$(PRODUCT_ID)'

.PHONY: changeset
changeset: ## Add a changeset for a change to the published package (interactive)
	$(RUN) pnpm run changeset

.PHONY: clean
clean: ## Remove the containers, the node_modules volume and the built images
	$(COMPOSE) --profile '*' down --volumes --rmi local

##@ Secrets (AWS CLI v2 on the host; settings in .env.docker or on the command line)

.PHONY: secrets-pull-aws
secrets-pull-aws: ## Generate .env.local from the AWS Secrets Manager secret AWS_SECRET_ID (aws sso login if needed)
	SECRETS_NODE='$(SECRETS_NODE)' scripts/secrets-pull-aws.sh

.PHONY: secrets-push-cloudflare
secrets-push-cloudflare: ## Push that secret to Cloudflare Pages as secrets (PAGES_ENV=production|preview). Changes remote state
	SECRETS_NODE='$(SECRETS_NODE)' WRANGLER='$(SECRETS_WRANGLER)' scripts/secrets-push-cloudflare.sh

##@ Host (requires Node.js and pnpm on the host)

.PHONY: local-install
local-install: ## Install dependencies on the host
	pnpm install --frozen-lockfile

.PHONY: local-dev
local-dev: ## Start the Storybook dev server on the host
	$(if $(PRODUCT_ID),PRODUCT_ID='$(PRODUCT_ID)') pnpm run dev

.PHONY: local-lint
local-lint: ## Run ESLint on the host
	pnpm run lint

.PHONY: local-format
local-format: ## Format every file with Prettier on the host
	pnpm run format

.PHONY: local-typecheck
local-typecheck: ## Type-check on the host
	pnpm run typecheck

.PHONY: local-test
local-test: ## Run unit tests with coverage on the host
	pnpm run test

.PHONY: local-build
local-build: ## Build the npm package into dist on the host
	pnpm run build

.PHONY: local-build-storybook
local-build-storybook: ## Rebuild dist/storybook with every productId (or only PRODUCT_ID) on the host
	pnpm run build-storybook:all $(PRODUCT_ID)

.PHONY: local-ci
local-ci: ## Run the CI checks on the host
	pnpm run ci

.PHONY: local-new-product
local-new-product: ## Scaffold src/products/PRODUCT_ID on the host (PRODUCT_ID is required)
	$(if $(PRODUCT_ID),,$(error PRODUCT_ID is required, e.g. make local-new-product PRODUCT_ID=acme-web))
	pnpm run new-product '$(PRODUCT_ID)'

.PHONY: local-secrets-pull-aws
local-secrets-pull-aws: ## Generate .env.local from AWS Secrets Manager with Node.js on the host
	scripts/secrets-pull-aws.sh

.PHONY: local-secrets-push-cloudflare
local-secrets-push-cloudflare: ## Push the secret to Cloudflare Pages with Node.js and Wrangler on the host
	scripts/secrets-push-cloudflare.sh

.PHONY: local-changeset
local-changeset: ## Add a changeset on the host (interactive)
	pnpm run changeset
