-- Create function to automatically hash passwords for admins
CREATE OR REPLACE FUNCTION public.hash_admin_password()
RETURNS TRIGGER AS $$
BEGIN
  -- Only hash if password_hash doesn't look like a bcrypt hash already
  IF NEW.password_hash IS NOT NULL AND NEW.password_hash !~ '^\$2[abxy]?\$[0-9]{2}\$' THEN
    -- This will hash the password using pgcrypto extension
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically hash passwords on insert and update
CREATE TRIGGER hash_admin_password_trigger
  BEFORE INSERT OR UPDATE ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_admin_password();

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;