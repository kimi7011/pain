-- ============================================
-- 揉PAin 訂購系統 — 初始 Supabase Schema
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  price INT NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  enabled BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  line_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  items TEXT NOT NULL,
  total INT NOT NULL DEFAULT 0,
  line_user_id TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);

INSERT INTO settings (key, value) VALUES
  ('business_period_start', '2026-01-01T08:00'),
  ('business_period_end', '2026-12-31T20:00'),
  ('is_open', 'auto'),
  ('announcement', ''),
  ('announcement_enabled', 'false'),
  ('order_interval_minutes', '5')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS blacklist (
  line_user_id TEXT PRIMARY KEY,
  display_name TEXT DEFAULT '',
  blocked_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users (
  line_user_id TEXT PRIMARY KEY,
  display_name TEXT DEFAULT '',
  picture_url TEXT DEFAULT '',
  role TEXT DEFAULT 'USER',
  status TEXT DEFAULT 'ACTIVE',
  last_login TIMESTAMPTZ DEFAULT now(),
  phone TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_enabled ON products(enabled);
CREATE INDEX IF NOT EXISTS idx_orders_line_user_id ON orders(line_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read products" ON products;
CREATE POLICY "Allow anonymous read products" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous read categories" ON categories;
CREATE POLICY "Allow anonymous read categories" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous read settings" ON settings;
CREATE POLICY "Allow anonymous read settings" ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert orders" ON orders;
CREATE POLICY "Allow anonymous insert orders" ON orders FOR INSERT WITH CHECK (
  id IS NOT NULL AND
  line_name IS NOT NULL AND
  phone IS NOT NULL
);
