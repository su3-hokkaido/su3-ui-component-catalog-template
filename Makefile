# Single entry point for every command (docs/project_plan.md section 6).
# Targets run inside Docker by default; the local-* targets run the same pnpm scripts on the host.

.DEFAULT_GOAL := help

# Forward PRODUCT_ID only when it is given (e.g. `make dev PRODUCT_ID=sample`); otherwise
# .env.docker, then the default in compose.yaml, applies.
COMPOSE := $(if $(PRODUCT_ID),PRODUCT_ID='$(PRODUCT_ID)') docker compose $(if $(wildcard .env.docker),--env-file .env.docker)
# One-off container for tool commands. It publishes no ports, so it also works while `make up` runs.
RUN := $(COMPOSE) run --rm storybook

##@ General

.PHONY: help
help: ## List targets
	@awk 'BEGIN {FS = ":.*## "} \
		/^##@/ {printf "\n%s\n", substr($$0, 5)} \
		/^[a-zA-Z0-9_-]+:.*## / {printf "  %-24s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

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

.PHONY: new-product
new-product: ## Scaffold src/products/PRODUCT_ID and add its package export (PRODUCT_ID is required)
	$(if $(PRODUCT_ID),,$(error PRODUCT_ID is required, e.g. make new-product PRODUCT_ID=acme-web))
	$(RUN) pnpm run new-product '$(PRODUCT_ID)'

.PHONY: clean
clean: ## Remove the containers, the node_modules volume and the built images
	$(COMPOSE) --profile '*' down --volumes --rmi local

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
