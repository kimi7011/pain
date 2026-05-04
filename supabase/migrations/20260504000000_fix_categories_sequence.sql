-- ============================================
-- 修復 categories 表的 SERIAL 序列不同步問題
-- 當手動插入帶有指定 ID 的資料後，序列可能落後於實際的最大 ID
-- ============================================

-- 1. 重置 categories_id_seq 為當前最大 ID
SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 0));

-- 2. 建立通用的序列重置函數，供 Edge Functions 呼叫
CREATE OR REPLACE FUNCTION reset_categories_seq()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 0));
END;
$$;
