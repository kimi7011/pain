#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BINDING_FILE="$ROOT_DIR/.project-binding.env"
GITHUB_LOCAL_ENV="$ROOT_DIR/.env.github.local"

if [[ ! -f "$BINDING_FILE" ]]; then
  echo "Missing project binding file: $BINDING_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$BINDING_FILE"
if [[ -f "$GITHUB_LOCAL_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$GITHUB_LOCAL_ENV"
fi
set +a

export PROJECT_NAME
export GITHUB_ACCOUNT
export GITHUB_REPO
export GITHUB_DEFAULT_BRANCH
export GIT_REMOTE_URL
export GIT_USER_NAME
export GIT_USER_EMAIL
export SUPABASE_PROJECT_REF
export SUPABASE_PROJECT_NAME
export SUPABASE_ORG_ID
export SUPABASE_URL
export SUPABASE_FUNCTION_NAME
