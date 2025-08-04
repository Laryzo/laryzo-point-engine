-- Update admins table to support super_admin role and add name column
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS name TEXT;

-- Update the role column to support both admin and super_admin
ALTER TABLE public.admins ALTER COLUMN role SET DEFAULT 'admin';

-- Add constraint to ensure only valid roles
ALTER TABLE public.admins ADD CONSTRAINT valid_roles CHECK (role IN ('admin', 'super_admin'));

-- Create index for better performance on role queries
CREATE INDEX IF NOT EXISTS idx_admins_role ON public.admins(role);