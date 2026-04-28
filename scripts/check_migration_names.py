#!/usr/bin/env python3
"""檢查 Supabase migration 檔名格式，避免後續檔案混用規格。"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = ROOT / "supabase" / "migrations"
EXPECTED_RE = re.compile(r"^\d{12}_[a-z0-9_]+\.sql$")

# 已套用到遠端的歷史 migration 不能任意改名，後續新檔才強制使用 12 位時間戳。
LEGACY_ALLOWLIST = {
    "20260428000000_initial_schema.sql",
}


def main() -> int:
    if not MIGRATIONS_DIR.exists():
        print(f"[check-migration-names] ERROR: 找不到目錄 {MIGRATIONS_DIR}", file=sys.stderr)
        return 1

    violations = [
        path.name
        for path in sorted(MIGRATIONS_DIR.glob("*.sql"))
        if not EXPECTED_RE.match(path.name) and path.name not in LEGACY_ALLOWLIST
    ]

    if violations:
        print("[check-migration-names] FAILED", file=sys.stderr)
        print("  migration 檔名必須使用 YYYYMMDDHHmm_slug.sql。", file=sys.stderr)
        for name in violations:
            print(f"  - {name}", file=sys.stderr)
        return 1

    print("[check-migration-names] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
