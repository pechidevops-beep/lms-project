-- Method 1: Using Supabase Dashboard (RECOMMENDED)
-- 
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → "Create new user"
-- 3. Fill in:
--    - Email: pechimuthu@gmail.com
--    - Password: pechimuthu000
--    - Auto Confirm User: YES (check the box)
-- 4. Click "Create User"
-- 5. After user is created, click on the user to edit
-- 6. In "User Metadata" section, add:
--    {
--      "role": "superadmin",
--      "display_name": "Super Admin"
--    }
-- 7. Save
-- 8. Then run the SQL below to create the profile:

-- Create profile for the superadmin
INSERT INTO profiles (
  id,
  email,
  display_name,
  role,
  created_at,
  updated_at
)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'display_name', 'Super Admin'),
  'superadmin',
  created_at,
  updated_at
FROM auth.users
WHERE email = 'pechimuthu@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin',
  display_name = COALESCE(EXCLUDED.display_name, 'Super Admin'),
  email = 'pechimuthu@gmail.com';

-- Verify the superadmin was created
SELECT 
  p.id,
  p.email,
  p.display_name,
  p.role,
  au.email_confirmed_at,
  au.created_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.email = 'pechimuthu@gmail.com' AND p.role = 'superadmin';
