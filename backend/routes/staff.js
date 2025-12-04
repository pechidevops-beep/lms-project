// Staff routes for course and student management

import express from 'express';
import { verifyStaff, authenticate, canAccessCourse } from '../middleware.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper: Create audit log
async function createAuditLog(userId, action, resourceType, resourceId, details = {}) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details
  });
}

// Add student to course (Staff/Admin/SuperAdmin only)
router.post('/courses/:courseId/students/:studentId', authenticate, async (req, res) => {
  try {
    const { courseId, studentId } = req.params;
    const profile = req.profile;

    // Check if user can access this course
    const hasAccess = await canAccessCourse(profile.id, courseId);
    if (!hasAccess && profile.role !== 'superadmin' && profile.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have access to manage this course' });
    }

    // Check if student exists
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', studentId)
      .single();

    if (!studentProfile || studentProfile.role !== 'student') {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    // Add enrollment
    const { data, error } = await supabase
      .from('course_enrollments')
      .insert({
        course_id: courseId,
        student_id: studentId
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Student already enrolled' });
      }
      throw error;
    }

    await createAuditLog(profile.id, 'student_added_to_course', 'course_enrollment', data.id, {
      course_id: courseId,
      student_id: studentId
    });

    res.json({ message: 'Student added to course successfully', enrollment: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove student from course (Staff/Admin/SuperAdmin only)
router.delete('/courses/:courseId/students/:studentId', authenticate, async (req, res) => {
  try {
    const { courseId, studentId } = req.params;
    const profile = req.profile;

    // Check if user can access this course
    const hasAccess = await canAccessCourse(profile.id, courseId);
    if (!hasAccess && profile.role !== 'superadmin' && profile.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have access to manage this course' });
    }

    const { error } = await supabase
      .from('course_enrollments')
      .delete()
      .eq('course_id', courseId)
      .eq('student_id', studentId);

    if (error) throw error;

    await createAuditLog(profile.id, 'student_removed_from_course', 'course_enrollment', null, {
      course_id: courseId,
      student_id: studentId
    });

    res.json({ message: 'Student removed from course successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get students in a course (Staff/Admin/SuperAdmin only)
router.get('/courses/:courseId/students', authenticate, async (req, res) => {
  try {
    const { courseId } = req.params;
    const profile = req.profile;

    // Check if user can access this course
    const hasAccess = await canAccessCourse(profile.id, courseId);
    if (!hasAccess && profile.role !== 'superadmin' && profile.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have access to view this course' });
    }

    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        student:profiles!course_enrollments_student_id_fkey(
          id,
          email,
          display_name,
          student_id,
          badge,
          dept
        )
      `)
      .eq('course_id', courseId);

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign staff to course (Admin/SuperAdmin only)
router.post('/courses/:courseId/staff/:staffId', authenticate, async (req, res) => {
  try {
    const { courseId, staffId } = req.params;
    const profile = req.profile;

    if (profile.role !== 'superadmin' && profile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can assign staff to courses' });
    }

    // Check if staff exists
    const { data: staffProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', staffId)
      .single();

    if (!staffProfile || staffProfile.role !== 'staff') {
      return res.status(400).json({ error: 'Invalid staff ID' });
    }

    const { data, error } = await supabase
      .from('course_staff_assignments')
      .insert({
        course_id: courseId,
        staff_id: staffId
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Staff already assigned to course' });
      }
      throw error;
    }

    await createAuditLog(profile.id, 'staff_assigned_to_course', 'course_staff_assignment', data.id);
    res.json({ message: 'Staff assigned to course successfully', assignment: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

