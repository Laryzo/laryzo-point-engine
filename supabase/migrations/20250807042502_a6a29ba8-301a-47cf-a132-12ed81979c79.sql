-- Fix security warning by updating function with proper search_path
CREATE OR REPLACE FUNCTION public.hash_admin_password()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only hash if password_hash doesn't look like a bcrypt hash already
  IF NEW.password_hash IS NOT NULL AND NEW.password_hash !~ '^\$2[abxy]?\$[0-9]{2}\$' THEN
    -- This will hash the password using pgcrypto extension
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$;