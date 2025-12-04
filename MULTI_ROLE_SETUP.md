
# Multi-Role Signup & Approval System Setup Guide

## Overview

This LMS now supports a comprehensive multi-role system with approval workflows:

- **SuperAdmin** (HOD/Dean): Highest privilege, approves staff requests
- **Admin**: Created with ADMIN_MASTER_KEY, full access
- **Staff**: Requests signup, pending approval by SuperAdmin
- **Student**: Auto-activated on signup

## Database Setup

### Step 1: Run Migration

1. Go to Supabase SQL Editor
2. Run `database/schema.sql` (if not already done)
3. Run `database/migration_profiles.sql` to add:
   - `profiles` table
   - `course_staff_assignments` table
   - Triggers and RLS policies

### Step 2: Seed SuperAdmin

Create your first SuperAdmin manually via SQL:

```sql
-- Insert auth user (replace email and password hash)
/*INSERT INTO auth.users (
  id, 
  email, 
  encrypted_password, 
  email_confirmed_at, 
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'pechi9001@gmail.com',
  crypt('pechi123', gen_salt('bf')),
  NOW(),
  '{"role": "superadmin", "pechi": "Super Admin"}'::jsonb,
  NOW(),
  NOW()
)
RETURNING id;

-- Insert profile (use the id from above)
INSERT INTO profiles (id, email, display_name, role)
VALUES (
  'paste_id_from_above',
  'pechi9001@gmail.com',
  'Super Admin',
  'superadmin'
);
```*/

Or use the BACKEND_SUPERADMIN_KEY environment variable (see below).

## Environment Variables

### Backend `.env`

/*Add these to your existing `.env`:

```env
# Existing
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
ADMIN_MASTER_KEY=your_admin_master_key

# New (optional - for creating SuperAdmin via API)
BACKEND_SUPERADMIN_KEY=your_super_secret_key_for_superadmin_creation
# Default SuperAdmin bootstrap (optional)
SUPERADMIN_DEFAULT_EMAIL=superadmin@institute.edu
SUPERADMIN_DEFAULT_PASSWORD=ChangeThisPassword123
SUPERADMIN_DISPLAY_NAME=Chief Academic Officer
SUPERADMIN_DEPARTMENT=Office of the Dean
```*/
/*
**Important:**
- `ADMIN_MASTER_KEY`: Required for admin signup (shared key)
- `BACKEND_SUPERADMIN_KEY`: Optional, only if you want to create SuperAdmin via API
- `SUPERADMIN_DEFAULT_*`: If provided, the backend will automatically ensure a SuperAdmin account exists with these credentials. Leave unset to skip auto-creation.

## Signup Flows

### Student Signup
1. Go to `/signup`
2. Select "Student"
3. Fill: Name, Department, Student ID, Badge (e.g., 2023-2027), Email, Password
4. Account created immediately, can login right away

### Staff Signup (Request)
1. Go to `/signup`
2. Select "Staff"
3. Fill: Name, Department, Staff ID, Email, Password
4. Account created as `pending_staff`
5. SuperAdmin receives email notification
6. Staff cannot login until approved

### Admin Signup
1. Go to `/signup`
2. Select "Admin"
3. Fill: Name, Department, Staff ID, Email, Password, **Admin Access Key**
4. Account created immediately if key is correct
5. Can login right away

## Approval Workflow

### SuperAdmin Approves Staff

1. SuperAdmin logs in → redirected to `/superadmin`
2. View pending staff requests in dashboard
3. Click "Approve" → Staff receives email, can now login
4. Click "Decline" → Staff receives email with reason

### Admin Master Key Validation

- **One-time only**: When admin/superadmin logs in for first time
- Modal appears asking for `ADMIN_MASTER_KEY`
- Once validated, stored in user metadata
- Won't ask again on subsequent logins

## Staff Management

### Staff Can:
- Create courses (assigned to them)
- Create tasks in their courses
- Add/remove students from their courses
- View submissions for their courses
- Grade submissions

### Staff Routes:
- `POST /api/staff/courses/:courseId/students/:studentId` - Add student
- `DELETE /api/staff/courses/:courseId/students/:studentId` - Remove student
- `GET /api/staff/courses/:courseId/students` - List students

### Assign Staff to Course (Admin/SuperAdmin):
- `POST /api/staff/courses/:courseId/staff/:staffId` - Assign staff

## API Endpoints

### Auth
- `POST /api/auth/signup/student` - Student signup
- `POST /api/auth/signup/staff` - Staff signup request
- `POST /api/auth/signup/admin` - Admin signup
- `POST /api/auth/signup/superadmin` - SuperAdmin signup (requires BACKEND_SUPERADMIN_KEY)
- `POST /api/auth/validate-admin-key` - Validate admin key (one-time)

### Admin (SuperAdmin only)
- `GET /api/admin/staffs/pending` - List pending staff
- `POST /api/admin/staffs/:id/approve` - Approve staff
- `POST /api/admin/staffs/:id/decline` - Decline staff
- `GET /api/admin/staffs` - List all staff
- `GET /api/admin/students` - List all students

### Profile
- `GET /api/profile` - Get current user profile
- `PUT /api/profile` - Update profile

## Role-Based Routing

- `/superadmin` - SuperAdmin dashboard (staff approval)
- `/admin` - Admin/Staff dashboard (courses, tasks)
- `/student` - Student dashboard (courses, submissions)

## Testing Checklist

- [ ] Run database migrations
- [ ] Seed SuperAdmin account
- [ ] Test student signup (auto-activated)
- [ ] Test staff signup (pending)
- [ ] Test admin signup (with key)
- [ ] SuperAdmin approves staff
- [ ] Staff can login after approval
- [ ] Admin master key validation (one-time)
- [ ] Staff can manage courses
- [ ] Staff can add/remove students

## Troubleshooting

### "User profile not found"
- Run migration_profiles.sql
- Check if trigger created profile on signup

### "Admin master key not configured"
- Add ADMIN_MASTER_KEY to backend/.env

### "Access denied" errors
- Check profile.role matches required role
- Verify middleware is applied to routes

### Staff can't login
- Check if approved by SuperAdmin
- Verify profile.role is 'staff' not 'pending_staff'

*/