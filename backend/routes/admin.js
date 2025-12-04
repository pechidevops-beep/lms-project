// Admin routes for staff approval and management

import dotenv from 'dotenv';
import express from 'express';
import { verifySuperAdmin, authenticate, getUserProfile } from '../middleware.js';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper: Send email notification
async function sendEmail(to, subject, html) {
  console.log('Would send email:', { to, subject });
}

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

// Get pending staff requests (SuperAdmin only)
router.get('/staffs/pending', authenticate, async (req, res) => {
  try {
    // Check if user is superadmin
    const profile = req.profile;
    console.log('Pending staff request - User profile:', profile?.email, 'Role:', profile?.role);
    
    if (!profile || profile.role !== 'superadmin') {
      console.log('Access denied - not superadmin');
      return res.status(403).json({ error: 'SuperAdmin access required' });
    }

    console.log('Fetching pending staff requests...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'pending_staff')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching pending staff:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} pending staff requests`);
    if (data && data.length > 0) {
      console.log('Pending staff:', data.map(s => ({ email: s.email, name: s.display_name })));
    }
    res.json(data || []);
  } catch (error) {
    console.error('Error in /staffs/pending:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve staff request (SuperAdmin only)
router.post('/staffs/:id/approve', ...verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await getUserProfile(id);

    if (!profile) {
      return res.status(404).json({ error: 'Staff profile not found' });
    }

    if (profile.role !== 'pending_staff') {
      return res.status(400).json({ error: 'User is not pending approval' });
    }

    // Update profile role to staff
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'staff' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Confirm email in auth
    await supabase.auth.admin.updateUserById(id, {
      email_confirm: true,
      user_metadata: {
        ...profile,
        role: 'staff'
      }
    });

    // Notify staff member
    await sendEmail(
      profile.email,
      'Staff Account Approved',
      `<p>Your staff account has been approved!</p>
      <p>You can now log in and access staff features.</p>
      <p>Login at: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/login</p>`
    );

    await createAuditLog(req.profile.id, 'staff_approved', 'user', id, { 
      staff_email: profile.email 
    });

    res.json({ 
      message: 'Staff approved successfully', 
      profile: data 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Decline staff request (SuperAdmin only)
router.post('/staffs/:id/decline', ...verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const profile = await getUserProfile(id);

    if (!profile) {
      return res.status(404).json({ error: 'Staff profile not found' });
    }

    if (profile.role !== 'pending_staff') {
      return res.status(400).json({ error: 'User is not pending approval' });
    }

    // Update profile role to declined
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'declined' })
      .eq('id', id);

    if (updateError) throw updateError;

    // Optionally delete auth user
    // await supabase.auth.admin.deleteUser(id);

    // Notify staff member
    await sendEmail(
      profile.email,
      'Staff Account Request Declined',
      `<p>Your staff account request has been declined.</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ''}
      <p>If you believe this is an error, please contact the administrator.</p>`
    );

    await createAuditLog(req.profile.id, 'staff_declined', 'user', id, { 
      staff_email: profile.email,
      reason: reason || null
    });

    res.json({ message: 'Staff request declined' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all staff (SuperAdmin/Admin only)
router.get('/staffs', authenticate, async (req, res) => {
  try {
    const profile = req.profile;
    if (profile.role !== 'superadmin' && profile.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['staff', 'admin', 'superadmin'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all students (SuperAdmin/Admin/Staff only)
router.get('/students', authenticate, async (req, res) => {
  try {
    const profile = req.profile;
    if (profile.role === 'student') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

