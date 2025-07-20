-- Reorganize existing customers into proper binary tree structure
-- Customer 001 will be the root
-- Customer 002 will be left child of 001
-- Customer 003 will be right child of 001  
-- Customer 004 will be left child of 002

-- First, get the customer IDs in order of creation
DO $$
DECLARE
    customer_001_id UUID;
    customer_002_id UUID; 
    customer_003_id UUID;
    customer_004_id UUID;
BEGIN
    -- Get customer IDs based on their names (001, 002, 003, 004)
    SELECT id INTO customer_001_id FROM customers WHERE name = '001' LIMIT 1;
    SELECT id INTO customer_002_id FROM customers WHERE name = '002' LIMIT 1;
    SELECT id INTO customer_003_id FROM customers WHERE name = '003' LIMIT 1;
    SELECT id INTO customer_004_id FROM customers WHERE name = '004' LIMIT 1;
    
    -- Set up binary tree structure:
    -- 001 (root) - parent_id: null, position: null
    UPDATE customers 
    SET parent_id = NULL, position = NULL 
    WHERE id = customer_001_id;
    
    -- 002 (left child of 001) - parent_id: 001_id, position: 'left'
    UPDATE customers 
    SET parent_id = customer_001_id, position = 'left'
    WHERE id = customer_002_id;
    
    -- 003 (right child of 001) - parent_id: 001_id, position: 'right'  
    UPDATE customers 
    SET parent_id = customer_001_id, position = 'right'
    WHERE id = customer_003_id;
    
    -- 004 (left child of 002) - parent_id: 002_id, position: 'left'
    UPDATE customers 
    SET parent_id = customer_002_id, position = 'left'
    WHERE id = customer_004_id;
    
END $$;