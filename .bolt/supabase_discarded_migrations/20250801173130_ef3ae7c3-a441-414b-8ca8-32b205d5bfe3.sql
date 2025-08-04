-- Fix incorrect point calculations for historical data
-- First, backup the old data for reference
CREATE TABLE IF NOT EXISTS point_history_backup AS 
SELECT * FROM point_history WHERE created_at < '2025-07-30 00:00:00';

-- Delete incorrect point history for customers 011, 012, 013, 006 from old transactions
DELETE FROM point_history 
WHERE transaction_id IN (
  SELECT t.id FROM transactions t
  JOIN customers c ON t.customer_id = c.id
  WHERE c.name IN ('011', '012', '013', '006')
  AND t.created_at < '2025-07-30 00:00:00'
);

-- Recalculate and insert correct points for these customers
-- Customer 011 (transaction: 2805251c-d53f-4139-a5a6-7d8a5493c2ba, margin: 15000)
INSERT INTO point_history (transaction_id, from_customer, to_customer, level, points, product_code, created_at)
SELECT 
  '2805251c-d53f-4139-a5a6-7d8a5493c2ba',
  c.id,
  c.id,
  0,
  15000 * 0.01,
  'MBS',
  '2025-07-22 06:06:58.504263'
FROM customers c WHERE c.name = '011';

-- Add upline points for customer 011 (parent 006)
INSERT INTO point_history (transaction_id, from_customer, to_customer, level, points, product_code, created_at)
SELECT 
  '2805251c-d53f-4139-a5a6-7d8a5493c2ba',
  c1.id,
  c2.id,
  1,
  15000 * 0.01,
  'MBS',
  '2025-07-22 06:06:58.504263'
FROM customers c1, customers c2 
WHERE c1.name = '011' AND c2.name = '006';

-- Customer 012 (transaction: f169b587-bf6d-4f69-9c5d-c8683adc7459, margin: 15000)
INSERT INTO point_history (transaction_id, from_customer, to_customer, level, points, product_code, created_at)
SELECT 
  'f169b587-bf6d-4f69-9c5d-c8683adc7459',
  c.id,
  c.id,
  0,
  15000 * 0.01,
  'MBS',
  '2025-07-22 06:10:28.978134'
FROM customers c WHERE c.name = '012';

-- Add upline points for customer 012 (parent 006)
INSERT INTO point_history (transaction_id, from_customer, to_customer, level, points, product_code, created_at)
SELECT 
  'f169b587-bf6d-4f69-9c5d-c8683adc7459',
  c1.id,
  c2.id,
  1,
  15000 * 0.01,
  'MBS',
  '2025-07-22 06:10:29.450344'
FROM customers c1, customers c2 
WHERE c1.name = '012' AND c2.name = '006';

-- Customer 013 (transaction: 148de249-7925-4ea2-9f78-733cff42db60, margin: 15000)
INSERT INTO point_history (transaction_id, from_customer, to_customer, level, points, product_code, created_at)
SELECT 
  '148de249-7925-4ea2-9f78-733cff42db60',
  c.id,
  c.id,
  0,
  15000 * 0.01,
  'MBS',
  '2025-07-22 06:11:41.709562'
FROM customers c WHERE c.name = '013';

-- Add upline points for customer 013 (parent 006)
INSERT INTO point_history (transaction_id, from_customer, to_customer, level, points, product_code, created_at)
SELECT 
  '148de249-7925-4ea2-9f78-733cff42db60',
  c1.id,
  c2.id,
  1,
  15000 * 0.01,
  'MBS',
  '2025-07-22 06:11:42.11881'
FROM customers c1, customers c2 
WHERE c1.name = '013' AND c2.name = '006';

-- Customer 006 own transaction (transaction ID from existing data)
INSERT INTO point_history (transaction_id, from_customer, to_customer, level, points, product_code, created_at)
SELECT 
  t.id,
  c.id,
  c.id,
  0,
  15000 * 0.01,
  'MBS',
  '2025-07-22 05:51:52.427774'
FROM customers c, transactions t
WHERE c.name = '006' 
AND t.customer_id = c.id 
AND t.created_at < '2025-07-30 00:00:00'
LIMIT 1;