# syntax=docker/dockerfile:1

# Keep the major in sync with .nvmrc and engines.node in package.json.
ARG NODE_VERSION=26

# --- base: Node.js + the pnpm version pinned in package.json ---------------------------------
FROM node:${NODE_VERSION}-trixie-slim AS base

WORKDIR /app

# Node.js 25+ no longer bundles Corepack, so pnpm is installed with npm. The version comes from
# the packageManager field so that package.json stays the single source of truth.
COPY package.json /tmp/package.json
RUN npm install --global "pnpm@$(node -p "require('/tmp/package.json').packageManager.split('@')[1].split('+')[0]")" \
  && npm cache clean --force \
  && rm /tmp/package.json

# node_modules is a named volume in compose.yaml. Creating the directory here makes the volume
# owned by the node user, and keeping the pnpm store inside it lets pnpm hard-link packages.
ENV npm_config_store_dir=/app/node_modules/.pnpm-store
RUN mkdir -p /app/node_modules && chown -R node:node /app

USER node

# --- dev: Storybook dev server; the source is bind-mounted by compose.yaml --------------------
FROM base AS dev

# Listen on every interface so the published port is reachable from the host. The host-side
# `pnpm dev` keeps Storybook's default of localhost only.
ENV SBCONFIG_HOSTNAME=0.0.0.0

EXPOSE 5070

CMD ["pnpm", "run", "dev", "--ci"]

# --- build: self-contained build of the package and every product's Storybook --------------
FROM base AS build

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# uid/gid 1000 is the node user of the official image.
RUN --mount=type=cache,target=/home/node/.cache/pnpm-store,uid=1000,gid=1000 \
  npm_config_store_dir=/home/node/.cache/pnpm-store pnpm install --frozen-lockfile

COPY --chown=node:node . .
RUN pnpm run build && pnpm run build-storybook:all

# --- vrt: Playwright visual regression test (docs/project_plan.md section 11) ----------------
# The official image fixes the browser build, fonts and system libraries, so screenshots match
# between machines and CI. Keep the tag equal to @playwright/test in package.json (checked by
# src/conventions.test.ts). Only @playwright/test is installed: the suite needs nothing else, and
# the image's Node.js does not match engines.node. compose.yaml bind-mounts the config, tests/vrt
# and dist/storybook.
FROM mcr.microsoft.com/playwright:v1.64.1-noble AS vrt

WORKDIR /app
COPY package.json /tmp/package.json
RUN chown pwuser:pwuser /app \
  && su pwuser -c "npm install --no-save --no-package-lock --no-audit --no-fund \
    @playwright/test@$(node -p "require('/tmp/package.json').devDependencies['@playwright/test']")" \
  && rm /tmp/package.json

# pwuser is uid 1001, the same as the GitHub Actions runner user.
USER pwuser

CMD ["npx", "playwright", "test"]

# --- preview: nginx serving the build with the same clean-URL rule as Cloudflare -------------
# Kept as the last stage, so a build without --target produces this image.
# The unprivileged image runs nginx as a non-root user and listens on 8080.
FROM nginxinc/nginx-unprivileged:1.30-alpine AS preview

COPY deploy/local/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/storybook /usr/share/nginx/html

EXPOSE 8080
