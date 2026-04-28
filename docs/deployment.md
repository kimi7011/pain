# 部署與環境設定

本專案沿用咖啡訂購專案的原則：正式金鑰只放在 Supabase / GitHub secrets 或未追蹤的 `.env.supabase.local`，部署動作透過 repo wrapper 重跑，不依賴操作者記憶。

## 本機 Supabase Env

1. 複製 `.env.supabase.local.example` 為 `.env.supabase.local`。
2. 填入：

```bash
SUPABASE_PROJECT_REF=vwkemmyigpykuxyunbec
SUPABASE_PROFILE=supabase
SUPABASE_ACCESS_TOKEN=
SUPABASE_DB_PASSWORD=''
```

`SUPABASE_DB_PASSWORD` 若包含 `;`、`#`、前後空格或其他 shell 特殊字元，必須用單引號包住，尾端空格也要保留在引號內。`.env.supabase.local` 不進 git。

## 本機驗證

```bash
rtk npm run guardrails
rtk npm run ci-local
rtk npm run smoke:remote
```

- `guardrails`：檢查 repo hygiene、migration 名稱、靜態前端綁定與文件同步。
- `ci-local`：跑 guardrails、Deno lint 與 Deno typecheck。
- `smoke:remote`：呼叫線上 `api` Edge Function 的 `getProducts` / `getInitData`。

## 資料庫與 Edge Function

```bash
rtk npm run supabase:db:push
rtk npm run supabase:deploy
```

- `scripts/load_supabase_env.sh` 會先載入 `.env.supabase.local`，再提供預設 `SUPABASE_PROJECT_REF=vwkemmyigpykuxyunbec`。
- `scripts/supabase_db_push.sh` 會用 `SUPABASE_ACCESS_TOKEN` link 專案，並用 `SUPABASE_DB_PASSWORD` 套用 migration。
- `scripts/supabase_deploy.sh` 會部署 `supabase/functions/api/index.ts`，函式名稱是 `api`。

## GitHub Actions Secrets

後端部署 job 需要：

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_REF`

Keep Alive workflow 需要：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Edge Function runtime secrets 則設定在 Supabase Dashboard / CLI，不放 GitHub：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `LINE_ADMIN_USER_ID`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_LOGIN_CHANNEL_ID`
- `LINE_LOGIN_CHANNEL_SECRET`
- `LINE_LOGIN_REDIRECT_URI`

## 變更規則

- 變更 Supabase project ref、Edge Function 名稱、GitHub Pages URL 或 secret 規則時，同步更新 `README.md`、`DEV_CONTEXT.md`、本文件與 `.env.supabase.local.example`。
- migration 檔名使用 `YYYYMMDDHHmm_slug.sql`。
- 正式 secret 曾出現在對話、截圖、log 或 shell history 時，依 `docs/key-rotation-runbook.md` 輪替。
