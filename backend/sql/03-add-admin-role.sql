-- ============================================
-- DTREX - Admin Role Migration
-- Migration: 03-add-admin-role.sql
-- ============================================

-- Add admin flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for quick admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- You can promote a user to admin with:
-- UPDATE users SET is_admin = TRUE WHERE username = 'your_admin_username';
