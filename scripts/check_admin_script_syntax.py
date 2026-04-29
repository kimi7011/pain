#!/usr/bin/env python3
"""Extract inline admin scripts and validate JavaScript syntax with Node."""

from __future__ import annotations

import re
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ADMIN_HTML = ROOT / "admin.html"
SCRIPT_RE = re.compile(r"<script(?:\s[^>]*)?>(.*?)</script>", re.IGNORECASE | re.DOTALL)


def main() -> int:
    html = ADMIN_HTML.read_text(encoding="utf-8")
    scripts = [script.strip() for script in SCRIPT_RE.findall(html) if script.strip()]
    if not scripts:
        print("[check-admin-script-syntax] FAILED: admin.html 沒有可檢查的 inline script", file=sys.stderr)
        return 1

    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".js", delete=False) as temp_file:
        temp_path = Path(temp_file.name)
        temp_file.write("\n;\n".join(scripts))

    try:
        result = subprocess.run(
            ["node", "--check", str(temp_path)],
            cwd=ROOT,
            check=False,
            text=True,
            capture_output=True,
        )
    finally:
        temp_path.unlink(missing_ok=True)

    if result.returncode != 0:
        print("[check-admin-script-syntax] FAILED", file=sys.stderr)
        if result.stdout:
            print(result.stdout, file=sys.stderr)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        return result.returncode

    print("[check-admin-script-syntax] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
