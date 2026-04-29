# DEV_CONTEXT — 揉 PAin 訂購系統

本文件是交接快照，目標是在 3-5 分鐘內讓下一位接手者掌握規則、現況與風險。較長的歷史摘要放在 `docs/changelog.md`；精確差異以 git history 為準。

最後更新：2026-04-30

---

## 1) 必讀規則

1. 工作區命令一律使用 `rtk` 前綴；需要未過濾輸出時用 `rtk proxy <cmd>`。
2. 溝通、文件、註解與 commit message 預設使用繁體中文。
3. `.env`、`.env.staging`、`.env.supabase.local` 與 `supabase/.temp/` 是本機敏感/暫存資料，不應提交。
4. Deno 依賴集中在 `supabase/functions/import_map.json`，程式內使用別名如 `supabase`、`http/server`。
5. 變更 GitHub / Supabase 綁定、部署流程、CI 或 secrets 規則時，同步更新 `README.md`、本檔、`docs/deployment.md` 與 `docs/project-binding.md`。

---

## 2) 專案快照

- 專案：揉 PAin 訂購系統。
- 主要分支：`main`。
- Git remote：`https://kimi7011@github.com/kimi7011/pain.git`。
- 固定 GitHub account / repo：`kimi7011` / `kimi7011/pain`，綁定來源是 `.project-binding.env`。
- 前台：`pain.html`，靜態 HTML + CDN script/style。
- 後台：`admin.html`，靜態 HTML + CDN script/style。
- 後端：Supabase Edge Function `api`，程式位於 `supabase/functions/api/index.ts`。
- Supabase project ref：`vwkemmyigpykuxyunbec`。
- Supabase project / org：`rou-pain` / `pvfvqwbcrvvjrkjgqhjk`。
- CI：`.github/workflows/ci.yml` 執行 guardrails、Deno lint/check；`main/master` 部署時會在 secrets 齊全後執行 `db push` 與 `functions deploy api --no-verify-jwt`。

---

## 3) 目前狀態

- 已移植咖啡訂購專案的維護基礎設施：RTK 指示、`.gitignore`、本機 Supabase env 範本、部署 wrapper、GitHub Actions、README、交接快照、changelog 與金鑰輪替 SOP。
- `supabase/functions/deno.json` 啟用 `strict`，`import_map.json` 管理 Supabase 與 Deno std import。
- `supabase/migrations/20260428000000_initial_schema.sql` 將現有 `schema.sql` 轉為可由 `supabase db push` 套用的 migration，且 policy 以 `DROP POLICY IF EXISTS` + `CREATE POLICY` 保持可重跑。
- `Keep Supabase Alive` workflow 已沿用咖啡訂購的非致命語意：缺少 `SUPABASE_URL` 或 `SUPABASE_ANON_KEY` 時 warning 後略過。
- 第二階段已補上咖啡訂購式 guardrails：`scripts/repo_hygiene_check.py`、`scripts/check_migration_names.py`、`scripts/check_static_bindings.py`、`scripts/check_admin_script_syntax.py`、`scripts/check_project_docs_sync.py`，並接進 `npm run guardrails` / `npm run ci-local` / GitHub Actions。
- Supabase wrapper 已集中透過 `scripts/load_supabase_env.sh` 載入 `.env.supabase.local`，可保留含 shell 特殊字元或尾端空格的 DB password。
- 新增 `npm run smoke:remote`，對線上 `api` Edge Function 跑 `getProducts` / `getInitData` 最小檢查。
- 新增 repo-local 專案綁定：`.project-binding.env`、`scripts/load_project_binding.sh`、`scripts/activate_project_binding.sh`、`scripts/check_project_binding.py` 與 `docs/project-binding.md`。切換專案或換 agent 後，先跑 `npm run binding:activate` 再跑 `npm run binding:check`。
- 已移植咖啡訂購後台的訂單營運工具：訂單狀態欄位、狀態快速/批次更新、多條件篩選、篩選摘要、目前篩選全選，以及篩選/勾選 CSV 匯出。
- 新增 `npm run check:admin`，guardrails 會用 Node 檢查 `admin.html` inline script 語法，降低大型靜態後台改動風險。

---

## 4) 已知風險

- `admin.html`、`pain.html` 與 `supabase/functions/api/index.ts` 都是大型單檔；目前先補上守門與部署可重現性，尚未拆分前後台或 API routing。
- 前端 API URL 目前硬寫在 `admin.html` / `pain.html`，若 Supabase project ref 或 function 名稱變更，需同步修改兩個頁面。
- Edge Function 使用 service role 存取資料庫；正式 secrets 只應存在 Supabase / GitHub secrets 或未追蹤的 `.env.supabase.local`。
- GitHub Actions 後端部署依賴 `SUPABASE_ACCESS_TOKEN`、`SUPABASE_DB_PASSWORD` 與 `SUPABASE_PROJECT_REF`；缺少必要值時會跳過部署並在 summary 說明。
- `supabase/functions/api/index.ts` 尚未全面套用 `deno fmt`，避免在本階段產生大型格式化 diff；目前 CI 先維持 lint/check 與 guardrails。
- `admin.html` 的營運工具仍是 inline script；新增功能後至少執行 `npm run check:admin` 或 `npm run ci-local`，再部署 Supabase schema / Edge Function。
- 目前 GitHub API 對 `kimi7011/pain` 回報 viewer permission 為 `READ` 時，`binding:check` 會 warning；這代表綁定可讀但仍不能推送 main，需要 GitHub repo/token 權限補到 `WRITE` / `MAINTAIN` / `ADMIN`。

---

## 5) 常用命令

```bash
rtk npm run binding:activate
rtk npm run binding:check
rtk npm run guardrails
rtk npm run check:admin
rtk npm run hygiene
rtk npm run lint
rtk npm run check
rtk npm run ci-local
rtk npm run health
rtk npm run smoke:remote
rtk npm run supabase:db:push
rtk npm run supabase:deploy
```

---

## 6) 關鍵文件

- `README.md`：專案入口、規則與部署說明。
- `docs/changelog.md`：較長歷史摘要。
- `docs/deployment.md`：Supabase / GitHub Actions 部署與 secrets 操作。
- `docs/project-binding.md`：固定 GitHub / Supabase 專案綁定。
- `docs/repo-hygiene.md`：repo hygiene 與 secret scan 規則。
- `docs/key-rotation-runbook.md`：Supabase / GitHub / LINE secrets 輪替 SOP。
- `.env.supabase.local.example`：本機 Supabase env 範本。
- `.github/workflows/ci.yml`：Deno 守門與 Supabase 部署 workflow。

更新本檔時只保留會影響交接判斷的資訊；一般小修留在 git history。
