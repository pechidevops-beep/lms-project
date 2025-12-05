-- Migration: Add task unlock request system
-- Run this in Supabase SQL Editor

-- Table to track task unlock requests
CREATE TABLE IF NOT EXISTS task_unlock_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    UNIQUE(task_id, student_id)
);

-- Table to track unlocked tasks for students (approved unlocks)
CREATE TABLE IF NOT EXISTS task_unlocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    unlocked_by UUID REFERENCES auth.users(id),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    UNIQUE(task_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_unlock_requests_task ON task_unlock_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_student ON task_unlock_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_status ON task_unlock_requests(status);
CREATE INDEX IF NOT EXISTS idx_task_unlocks_task ON task_unlocks(task_id);
CREATE INDEX IF NOT EXISTS idx_task_unlocks_student ON task_unlocks(student_id);

-- RLS for task_unlock_requests
ALTER TABLE task_unlock_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own unlock requests" ON task_unlock_requests
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create unlock requests" ON task_unlock_requests
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all unlock requests" ON task_unlock_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('superadmin', 'admin', 'staff')
        )
    );

CREATE POLICY "Admins can update unlock requests" ON task_unlock_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('superadmin', 'admin', 'staff')
        )
    );

-- RLS for task_unlocks
ALTER TABLE task_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own unlocks" ON task_unlocks
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Admins can manage unlocks" ON task_unlocks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('superadmin', 'admin', 'staff')
        )
    );

