#!/usr/bin/env bash
# Pushes the variables of an AWS Secrets Manager secret to a Cloudflare Pages project as secrets
# (docs/project_plan.md section 7). Optional, one direction only (Cloudflare secrets cannot be read
# back), and it CHANGES REMOTE STATE: it asks for confirmation unless YES=1. Run through
# `make secrets-push-cloudflare` (or the local- variant).
#
# Settings, from the environment first and then from .env.docker:
#   AWS_SECRET_ID, AWS_PROFILE, AWS_REGION  as for scripts/secrets-pull-aws.sh
#   CLOUDFLARE_PROJECT_NAME                 the Pages project
# From the environment (or the make command line) only, so they are chosen on every run:
# PAGES_ENV (production or preview; no default), CLOUDFLARE_API_TOKEN (Account / Cloudflare
# Pages / Edit) and CLOUDFLARE_ACCOUNT_ID.
# The names are listed from one read of the secret and the values pushed from a second read after
# the confirmation, so a change to the secret in between is pushed as well. Also: SECRETS_NODE and WRANGLER (commands that run Node.js and Wrangler;
# default node and pnpm exec wrangler).
#
# The values go from the AWS CLI through stdin to Wrangler and are never written to disk.
set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib/aws-secrets.sh
source scripts/lib/aws-secrets.sh

secret_id="$(setting AWS_SECRET_ID)"
profile="$(setting AWS_PROFILE)"
region="$(setting AWS_REGION)"
project="$(setting CLOUDFLARE_PROJECT_NAME)"
pages_env="${PAGES_ENV:-}"
read -r -a node_cmd <<<"${SECRETS_NODE:-node}"
read -r -a wrangler_cmd <<<"${WRANGLER:-pnpm exec wrangler}"

[[ -n "$secret_id" ]] || fail "AWS_SECRET_ID is not set (in .env.docker or the environment)."
[[ -n "$project" ]] || fail "CLOUDFLARE_PROJECT_NAME is not set (in .env.docker or the environment)."
[[ "$pages_env" == "production" || "$pages_env" == "preview" ]] ||
  fail "PAGES_ENV must be production or preview, e.g. make secrets-push-cloudflare PAGES_ENV=preview."
for name in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID; do
  [[ -n "${!name:-}" ]] || fail "$name is not set in the environment."
done
command -v aws >/dev/null || fail "the AWS CLI v2 is required on the host: https://aws.amazon.com/cli/"

aws_args=()
[[ -n "$profile" ]] && aws_args+=(--profile "$profile")
[[ -n "$region" ]] && aws_args+=(--region "$region")

ensure_aws_session ${aws_args[@]+"${aws_args[@]}"}

# The names come from a separate read, so the values stay in pipes.
names="$(fetch_secret "$secret_id" ${aws_args[@]+"${aws_args[@]}"} |
  "${node_cmd[@]}" scripts/secrets-to-env.ts --format names)"
[[ -n "$names" ]] || fail "$secret_id has no variables."
count="$(wc -l <<<"$names" | tr -d ' ')"

echo "Variables in $secret_id:"
while IFS= read -r name; do echo "  $name"; done <<<"$names"
if [[ "${YES:-}" != "1" ]]; then
  [[ -t 0 ]] || fail "no terminal to confirm on; rerun with YES=1 to push without asking."
  read -r -p "Push $count secrets to the Pages project $project ($pages_env) in account $CLOUDFLARE_ACCOUNT_ID? [y/N] " answer ||
    answer=""
  [[ "$answer" == "y" || "$answer" == "Y" ]] || fail "cancelled; nothing was pushed."
fi

fetch_secret "$secret_id" ${aws_args[@]+"${aws_args[@]}"} |
  "${node_cmd[@]}" scripts/secrets-to-env.ts --format json |
  "${wrangler_cmd[@]}" pages secret bulk --project-name "$project" --env "$pages_env"
echo "Pushed $count secrets to $project ($pages_env)."
