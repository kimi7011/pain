# 專案綁定規範

本專案固定綁定到 GitHub `kimi7011/pain` 與 Supabase `rou-pain`。這份規範的目標是讓不同人類或 AI agent 進入 repo 後，不需要重新猜測 GitHub 帳號、Supabase project ref 或部署入口。

## 固定綁定

非敏感綁定資料放在 `.project-binding.env`：

- GitHub account：`kimi7011`
- GitHub repo：`kimi7011/pain`
- Git remote：`https://kimi7011@github.com/kimi7011/pain.git`
- Git user：`kimi7011 <kimi7011@users.noreply.github.com>`
- Supabase project：`rou-pain`
- Supabase project ref：`vwkemmyigpykuxyunbec`
- Supabase org id：`pvfvqwbcrvvjrkjgqhjk`
- Supabase URL：`https://vwkemmyigpykuxyunbec.supabase.co`
- Edge Function：`api`

## 啟用與檢查

進入 repo 後先跑：

```bash
rtk npm run binding:activate
rtk npm run binding:check
```

`binding:activate` 會設定 repo-local Git remote、`user.name`、`user.email`，並把 GitHub CLI active account 切到 `kimi7011`。它也會確認 `.env.supabase.local` 存在。

`binding:check` 會確認：

- `origin` remote 與 repo-local Git user 是否符合 `.project-binding.env`。
- GitHub CLI active account 是否為 `kimi7011`。
- GitHub repo 權限是否至少能讀取；若不是 `WRITE` / `MAINTAIN` / `ADMIN`，會以 warning 提醒不能推送。
- `.env.supabase.local` 是否存在，且 Supabase token 是否看得到 `rou-pain / vwkemmyigpykuxyunbec / pvfvqwbcrvvjrkjgqhjk`。

## 本機 Secret

`.env.github.local` 是選用的本機 GitHub token override，僅在 keychain / `gh auth switch` 不適用時使用，必須維持 ignored。範本是 `.env.github.local.example`。

`.env.supabase.local` 是 Supabase 部署 token 與 DB password 的 repo-local 來源，必須維持 ignored。範本是 `.env.supabase.local.example`。

## 注意事項

- 這套綁定不能替 GitHub 帳號補權限；如果 `binding:check` 顯示 repo permission 只有 `READ`，需要到 GitHub repo/collaborator/token 權限補到可寫。
- 不要把 GitHub token、Supabase access token、DB password 或 service role key 寫入 `.project-binding.env`、文件或 git history。
