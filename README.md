# 揉 PAin 訂購系統

本專案是揉 PAin 的靜態前台訂購頁、後台管理頁與 Supabase Edge Function 後端。維護時沿用咖啡訂購專案已驗證的幾個原則：繁體中文交接、RTK 指令、專案本機 env、CI 守門與可重現的 Supabase 部署腳本。

## 專案結構

- `pain.html`：顧客訂購頁。
- `admin.html`：後台管理頁。
- `pain.png`：站台圖示。
- `supabase/functions/api/index.ts`：Supabase Edge Function，對外函式名稱為 `api`。
- `supabase/schema.sql`：目前資料庫 schema 參考。
- `supabase/migrations/`：可由 `supabase db push` 套用的版本化 migration。
- `docs/changelog.md`：長期變更摘要。
- `docs/deployment.md`：Supabase / GitHub Actions 部署與 secret 設定。
- `docs/repo-hygiene.md`：repo 檔案衛生、secret scan 與清理規則。
- `DEV_CONTEXT.md`：給下一位人類或 agent 的交接快照。

## 必讀規則

1. 工作區命令使用 `rtk` 前綴；需要原始輸出時用 `rtk proxy <cmd>`。
2. 專案溝通、文件與 commit message 預設使用繁體中文。
3. `.env`、`.env.staging`、`.env.supabase.local` 與 `supabase/.temp/` 不進 git。
4. Deno import 使用 `supabase/functions/import_map.json` 中的別名，不在程式內新增未管理的 bare specifier。
5. 變更 Supabase 綁定、部署流程或 secret 規則時，同步更新 `README.md`、`DEV_CONTEXT.md` 與 `docs/deployment.md`。
6. 新增 migration 使用 `YYYYMMDDHHmm_slug.sql`。

## 常用命令

```bash
rtk npm run guardrails
rtk npm run hygiene
rtk npm run lint
rtk npm run check
rtk npm run ci-local
rtk npm run health
rtk npm run smoke:remote
rtk npm run supabase:db:push
rtk npm run supabase:deploy
```

`guardrails` 會執行：

- `scripts/repo_hygiene_check.py`
- `scripts/check_migration_names.py`
- `scripts/check_static_bindings.py`
- `scripts/check_project_docs_sync.py`

## Supabase 本機設定

1. 複製 `.env.supabase.local.example` 為 `.env.supabase.local`。
2. 填入本機或 CI 需要的值：

```bash
SUPABASE_PROJECT_REF=vwkemmyigpykuxyunbec
SUPABASE_PROFILE=supabase
SUPABASE_ACCESS_TOKEN=
SUPABASE_DB_PASSWORD=''
```

`scripts/load_supabase_env.sh` 會由 `scripts/supabase_deploy.sh` 與 `scripts/supabase_db_push.sh` 共用，自動載入 `.env.supabase.local`。若 DB password 包含 `;`、`#` 或尾端空格，請用單引號保留完整值。

若沒有 `SUPABASE_ACCESS_TOKEN`，腳本會退回 Supabase CLI profile；CI 則要求 `SUPABASE_ACCESS_TOKEN` 與 `SUPABASE_DB_PASSWORD`，缺少時以 warning 跳過後端部署。

## GitHub Actions

`.github/workflows/ci.yml` 會在 push、PR 與手動觸發時執行：

- `npm run guardrails`
- `deno lint .`
- `deno check api/index.ts`

在 `main` / `master` push 或 `workflow_dispatch deploy=true` 時，若 GitHub Secrets 已設定，會接著執行：

- `bash scripts/supabase_db_push.sh`
- `bash scripts/supabase_deploy.sh`

需要的 GitHub Secrets：

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_REF`（可省略；腳本預設為 `vwkemmyigpykuxyunbec`）

Keep Alive workflow 需要：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 維運文件

- `docs/deployment.md`：部署、CI secrets、本機 env、smoke test。
- `docs/repo-hygiene.md`：可提交/不可提交檔案與 secret 掃描規則。
- `docs/key-rotation-runbook.md`：金鑰輪替 SOP。
- `docs/changelog.md`：較長變更摘要。

## 金鑰輪替

LINE Login、LINE Messaging、Supabase service role 與 GitHub Actions secrets 的輪替流程記在 `docs/key-rotation-runbook.md`。不要把 secret value 寫進文件、測試資料或 issue/comment。
