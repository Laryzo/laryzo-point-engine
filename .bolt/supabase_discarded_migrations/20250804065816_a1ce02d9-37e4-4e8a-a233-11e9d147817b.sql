-- Update admin passwords with correct bcrypt hash for "admin123"
-- This hash was generated using bcrypt with 10 salt rounds for password "admin123"
UPDATE admins SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' 
WHERE email IN ('super-admin@laryzo.com', 'admin@laryzo.com');