
-- Add role enum for merchant users
CREATE TYPE public.merchant_role AS ENUM ('super_admin', 'admin');

-- Add role column to merchant_auth
ALTER TABLE public.merchant_auth ADD COLUMN role public.merchant_role NOT NULL DEFAULT 'admin';

-- Update existing merchant_auth records to super_admin (first registered = owner)
UPDATE public.merchant_auth SET role = 'super_admin';

-- Create a function to check if current merchant is super_admin
CREATE OR REPLACE FUNCTION public.is_merchant_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  claims json;
  user_email text;
BEGIN
  BEGIN
    claims := current_setting('request.jwt.claims', true)::json;
    user_email := claims->>'email';
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.merchant_auth 
    WHERE email = user_email AND role = 'super_admin'
  );
END;
$function$;
