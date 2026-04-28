#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT_DIR/scripts/load_project_binding.sh"

cd "$ROOT_DIR"

git config --local user.name "$GIT_USER_NAME"
git config --local user.email "$GIT_USER_EMAIL"
git remote set-url origin "$GIT_REMOTE_URL"
git remote set-url --push origin "$GIT_REMOTE_URL"

if command -v gh >/dev/null 2>&1; then
  if gh auth status --hostname github.com >/dev/null 2>&1; then
    if ! gh auth status --hostname github.com 2>&1 | grep -q "Logged in to github.com account $GITHUB_ACCOUNT"; then
      echo "[binding] GitHub account $GITHUB_ACCOUNT is not logged in to gh." >&2
      exit 1
    fi
    gh auth switch --hostname github.com --user "$GITHUB_ACCOUNT" >/dev/null
  else
    echo "[binding] gh is not authenticated. Run: gh auth login -h github.com -s repo,workflow" >&2
    exit 1
  fi
fi

if [[ ! -f "$ROOT_DIR/.env.supabase.local" ]]; then
  echo "[binding] Missing .env.supabase.local; copy .env.supabase.local.example and fill secrets." >&2
  exit 1
fi

echo "[binding] Activated $PROJECT_NAME"
echo "[binding] GitHub: $GITHUB_REPO as $GITHUB_ACCOUNT"
echo "[binding] Supabase: $SUPABASE_PROJECT_NAME / $SUPABASE_PROJECT_REF / $SUPABASE_ORG_ID"
