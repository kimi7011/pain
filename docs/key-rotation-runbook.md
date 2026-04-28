# 金鑰輪替 SOP

任何曾出現在本機、截圖、log、CI output、git history 或第三方客服對話中的正式金鑰，都應視為已外洩並立即輪替。本文件只記錄流程，不記錄 secret value。

## 通用流程

1. 盤點受影響服務與目前使用位置。
2. 在對應平台產生新金鑰，不覆蓋舊金鑰前先確認新金鑰可用。
3. 更新 Supabase Edge Function secrets、GitHub Actions secrets 或外部平台設定。
4. 重新部署 `api` Edge Function，或重新跑 GitHub Actions deploy。
5. 用最小測試請求確認新金鑰生效。
6. 撤銷舊金鑰。
7. 在 `DEV_CONTEXT.md` 只記錄輪替完成狀態與日期，不記錄 secret value。

## Supabase 與 GitHub Secrets

主要項目：

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`

操作：

1. 到 Supabase Dashboard 產生新的 access token 或重設 DB password。
2. 到 GitHub repo secrets 更新 `SUPABASE_ACCESS_TOKEN`、`SUPABASE_DB_PASSWORD`、必要時更新 `SUPABASE_PROJECT_REF`。
3. 到 Supabase Edge Function secrets 更新 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`。
4. 若本機需要部署，更新未追蹤的 `.env.supabase.local`。
5. 透過 GitHub Actions `workflow_dispatch deploy=true` 重跑部署，或本機執行 `rtk npm run supabase:deploy`。
6. 確認 CI 的 Supabase deploy job 沒有 skipped warning。

## LINE Login

主要項目：

- `LINE_LOGIN_CHANNEL_ID`
- `LINE_LOGIN_CHANNEL_SECRET`
- `LINE_LOGIN_REDIRECT_URI`

操作：

1. 到 LINE Developers 重新產生或重設 Login channel secret。
2. 更新 Supabase Edge Function secrets。
3. 重新部署 `api`。
4. 驗證 `pain.html` 顧客登入與 `admin.html` 後台登入都能完成 OAuth redirect。
5. 撤銷舊 secret。

## LINE Messaging

主要項目：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_ADMIN_USER_ID`
- 後台 LINE Bot 多帳號設定中的 token 與 admin ID。

操作：

1. 到 LINE Developers 重新發行 Messaging API access token。
2. 更新 Supabase Edge Function secrets，或在後台 LINE Bot 帳號管理中更新對應帳號。
3. 重新部署 `api`。
4. 建立測試訂單，確認店家 LINE 推播正常。
5. 撤銷舊 token。

## 驗證清單

- GitHub Actions deploy job 成功，或 skipped warning 符合預期。
- Supabase `api` 最近部署時間符合本次輪替。
- 顧客 LINE 登入、下單、我的訂單查詢正常。
- 後台登入、商品管理、訂單管理、LINE 通知正常。
- 舊金鑰已撤銷，且沒有出現在 repo、文件、CI output 或測試 fixture。
