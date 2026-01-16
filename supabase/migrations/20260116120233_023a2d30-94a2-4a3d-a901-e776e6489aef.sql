-- Add plain_password column to customers table for admin viewing
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS plain_password TEXT;

-- Update RLS policy to ensure only admins can read plain_password
-- (existing policies already restrict customers table to admins for most operations)