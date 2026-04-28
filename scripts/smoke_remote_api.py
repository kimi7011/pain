#!/usr/bin/env python3
"""對線上 Supabase Edge Function 做最小 smoke test。"""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request


DEFAULT_SUPABASE_URL = "https://vwkemmyigpykuxyunbec.supabase.co"
BASE_URL = os.environ.get("SUPABASE_URL", DEFAULT_SUPABASE_URL).rstrip("/")
FUNCTION_URL = f"{BASE_URL}/functions/v1/api"
TIMEOUT_SECONDS = 20


def call(action: str) -> dict[str, object]:
    url = f"{FUNCTION_URL}?{urllib.parse.urlencode({'action': action})}"
    with urllib.request.urlopen(url, timeout=TIMEOUT_SECONDS) as response:
        payload = response.read().decode("utf-8")
    data = json.loads(payload)
    if not isinstance(data, dict):
        raise ValueError(f"{action} 回傳格式不是 JSON object")
    return data


def require_success(action: str, key: str) -> None:
    data = call(action)
    if data.get("success") is not True:
        raise RuntimeError(f"{action} success 不是 true：{data!r}")
    if key not in data:
        raise RuntimeError(f"{action} 缺少欄位 {key}：{data!r}")


def main() -> int:
    try:
        require_success("getProducts", "products")
        require_success("getInitData", "settings")
    except Exception as exc:
        print(f"[smoke-remote-api] FAILED: {exc}", file=sys.stderr)
        return 1

    print(f"[smoke-remote-api] OK: {FUNCTION_URL}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
