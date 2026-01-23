-- Sync all customer points with point_history totals
-- This ensures customers.points matches the sum of their point_history records
UPDATE customers c
SET points = COALESCE((
  SELECT SUM(ph.points)
  FROM point_history ph
  WHERE ph.to_customer = c.id
), 0),
updated_at = NOW();