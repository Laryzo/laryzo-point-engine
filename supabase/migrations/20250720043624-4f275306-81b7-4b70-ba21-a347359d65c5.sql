-- Update the existing admin to be a super admin
UPDATE admins 
SET role = 'super_admin', name = 'Super Admin'
WHERE email = 'admin@laryzo.com';