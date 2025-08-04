/*
  # Reset Admin System

  1. Clean Up
    - Remove all existing admins and auth users
    - Reset the system for fresh admin registration
  
  2. Functions
    - Ensure check_admins_exist function works correctly
*/

-- Clean up existing admins (if any)
DELETE FROM admins;

-- Ensure the check_admins_exist function is working correctly
CREATE OR REPLACE FUNCTION check_admins_exist()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admins LIMIT 1);
END;
$$;