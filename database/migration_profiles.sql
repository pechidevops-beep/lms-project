-- Migration: Add profiles table and update role system
-- Run this AFTER the base schema.sql

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('superadmin', 'admin', 'staff', 'student', 'pending_staff', 'declined')),
    dept VARCHAR(255),
    staff_id VARCHAR(100),
    student_id VARCHAR(100),
    badge VARCHAR(50), -- e.g., "2023-2027" for student year range
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_staff_id ON profiles(staff_id);
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON profiles(student_id);

-- Create course_staff_assignment table (staff assigned to courses)
CREATE TABLE IF NOT EXISTS course_staff_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_course_staff_course_id ON course_staff_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_staff_staff_id ON course_staff_assignments(staff_id);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::VARCHAR, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view their own, admins can view all
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('superadmin', 'admin', 'staff')
        )
    );

-- RLS for course_staff_assignments
ALTER TABLE course_staff_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own assignments" ON course_staff_assignments
    FOR SELECT USING (staff_id = auth.uid());

CREATE POLICY "Admins can manage assignments" ON course_staff_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('superadmin', 'admin', 'staff')
        )
    );

-- Seed a superadmin (update email and password hash manually)
-- Example: INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
-- VALUES (gen_random_uuid(), 'superadmin@institute.edu', crypt('your_password', gen_salt('bf')), NOW(), '{"role": "superadmin", "display_name": "Super Admin"}'::jsonb);
-- Then: INSERT INTO profiles (id, email, display_name, role) SELECT id, email, raw_user_meta_data->>'display_name', 'superadmin' FROM auth.users WHERE email = 'superadmin@institute.edu';

