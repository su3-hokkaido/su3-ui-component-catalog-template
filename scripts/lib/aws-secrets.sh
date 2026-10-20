# shellcheck shell=bash
# Shared by scripts/secrets-pull-aws.sh and scripts/secrets-push-cloudflare.sh. Sourced, not run.

# Marker on the first line of a generated .env.local (MANAGED_MARKER in scripts/lib/secrets.ts).
readonly MANAGED_MARKER='# Managed by make secrets-pull-aws.'

fail() {
  echo "$(basename "$0"): $*" >&2
  exit 1
}

# Prints a setting: the environment variable when it is set, otherwise the last NAME=value line
# of .env.docker (read as plain text, never sourced). Like docker compose, it accepts `export `,
# drops a ` #` comment after an unquoted value, trims spaces and removes surrounding quotes.
setting() {
  local name="$1" value=""
  if [[ -n "${!name+set}" ]]; then
    printf '%s' "${!name}"
    return
  fi
  if [[ -f .env.docker ]]; then
    value="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${name}[[:space:]]*=" .env.docker |
      tail -n 1 | cut -d= -f2- | tr -d '\r')" || true
    value="${value#"${value%%[![:space:]]*}"}"
    if [[ "$value" == \"*\" || "$value" == \'*\' ]]; then
      value="${value:1:${#value}-2}"
    else
      value="${value%%[[:space:]]#*}"
      value="${value%"${value##*[![:space:]]}"}"
    fi
  fi
  printf '%s' "$value"
}

# True when the file starts with the managed marker, or is empty.
is_managed() {
  [[ ! -s "$1" || "$(head -n 1 "$1")" == "$MANAGED_MARKER" ]]
}

# Signs in with IAM Identity Center when the profile has no valid session. Arguments: the
# --profile / --region options for the AWS CLI.
ensure_aws_session() {
  if ! aws sts get-caller-identity "$@" >/dev/null 2>&1; then
    echo "No valid AWS session; running aws sso login (for a profile without IAM Identity" >&2
    echo "Center, check its credentials instead)." >&2
    aws sso login "$@"
  fi
}

# Prints the SecretString of a secret. Arguments: the secret id, then the AWS CLI options.
fetch_secret() {
  local secret_id="$1"
  shift
  aws secretsmanager get-secret-value "$@" --secret-id "$secret_id" \
    --query SecretString --output text
}
