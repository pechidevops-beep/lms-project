import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '../middleware.js';

const router = express.Router();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get current user's enrollments
router.get('/me', authenticate, async (req, res) => {
  try {
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json(enrollments || []);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Enroll in a course
router.post('/:courseId/enroll', authenticate, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Check if already enrolled
    const { data: existing, error: checkError } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError;
    }

    if (existing) {
      return res.status(400).json({ 
        error: existing.status === 'pending' 
          ? 'Join request already pending' 
          : 'Already enrolled in this course' 
      });
    }

    // Create enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .insert([
        { 
          user_id: userId, 
          course_id: courseId, 
          status: 'pending',
          enrolled_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (enrollError) throw enrollError;

    // Get course details for notification
    const { data: course } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single();

    // Notify admins (you can implement this function)
    // await notifyAdminsAboutEnrollment(userId, courseId, course.title);

    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ error: 'Failed to enroll in course' });
  }
});

export default router;
