# 專案變更摘要

本檔保存 `DEV_CONTEXT.md` 不再承載的較長歷史摘要。它不是完整 changelog；精確差異仍以 git history 為準。

## 2026-04-29

- 參考咖啡訂購專案第二階段成熟度，新增 repo hygiene、migration 命名、靜態前端綁定檢查與文件同步 guardrails，並接入 `npm run guardrails`、`npm run ci-local` 與 GitHub Actions。
- 新增 `docs/deployment.md` 與 `docs/repo-hygiene.md`，補齊 Supabase / GitHub secrets、本機 env、遠端 smoke test、repo hygiene 與 secret scan 的可重現操作說明。
- 新增 `scripts/load_supabase_env.sh`，讓 `supabase_db_push.sh` 與 `supabase_deploy.sh` 共用本機 env 載入邏輯，避免專案 ref / profile / DB password handling 漂移。
- 新增 `npm run smoke:remote`，用線上 Edge Function 的 `getProducts` / `getInitData` 做最小部署後檢查。
- 新增 repo-local 專案綁定層：`.project-binding.env`、`docs/project-binding.md`、`scripts/activate_project_binding.sh` 與 `scripts/check_project_binding.py`，固定 GitHub `kimi7011/pain` 與 Supabase `rou-pain / vwkemmyigpykuxyunbec`。

## 2026-04-28

- 移植咖啡訂購專案的維護基礎設施：RTK 指示、精準 `.gitignore`、本機 Supabase env 範本、Supabase 部署 wrapper、GitHub Actions Deno 守門與後端部署 job。
- 新增 `README.md`、`DEV_CONTEXT.md` 與 `docs/key-rotation-runbook.md`，讓後續人類或 agent 能重建本機/CI 操作脈絡。
- 將現有 `supabase/schema.sql` 轉成版本化初始 migration，讓 `supabase db push` 有可追蹤來源。
- `supabase/.temp/` 改為本機暫存資料，不再應被 git 追蹤。

## 維護原則

- 最近且會影響交接判斷的摘要放在 `DEV_CONTEXT.md`。
- 較長背景移到本檔。
- 一般小修不進文件，以 git commit history 查詢。
