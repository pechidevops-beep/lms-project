-- Check pending staff requests
-- Run this in Supabase SQL Editor to verify staff signups

-- Check all profiles with pending_staff role
SELECT 
  id,
  email,
  display_name,
  role,
  staff_id,
  dept,
  created_at
FROM profiles
WHERE role = 'pending_staff'
ORDER BY created_at DESC;

-- Check if quick_tasks table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'quick_tasks'
) AS quick_tasks_exists;

-- Check if quick_task_assignments table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'quick_task_assignments'
) AS quick_task_assignments_exists;

-- If tables don't exist, create them:
-- (Uncomment and run if needed)
/*
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
*/

