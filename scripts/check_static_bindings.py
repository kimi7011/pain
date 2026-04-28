#!/usr/bin/env python3
"""檢查靜態前後台與 Supabase 專案綁定是否同步。"""

from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECT_REF = "vwkemmyigpykuxyunbec"
API_URL = f"https://{PROJECT_REF}.supabase.co/functions/v1/api"
FRONTEND_REDIRECT = "https://kimi7011.github.io/pain/pain.html"
ADMIN_REDIRECT = "https://kimi7011.github.io/pain/admin.html"


CHECKS: dict[str, tuple[str, ...]] = {
    "pain.html": (API_URL, FRONTEND_REDIRECT),
    "admin.html": (API_URL, ADMIN_REDIRECT),
    "README.md": (PROJECT_REF, "npm run smoke:remote"),
    "DEV_CONTEXT.md": (PROJECT_REF, "check_static_bindings.py"),
    "supabase/config.toml": (f'project_id = "{PROJECT_REF}"',),
    ".env.supabase.local.example": (f"SUPABASE_PROJECT_REF={PROJECT_REF}",),
}


def main() -> int:
    errors: list[str] = []
    for relative_path, expected_values in CHECKS.items():
        path = ROOT / relative_path
        if not path.exists():
            errors.append(f"找不到檔案：{relative_path}")
            continue

        text = path.read_text(encoding="utf-8")
        for expected in expected_values:
            if expected not in text:
                errors.append(f"{relative_path} 缺少綁定值：{expected}")

    if errors:
        print("[check-static-bindings] FAILED", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("[check-static-bindings] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
