ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

UPDATE orders
SET status = 'pending'
WHERE status IS NULL OR status = '';

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
