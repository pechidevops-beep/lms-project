# Database Setup

## Prerequisites

- A Supabase project created
- Access to Supabase SQL Editor

## Setup Steps

1. **Run the Schema**
   - Open Supabase Dashboard
   - Go to SQL Editor
   - Copy and paste the contents of `schema.sql`
   - Click "Run" to execute

2. **Create Storage Bucket**
   - Go to Storage in Supabase Dashboard
   - Click "New bucket"
   - Name: `submissions`
   - Set to **Public** (or configure RLS if you prefer)
   - Click "Create bucket"

3. **Verify Setup**
   - Check that all tables are created (courses, tasks, submissions, etc.)
   - Verify RLS policies are enabled
   - Test storage bucket access

## Database Schema Overview

- **courses**: Course/repo information with join codes
- **course_enrollments**: Student enrollments in courses
- **tasks**: Tasks assigned to courses
- **submissions**: Student submissions with files and text
- **audit_logs**: System audit trail
- **auth.users**: Managed by Supabase (extends with is_admin metadata)

## Row Level Security (RLS)

All tables have RLS enabled with policies:
- Admins can manage all resources
- Students can view/manage their own submissions
- Students can view enrolled courses and tasks
- Audit logs are readable by users for their own actions, admins for all

