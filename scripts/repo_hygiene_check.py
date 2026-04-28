#!/usr/bin/env python3
"""檢查 repo 衛生規則，避免敏感檔與工具暫存檔被追蹤。"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]

BLOCKED_PREFIXES = (
    "supabase/.temp/",
    "scratch/",
    "tmp/",
    "dist/",
    "build/",
    "node_modules/",
)

BLOCKED_PATH_PARTS = (
    "__pycache__/",
)

BLOCKED_SUFFIXES = (
    ".pyc",
    ".pyo",
    ".DS_Store",
)

ALLOWED_ENV_SUFFIXES = (
    ".example",
    ".sample",
    ".template",
)

TEXT_SUFFIXES = {
    ".cjs",
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".sh",
    ".sql",
    ".toml",
    ".ts",
    ".yaml",
    ".yml",
}

SECRET_PATTERNS = (
    ("Supabase access token", re.compile(r"\bsbp_[A-Za-z0-9]{20,}\b")),
    ("GitHub token", re.compile(r"\bgh[opsu]_[A-Za-z0-9_]{20,}\b")),
    ("LINE channel access token", re.compile(r"\b[A-Za-z0-9+/]{80,}={0,2}\b")),
    (
        "JWT-like service key",
        re.compile(r"\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b"),
    ),
)

SECRET_SCAN_EXCLUDED_PATHS = {
    "package-lock.json",
    "supabase/functions/deno.lock",
}


def git_ls_files() -> list[str]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=False,
    )
    return [path.decode("utf-8") for path in result.stdout.split(b"\0") if path]


def is_present(path: str) -> bool:
    return (ROOT / path).exists()


def is_disallowed_env_file(path: str) -> bool:
    name = PurePosixPath(path).name
    return name.startswith(".env") and not path.endswith(ALLOWED_ENV_SUFFIXES)


def is_text_file(path: str) -> bool:
    return PurePosixPath(path).suffix in TEXT_SUFFIXES


def read_text(path: str) -> str | None:
    try:
        return (ROOT / path).read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return None


def find_path_violations(paths: list[str]) -> list[str]:
    violations: list[str] = []
    for path in paths:
        if not is_present(path):
            continue
        if path.startswith(BLOCKED_PREFIXES):
            violations.append(f"禁止追蹤暫存/產物目錄：{path}")
        if any(part in path for part in BLOCKED_PATH_PARTS):
            violations.append(f"禁止追蹤工具快取：{path}")
        if path.endswith(BLOCKED_SUFFIXES):
            violations.append(f"禁止追蹤工具暫存檔：{path}")
        if is_disallowed_env_file(path):
            violations.append(f"禁止追蹤本機 env/secret 檔：{path}")
    return violations


def find_secret_violations(paths: list[str]) -> list[str]:
    violations: list[str] = []
    for path in paths:
        if not is_present(path):
            continue
        if path in SECRET_SCAN_EXCLUDED_PATHS:
            continue
        if not is_text_file(path):
            continue
        text = read_text(path)
        if text is None:
            continue
        for label, pattern in SECRET_PATTERNS:
            if pattern.search(text):
                violations.append(f"疑似 {label} 出現在追蹤檔案：{path}")
    return violations


def main() -> int:
    tracked_paths = git_ls_files()
    violations = find_path_violations(tracked_paths)
    violations.extend(find_secret_violations(tracked_paths))

    if violations:
        print("[repo-hygiene] FAILED", file=sys.stderr)
        for violation in violations:
            print(f"  - {violation}", file=sys.stderr)
        return 1

    print("[repo-hygiene] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
