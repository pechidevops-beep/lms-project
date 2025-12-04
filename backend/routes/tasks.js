import express from 'express';
import { authenticate } from '../middleware.js';
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

// Quick tasks CRUD
router.get('/quick', authenticate, async (req, res) => {
  try {
    const profile = req.profile;
    let { data, error } = await supabase.from('quick_tasks').select('*').order('created_at', { ascending: false });
    
    // If table doesn't exist, return empty array instead of error
    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.warn('quick_tasks table does not exist yet');
        return res.json([]);
      }
      throw error;
    }
    
    // If student, filter to only assigned quick tasks via assignments
    if (profile.role === 'student') {
      const { data: assignments } = await supabase
        .from('quick_task_assignments')
        .select('quick_task_id')
        .eq('student_id', profile.id);
      const ids = (assignments || []).map(a => a.quick_task_id);
      data = data.filter(q => ids.includes(q.id));
    }
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching quick tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/quick', authenticate, async (req, res) => {
  try {
    const profile = req.profile;
    if (!['superadmin','admin','staff'].includes(profile.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { title, description } = req.body;
    const { data, error } = await supabase.from('quick_tasks').insert({ title, description, created_by: profile.id }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/quick/:id', authenticate, async (req, res) => {
  try {
    const profile = req.profile;
    if (!['superadmin','admin','staff'].includes(profile.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const { error } = await supabase.from('quick_tasks').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign/unassign students to quick task
router.post('/quick/:id/assign', authenticate, async (req, res) => {
  try {
    const profile = req.profile;
    if (!['superadmin','admin','staff'].includes(profile.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params; // quick_task id
    const { student_ids } = req.body; // array of student ids to assign
    if (!Array.isArray(student_ids)) return res.status(400).json({ error: 'student_ids array required' });

    const toInsert = student_ids.map(sid => ({ quick_task_id: id, student_id: sid }));
    const { data, error } = await supabase.from('quick_task_assignments').insert(toInsert).select();
    if (error) {
      // ignore unique constraint errors by returning partial success
      console.error('Assign error', error.message || error);
    }
    res.json({ success: true, assigned: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/quick/:id/unassign', authenticate, async (req, res) => {
  try {
    const profile = req.profile;
    if (!['superadmin','admin','staff'].includes(profile.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params; // quick_task id
    const { student_ids } = req.body; // array of student ids to unassign
    if (!Array.isArray(student_ids)) return res.status(400).json({ error: 'student_ids array required' });

    const { error } = await supabase.from('quick_task_assignments').delete().eq('quick_task_id', id).in('student_id', student_ids);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
