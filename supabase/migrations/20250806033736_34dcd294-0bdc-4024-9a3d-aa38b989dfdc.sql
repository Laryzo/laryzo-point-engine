-- Fix password hash for rodaaset@gmail.com admin
-- Update password to properly hashed version of "LaryzoDB@2025!"
UPDATE public.admins 
SET password_hash = '$2b$10$K8.Y9mVx5JJxQbFjyA3zOuDJQEeHZ1pRF3UOJlJmN.vNQbUZLOZ1a' 
WHERE email = 'rodaaset@gmail.com';