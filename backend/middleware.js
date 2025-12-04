// Role-based middleware for the LMS backend

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get user profile from database
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error || !data) return null;
  return data;
}

// Authentication middleware
export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    return res.status(401).json({ error: 'User profile not found' });
  }

  req.user = user;
  req.profile = profile;
  next();
}

// Role verification middleware factory
export function verifyRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return async (req, res, next) => {
    if (!req.profile) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.profile.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }

    next();
  };
}

// Specific role middleware
export const verifySuperAdmin = [
  authenticate,
  verifyRole('superadmin')
];

export const verifyAdmin = [
  authenticate,
  verifyRole(['superadmin', 'admin'])
];

export const verifyStaff = [
  authenticate,
  verifyRole(['superadmin', 'admin', 'staff'])
];

export const verifyStudent = [
  authenticate,
  verifyRole('student')
];

// Check if user can access course (staff assigned or admin/superadmin)
export async function canAccessCourse(userId, courseId) {
  const profile = await getUserProfile(userId);
  if (!profile) return false;

  // SuperAdmin and Admin can access all courses
  if (profile.role === 'superadmin' || profile.role === 'admin') {
    return true;
  }

  // Staff can access if assigned to course
  if (profile.role === 'staff') {
    const { data } = await supabase
      .from('course_staff_assignments')
      .select('id')
      .eq('course_id', courseId)
      .eq('staff_id', userId)
      .single();
    
    return !!data;
  }

  return false;
}

