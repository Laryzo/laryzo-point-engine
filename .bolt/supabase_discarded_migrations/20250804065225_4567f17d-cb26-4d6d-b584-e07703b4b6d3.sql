-- Update admin passwords to properly hashed "admin123"
-- bcrypt hash for "admin123" with salt rounds 10
UPDATE admins SET password_hash = '$2a$10$8K1p/a0dHTBS.L1xc/Myau.oP.3B4qzqpnpjy.RfSGfDdyCO4/O6' 
WHERE email IN ('super-admin@laryzo.com', 'admin@laryzo.com');