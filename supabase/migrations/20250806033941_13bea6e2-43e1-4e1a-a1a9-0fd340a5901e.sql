-- Fix password hash for rodaaset@gmail.com admin with correct bcrypt hash for "LaryzoDB@2025!"
-- This is the correct bcrypt hash for the password "LaryzoDB@2025!"
UPDATE public.admins 
SET password_hash = '$2b$10$mKsR96hJeEjB1r1xJqk2pe5T9BavCmDEM0nRROzX3tgoLDdYdx4Ky' 
WHERE email = 'rodaaset@gmail.com';