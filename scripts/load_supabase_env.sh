#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

if [[ -f "$ROOT_DIR/.env.supabase.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.supabase.local"
  set +a
fi

: "${SUPABASE_PROJECT_REF:=vwkemmyigpykuxyunbec}"
: "${SUPABASE_PROFILE:=supabase}"

export SUPABASE_PROJECT_REF
export SUPABASE_PROFILE
