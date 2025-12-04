-- Migration: Add settings fields to profiles table
-- Run this AFTER migration_profiles.sql

-- Add new settings columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100),
ADD COLUMN IF NOT EXISTS notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_url TEXT,
ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_save BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS compact_mode BOOLEAN DEFAULT false;

-- Create index for theme (useful for bulk operations)
CREATE INDEX IF NOT EXISTS idx_profiles_theme ON profiles(theme);

