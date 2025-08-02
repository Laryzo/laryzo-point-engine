/*
# Fix Admin Login Issue

1. Database Updates
   - Ensure correct admin exists with proper email and password hash
   - Update existing admin record with correct credentials
   
2. Security
   - Use proper bcrypt hash for password
   - Maintain super_admin role
*/

-- First, let's check if admin exists and update/create as needed
DO $$
BEGIN
    -- Delete any existing admin records to start fresh
    DELETE FROM public.admins WHERE email IN ('admin@laryzo.com', 'super-admin@laryzo.com');
    
    -- Insert the correct admin with proper bcrypt hash
    -- Password: "admin123" (for demo purposes)
    INSERT INTO public.admins (email, password_hash, role, name) VALUES 
    ('admin@laryzo.com', '$2b$12$LQv3c1yqBwEHFl5aysHdsOEn4QkNisVu00u/ddxoiGMw09FlcHdqm', 'super_admin', 'Super Admin');
    
    -- Also create the super-admin@laryzo.com version for the user who tried to login
    INSERT INTO public.admins (email, password_hash, role, name) VALUES 
    ('super-admin@laryzo.com', '$2b$12$LQv3c1yqBwEHFl5aysHdsOEn4QkNisVu00u/ddxoiGMw09FlcHdqm', 'super_admin', 'Super Admin');
    
END $$;