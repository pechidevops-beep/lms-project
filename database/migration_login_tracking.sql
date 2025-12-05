-- Migration: Add login tracking tables
-- Run this in Supabase SQL Editor to track user sign-ins

-- Login history table to track all sign-ins
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON login_history(email);
CREATE INDEX IF NOT EXISTS idx_login_history_role ON login_history(role);
CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON login_history(login_at);

-- View for recent staff logins
CREATE OR REPLACE VIEW recent_staff_logins AS
SELECT 
    lh.id,
    lh.email,
    p.display_name,
    p.staff_id,
    p.dept,
    lh.login_at,
    lh.ip_address
FROM login_history lh
JOIN profiles p ON lh.user_id = p.id
WHERE lh.role IN ('staff', 'admin', 'superadmin')
ORDER BY lh.login_at DESC;

-- View for recent student logins
CREATE OR REPLACE VIEW recent_student_logins AS
SELECT 
    lh.id,
    lh.email,
    p.display_name,
    p.student_id,
    p.dept,
    p.badge,
    lh.login_at,
    lh.ip_address
FROM login_history lh
JOIN profiles p ON lh.user_id = p.id
WHERE lh.role = 'student'
ORDER BY lh.login_at DESC;

-- RLS for login_history
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own login history
CREATE POLICY "Users can view own login history" ON login_history
    FOR SELECT USING (user_id = auth.uid());

-- Admins can view all login history
CREATE POLICY "Admins can view all login history" ON login_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('superadmin', 'admin', 'staff')
        )
    );

-- System can insert login history (via service role)
CREATE POLICY "System can insert login history" ON login_history
    FOR INSERT WITH CHECK (true);

