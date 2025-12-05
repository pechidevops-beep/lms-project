-- SQL Queries to view login history
-- Run these in Supabase SQL Editor

-- View all recent logins (last 100)
SELECT 
    lh.email,
    p.display_name,
    lh.role,
    CASE 
        WHEN lh.role = 'student' THEN p.student_id
        WHEN lh.role IN ('staff', 'admin', 'superadmin') THEN p.staff_id
        ELSE NULL
    END AS id_number,
    p.dept,
    lh.login_at,
    lh.ip_address
FROM login_history lh
LEFT JOIN profiles p ON lh.user_id = p.id
ORDER BY lh.login_at DESC
LIMIT 100;

-- View recent staff logins (last 50)
SELECT 
    lh.email,
    p.display_name,
    p.staff_id,
    p.dept,
    lh.role,
    lh.login_at,
    lh.ip_address
FROM login_history lh
JOIN profiles p ON lh.user_id = p.id
WHERE lh.role IN ('staff', 'admin', 'superadmin')
ORDER BY lh.login_at DESC
LIMIT 50;

-- View recent student logins (last 50)
SELECT 
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
ORDER BY lh.login_at DESC
LIMIT 50;

-- Count logins by role (today)
SELECT 
    role,
    COUNT(*) as login_count
FROM login_history
WHERE DATE(login_at) = CURRENT_DATE
GROUP BY role
ORDER BY login_count DESC;

-- Count logins by role (this week)
SELECT 
    role,
    COUNT(*) as login_count
FROM login_history
WHERE login_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY role
ORDER BY login_count DESC;

