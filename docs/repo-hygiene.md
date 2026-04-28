# Repo Hygiene

本文件記錄揉 PAin 專案的檔案衛生規則。目標是讓本機暫存、正式 secret、建置產物與工具快取不會進入 git。

## 自動檢查

```bash
rtk npm run hygiene
rtk npm run guardrails
```

`scripts/repo_hygiene_check.py` 目前檢查：

- 禁止追蹤 `.env`、`.env.staging`、`.env.supabase.local` 等本機 secret 檔。
- 禁止追蹤 `supabase/.temp/`、`scratch/`、`tmp/`、`dist/`、`build/`、`node_modules/`。
- 禁止追蹤 `__pycache__/`、`.pyc`、`.pyo`、`.DS_Store`。
- 掃描已追蹤文字檔中的高風險 token 形狀，例如 Supabase access token、GitHub token、LINE channel token 與 JWT-like service key。

## 手動掃描建議

在大型整理或部署前，建議至少跑：

```bash
rtk git status --short --ignored
rtk git ls-files
rtk npm run guardrails
```

若要清理檔案，先確認檔案是可重生的快取/產物，或已由其他正式來源取代。不要只因為檔名看起來重複就刪除。

## Secret 原則

- `.env.supabase.local` 是本機唯一可放部署 token / DB password 的 repo-local 檔案，必須維持 ignored。
- GitHub Actions secrets 只放 CI 需要的部署值。
- Supabase Edge Function runtime secrets 放在 Supabase 專案。
- 不在 README、DEV_CONTEXT、issue、PR 或測試 fixture 記錄 secret value。
