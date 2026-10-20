#!/usr/bin/env bash
# Deploys dist/storybook (built by `pnpm run build-storybook:all`) to Cloudflare Pages
# (docs/project_plan.md sections 4 and 8). Called by .github/workflows/_deploy.yml; switching to
# another cloud replaces this script and that workflow.
#
# Usage: deploy/cloudflare/deploy.sh <branch>
#   The Pages project's production branch (main) deploys to production; any other branch deploys
#   a preview at its branch alias, e.g. https://develop.<project>.pages.dev.
#
# Environment: CLOUDFLARE_API_TOKEN (Account / Cloudflare Pages / Edit), CLOUDFLARE_ACCOUNT_ID,
# CLOUDFLARE_PROJECT_NAME. When GITHUB_OUTPUT is set, the deployment URL is written to it as `url`.
set -euo pipefail

branch="${1:-}"
site_dir="dist/storybook"

fail() {
  echo "deploy.sh: $*" >&2
  exit 1
}

[[ -n "$branch" ]] || fail "usage: deploy/cloudflare/deploy.sh <branch>"
for name in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_PROJECT_NAME; do
  [[ -n "${!name:-}" ]] || fail "$name is not set."
done
[[ -f "$site_dir/index.html" && -f "$site_dir/_redirects" ]] ||
  fail "$site_dir is incomplete; run pnpm run build-storybook:all first."

# Wrangler writes one JSON object per line here, including the deployment URL.
output_file="$(mktemp)"
trap 'rm -f "$output_file"' EXIT

WRANGLER_OUTPUT_FILE_PATH="$output_file" pnpm exec wrangler pages deploy "$site_dir" \
  --project-name "$CLOUDFLARE_PROJECT_NAME" \
  --branch "$branch" \
  ${GITHUB_SHA:+--commit-hash "$GITHUB_SHA"}

# The branch alias is stable across deployments; fall back to the per-deployment URL.
# The URL is informational: a parse failure must not fail a deployment that succeeded.
url="$(jq -r 'select(.type == "pages-deploy-detailed") | .alias // .url' "$output_file" 2>/dev/null | tail -n 1 || true)"
echo "Deployed $branch to ${url:-Cloudflare Pages}"
if [[ -n "${GITHUB_OUTPUT:-}" && -n "$url" ]]; then
  echo "url=$url" >>"$GITHUB_OUTPUT"
fi
