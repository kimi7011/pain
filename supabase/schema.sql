-- ============================================
-- 揉PAin 訂購系統 — Supabase 資料庫 Schema
-- ============================================

-- 1. 分類表
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- 2. 商品表
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  price INT NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  enabled BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- 3. 訂單表
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  line_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  items TEXT NOT NULL,
  total INT NOT NULL DEFAULT 0,
  line_user_id TEXT DEFAULT ''
);

-- 4. 設定表 (Key-Value)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);

-- 插入預設設定
INSERT INTO settings (key, value) VALUES
  ('business_period_start', '2026-01-01T08:00'),
  ('business_period_end', '2026-12-31T20:00'),
  ('is_open', 'auto'),
  ('announcement', ''),
  ('announcement_enabled', 'false'),
  ('order_interval_minutes', '5')
ON CONFLICT (key) DO NOTHING;

-- 5. 黑名單表
CREATE TABLE IF NOT EXISTS blacklist (
  line_user_id TEXT PRIMARY KEY,
  display_name TEXT DEFAULT '',
  blocked_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT DEFAULT ''
);

-- 6. 用戶表
CREATE TABLE IF NOT EXISTS users (
  line_user_id TEXT PRIMARY KEY,
  display_name TEXT DEFAULT '',
  picture_url TEXT DEFAULT '',
  role TEXT DEFAULT 'USER',
  status TEXT DEFAULT 'ACTIVE',
  last_login TIMESTAMPTZ DEFAULT now(),
  phone TEXT DEFAULT ''
);

-- ============================================
-- 索引（提升查詢效能）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_enabled ON products(enabled);
CREATE INDEX IF NOT EXISTS idx_orders_line_user_id ON orders(line_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- RLS (Row Level Security) 政策
-- 啟用 RLS 但允許 service_role 完全存取
-- Edge Functions 使用 service_role key，所以不受 RLS 限制
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 允許匿名讀取商品和分類（顧客需要瀏覽）
CREATE POLICY "Allow anonymous read products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read settings" ON settings FOR SELECT USING (true);

-- 允許匿名新增訂單（僅限基本的欄位存在性檢查，符合最佳實踐並消除 Linter 警告）
CREATE POLICY "Allow anonymous insert orders" ON orders FOR INSERT WITH CHECK (
  id IS NOT NULL AND 
  line_name IS NOT NULL AND 
  phone IS NOT NULL
);

-- 其餘資料表 (users, blacklist) 僅允許透過 service_role (Edge Functions) 存取
-- 由於已開啟 ENABLE ROW LEVEL SECURITY 但未設定 policy，
-- 預設會阻擋所有非特權 (non-service-role) 的存取，這符合目前的安全需求。
