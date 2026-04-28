#!/usr/bin/env python3
"""檢查維運文件是否涵蓋目前專案守門與部署入口。"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LAST_UPDATED_RE = re.compile(r"^最後更新：(\d{4}-\d{2}-\d{2})$", re.MULTILINE)
CHANGELOG_DATE_RE = re.compile(r"^## (\d{4}-\d{2}-\d{2})$", re.MULTILINE)

REQUIRED_SNIPPETS: dict[str, tuple[str, ...]] = {
    "README.md": (
        "npm run guardrails",
        "npm run smoke:remote",
        "docs/deployment.md",
        "docs/repo-hygiene.md",
        "SUPABASE_ACCESS_TOKEN",
        "SUPABASE_DB_PASSWORD",
    ),
    "DEV_CONTEXT.md": (
        "scripts/repo_hygiene_check.py",
        "scripts/check_migration_names.py",
        "scripts/check_static_bindings.py",
        "scripts/check_project_docs_sync.py",
        "docs/deployment.md",
        "docs/repo-hygiene.md",
    ),
    "docs/changelog.md": (
        "repo hygiene",
        "靜態前端綁定檢查",
    ),
    "docs/deployment.md": (
        "SUPABASE_ACCESS_TOKEN",
        "SUPABASE_DB_PASSWORD",
        "npm run supabase:db:push",
        "npm run supabase:deploy",
        "npm run smoke:remote",
    ),
    "docs/repo-hygiene.md": (
        "scripts/repo_hygiene_check.py",
        "supabase/.temp/",
        ".env.supabase.local",
    ),
}


def read(relative_path: str) -> str:
    path = ROOT / relative_path
    if not path.exists():
        raise FileNotFoundError(relative_path)
    return path.read_text(encoding="utf-8")


def main() -> int:
    errors: list[str] = []

    for relative_path, snippets in REQUIRED_SNIPPETS.items():
        try:
            text = read(relative_path)
        except FileNotFoundError:
            errors.append(f"找不到檔案：{relative_path}")
            continue

        for snippet in snippets:
            if snippet not in text:
                errors.append(f"{relative_path} 缺少文件片段：{snippet}")

    try:
        dev_context = read("DEV_CONTEXT.md")
        changelog = read("docs/changelog.md")
    except FileNotFoundError:
        pass
    else:
        last_updated_match = LAST_UPDATED_RE.search(dev_context)
        changelog_dates = CHANGELOG_DATE_RE.findall(changelog)
        if not last_updated_match:
            errors.append("DEV_CONTEXT.md 找不到 `最後更新` 欄位")
        elif changelog_dates and last_updated_match.group(1) != max(changelog_dates):
            errors.append(
                "DEV_CONTEXT.md 的 `最後更新` 未對齊 docs/changelog.md 最新日期："
                f"目前為 {last_updated_match.group(1)}，預期 {max(changelog_dates)}"
            )

    if errors:
        print("[check-project-docs-sync] FAILED", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("[check-project-docs-sync] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
