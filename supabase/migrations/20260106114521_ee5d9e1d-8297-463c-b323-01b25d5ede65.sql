-- Create atomic function for incrementing customer points with race condition protection
-- This function uses the points_blocked flag check and atomic UPDATE
CREATE OR REPLACE FUNCTION public.increment_customer_points(
  customer_uuid UUID,
  points_to_add NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_blocked BOOLEAN;
  rows_updated INTEGER;
BEGIN
  -- Check if customer is blocked
  SELECT points_blocked INTO is_blocked
  FROM public.customers
  WHERE id = customer_uuid;
  
  -- If customer not found or blocked, return false
  IF is_blocked IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF is_blocked = TRUE THEN
    -- Log blocked attempt but don't fail
    RAISE NOTICE 'Point increment skipped for blocked customer: %', customer_uuid;
    RETURN FALSE;
  END IF;
  
  -- Atomic update - no read-modify-write race condition
  UPDATE public.customers
  SET points = COALESCE(points, 0) + points_to_add,
      updated_at = NOW()
  WHERE id = customer_uuid
    AND (points_blocked IS NULL OR points_blocked = FALSE);
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  RETURN rows_updated > 0;
END;
$$;

-- Grant execute to authenticated and service role
GRANT EXECUTE ON FUNCTION public.increment_customer_points(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_customer_points(UUID, NUMERIC) TO service_role;

-- Add DELETE policy for customer_auth table (completing RLS security posture)
CREATE POLICY "No public delete customer auth" 
ON public.customer_auth 
FOR DELETE 
USING (false);