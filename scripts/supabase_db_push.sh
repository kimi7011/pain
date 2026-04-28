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

if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
    echo "SUPABASE_DB_PASSWORD is required when linking the Supabase project in CI." >&2
    exit 1
  fi

  supabase \
    "${SUPABASE_ARGS[@]}" \
    link --project-ref "$PROJECT_REF" \
    -p "$SUPABASE_DB_PASSWORD" \
    --yes
fi

if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  exec supabase \
    "${SUPABASE_ARGS[@]}" \
    db push --linked -p "$SUPABASE_DB_PASSWORD" \
    "$@"
fi

exec supabase \
  "${SUPABASE_ARGS[@]}" \
  db push --linked \
  "$@"
