-- Create function to handle point_history changes and sync customers.points
CREATE OR REPLACE FUNCTION public.sync_customer_points_on_history_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_blocked BOOLEAN;
BEGIN
  -- Handle INSERT: add points to customer
  IF TG_OP = 'INSERT' THEN
    -- Check if customer is blocked
    SELECT points_blocked INTO is_blocked FROM customers WHERE id = NEW.to_customer;
    
    -- Only update if not blocked
    IF is_blocked IS NULL OR is_blocked = FALSE THEN
      UPDATE customers 
      SET points = COALESCE(points, 0) + COALESCE(NEW.points, 0),
          updated_at = NOW()
      WHERE id = NEW.to_customer;
    END IF;
    
    RETURN NEW;
  END IF;

  -- Handle DELETE: subtract points from customer
  IF TG_OP = 'DELETE' THEN
    UPDATE customers 
    SET points = COALESCE(points, 0) - COALESCE(OLD.points, 0),
        updated_at = NOW()
    WHERE id = OLD.to_customer;
    
    RETURN OLD;
  END IF;

  -- Handle UPDATE: adjust points if to_customer or points changed
  IF TG_OP = 'UPDATE' THEN
    -- If to_customer changed, subtract from old and add to new
    IF OLD.to_customer IS DISTINCT FROM NEW.to_customer THEN
      -- Subtract from old customer
      UPDATE customers 
      SET points = COALESCE(points, 0) - COALESCE(OLD.points, 0),
          updated_at = NOW()
      WHERE id = OLD.to_customer;
      
      -- Check if new customer is blocked
      SELECT points_blocked INTO is_blocked FROM customers WHERE id = NEW.to_customer;
      
      -- Add to new customer if not blocked
      IF is_blocked IS NULL OR is_blocked = FALSE THEN
        UPDATE customers 
        SET points = COALESCE(points, 0) + COALESCE(NEW.points, 0),
            updated_at = NOW()
        WHERE id = NEW.to_customer;
      END IF;
    ELSIF OLD.points IS DISTINCT FROM NEW.points THEN
      -- Same customer, just points changed - adjust the difference
      SELECT points_blocked INTO is_blocked FROM customers WHERE id = NEW.to_customer;
      
      IF is_blocked IS NULL OR is_blocked = FALSE THEN
        UPDATE customers 
        SET points = COALESCE(points, 0) + (COALESCE(NEW.points, 0) - COALESCE(OLD.points, 0)),
            updated_at = NOW()
        WHERE id = NEW.to_customer;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Create trigger on point_history table
DROP TRIGGER IF EXISTS sync_points_on_history_change ON point_history;
CREATE TRIGGER sync_points_on_history_change
AFTER INSERT OR UPDATE OR DELETE ON point_history
FOR EACH ROW
EXECUTE FUNCTION sync_customer_points_on_history_change();

-- Reconcile existing data: set customers.points to match sum of point_history
UPDATE customers c
SET points = COALESCE(
  (SELECT SUM(ph.points) FROM point_history ph WHERE ph.to_customer = c.id),
  0
),
updated_at = NOW();