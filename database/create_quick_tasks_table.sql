-- Create quick_tasks and quick_task_assignments tables
-- Run this in Supabase SQL Editor if the tables don't exist

CREATE TABLE IF NOT EXISTS quick_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quick_task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quick_task_id UUID REFERENCES quick_tasks(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(quick_task_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_quick_tasks_created_at ON quick_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_quick_task_assignments_student ON quick_task_assignments(student_id);

-- Enable RLS
ALTER TABLE quick_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quick_tasks (updated to use profiles table)
CREATE POLICY "Admins can manage quick tasks" ON quick_tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('superadmin', 'admin', 'staff')
        )
    );

CREATE POLICY "Students can view quick tasks assigned to them" ON quick_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quick_task_assignments
            WHERE quick_task_assignments.quick_task_id = quick_tasks.id
            AND quick_task_assignments.student_id = auth.uid()
        )
    );

-- RLS Policies for quick_task_assignments
CREATE POLICY "Admins can manage quick task assignments" ON quick_task_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('superadmin', 'admin', 'staff')
        )
    );

CREATE POLICY "Students can view their own quick task assignments" ON quick_task_assignments
    FOR SELECT USING (student_id = auth.uid());

