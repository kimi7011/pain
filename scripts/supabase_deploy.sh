#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT_DIR/scripts/load_supabase_env.sh"

PROJECT_REF="$SUPABASE_PROJECT_REF"
PROFILE="$SUPABASE_PROFILE"
SUPABASE_ARGS=(--workdir "$ROOT_DIR")

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  SUPABASE_ARGS+=(--profile "$PROFILE")
fi

exec supabase \
  "${SUPABASE_ARGS[@]}" \
  functions deploy api \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt \
  "$@"
