#!/usr/bin/env python3
"""檢查 repo-local GitHub / Supabase 綁定，避免切換專案後用錯帳號。"""

from __future__ import annotations

import json
import os
import shlex
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BINDING_FILE = ROOT / ".project-binding.env"


def run(args: list[str], *, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )


def parse_binding() -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in BINDING_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = shlex.split(value)[0] if value.strip() else ""
    return values


def git_config(key: str) -> str:
    result = run(["git", "config", "--local", "--get", key])
    return result.stdout.strip()


def active_gh_account() -> str | None:
    result = run(["gh", "auth", "status", "--hostname", "github.com"])
    if result.returncode != 0:
        return None
    output = result.stdout + result.stderr
    for index, line in enumerate(output.splitlines()):
        if "Logged in to github.com account" not in line:
            continue
        account = line.split("account", 1)[1].split("(", 1)[0].strip()
        following = "\n".join(output.splitlines()[index : index + 6])
        if "Active account: true" in following:
            return account
    return None


def gh_repo_permission(repo: str) -> str | None:
    result = run(
        [
            "gh",
            "repo",
            "view",
            repo,
            "--json",
            "viewerPermission",
            "--jq",
            ".viewerPermission",
        ]
    )
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def supabase_project_visible(binding: dict[str, str]) -> bool:
    env = os.environ.copy()
    env_file = ROOT / ".env.supabase.local"
    if env_file.exists():
        # Delegate to zsh so quoted passwords with trailing spaces keep their exact value.
        command = (
            "set -a; source .env.supabase.local; set +a; "
            "supabase projects list --output json"
        )
        result = run(["/bin/zsh", "-lc", command])
    else:
        result = run(["supabase", "projects", "list", "--output", "json"], env=env)
    if result.returncode != 0:
        return False
    try:
        projects = json.loads(result.stdout)
    except json.JSONDecodeError:
        return (
            binding["SUPABASE_PROJECT_REF"] in result.stdout
            and binding["SUPABASE_PROJECT_NAME"] in result.stdout
        )
    return any(
        project.get("id") == binding["SUPABASE_PROJECT_REF"]
        and project.get("name") == binding["SUPABASE_PROJECT_NAME"]
        and project.get("organization_id") == binding["SUPABASE_ORG_ID"]
        for project in projects
    )


def main() -> int:
    if not BINDING_FILE.exists():
        print("[project-binding] FAILED: missing .project-binding.env", file=sys.stderr)
        return 1

    binding = parse_binding()
    errors: list[str] = []
    warnings: list[str] = []

    expected_remote = binding["GIT_REMOTE_URL"]
    if git_config("remote.origin.url") != expected_remote:
        errors.append(
            f"remote.origin.url 不符：目前 {git_config('remote.origin.url')!r}，預期 {expected_remote!r}"
        )
    if git_config("remote.origin.pushurl") and git_config("remote.origin.pushurl") != expected_remote:
        errors.append("remote.origin.pushurl 不符")
    if git_config("user.name") != binding["GIT_USER_NAME"]:
        errors.append("git user.name 不符")
    if git_config("user.email") != binding["GIT_USER_EMAIL"]:
        errors.append("git user.email 不符")

    account = active_gh_account()
    if account != binding["GITHUB_ACCOUNT"]:
        errors.append(f"gh active account 不符：目前 {account or '未登入'}，預期 {binding['GITHUB_ACCOUNT']}")

    permission = gh_repo_permission(binding["GITHUB_REPO"])
    if permission is None:
        errors.append(f"無法讀取 GitHub repo 權限：{binding['GITHUB_REPO']}")
    elif permission not in {"WRITE", "MAINTAIN", "ADMIN"}:
        warnings.append(f"GitHub repo 權限目前是 {permission}；可讀但不能推送 main")

    if not (ROOT / ".env.supabase.local").exists():
        errors.append("缺少 .env.supabase.local，Supabase wrapper 不能脫離全域登入運作")
    elif not supabase_project_visible(binding):
        errors.append(f"Supabase token 無法看到專案 {binding['SUPABASE_PROJECT_REF']}")

    if errors:
        print("[project-binding] FAILED", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        for warning in warnings:
            print(f"  - WARNING: {warning}", file=sys.stderr)
        return 1

    for warning in warnings:
        print(f"[project-binding] WARNING: {warning}")
    print(
        "[project-binding] OK: "
        f"{binding['GITHUB_REPO']} / {binding['SUPABASE_PROJECT_NAME']} ({binding['SUPABASE_PROJECT_REF']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
