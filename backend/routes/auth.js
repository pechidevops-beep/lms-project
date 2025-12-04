// Auth routes for multi-role signup system

import dotenv from 'dotenv';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate, verifySuperAdmin, getUserProfile } from '../middleware.js';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminMasterKey = process.env.ADMIN_MASTER_KEY;
const superAdminKey = process.env.BACKEND_SUPERADMIN_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper: Send email notification
async function sendEmail(to, subject, html) {
  // Email implementation from server.js
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

// Student signup - auto-activated
router.post('/signup/student', async (req, res) => {
  try {
    const { email, password, display_name, dept, student_id, badge } = req.body;

    if (!email || !password || !display_name || !student_id) {
      return res.status(400).json({ error: 'Missing required fields: email, password, display_name, student_id' });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        display_name,
        student_id,
        badge
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create profile (trigger should handle this, but we'll ensure it)
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      email,
      display_name,
      role: 'student',
      dept: dept || null,
      student_id,
      badge: badge || null,
      points: 0
    }, {
      onConflict: 'id'
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Try to delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create profile' });
    }

    await createAuditLog(authData.user.id, 'student_registered', 'user', authData.user.id);
    res.json({ user: authData.user, message: 'Student account created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Staff signup - pending approval
router.post('/signup/staff', async (req, res) => {
  try {
    const { email, password, display_name, dept, staff_id } = req.body;

    if (!email || !password || !display_name || !staff_id) {
      return res.status(400).json({ error: 'Missing required fields: email, password, display_name, staff_id' });
    }

    // Create auth user with pending_staff role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Don't confirm until approved
      user_metadata: {
        role: 'pending_staff',
        display_name,
        staff_id
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create profile with pending_staff role
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      email,
      display_name,
      role: 'pending_staff',
      dept: dept || null,
      staff_id,
      points: 0
    }, {
      onConflict: 'id'
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create profile' });
    }

    // Notify superadmins
    const { data: superAdmins } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'superadmin');

    if (superAdmins && superAdmins.length > 0) {
      const emails = superAdmins.map(sa => sa.email).join(', ');
      await sendEmail(
        emails,
        'New Staff Signup Request',
        `<p>A new staff member has requested access:</p>
        <ul>
          <li>Name: ${display_name}</li>
          <li>Email: ${email}</li>
          <li>Staff ID: ${staff_id}</li>
          <li>Department: ${dept || 'Not specified'}</li>
        </ul>
        <p>Please review and approve in the admin dashboard.</p>`
      );
    }

    await createAuditLog(authData.user.id, 'staff_signup_requested', 'user', authData.user.id);
    res.json({ 
      user: authData.user, 
      message: 'Staff signup request submitted. Awaiting approval from SuperAdmin.' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SuperAdmin signup - requires BACKEND_SUPERADMIN_KEY (optional, usually seeded manually)
router.post('/signup/superadmin', async (req, res) => {
  try {
    const { email, password, display_name, dept, staff_id, superAdminKey } = req.body;

    if (!superAdminKey || !process.env.BACKEND_SUPERADMIN_KEY) {
      return res.status(403).json({ error: 'SuperAdmin creation not allowed via API' });
    }

    if (superAdminKey !== process.env.BACKEND_SUPERADMIN_KEY) {
      return res.status(403).json({ error: 'Invalid SuperAdmin key' });
    }

    if (!email || !password || !display_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'superadmin',
        display_name
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      email,
      display_name,
      role: 'superadmin',
      dept: dept || null,
      staff_id: staff_id || null,
      points: 0
    }, {
      onConflict: 'id'
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create profile' });
    }

    await createAuditLog(authData.user.id, 'superadmin_registered', 'user', authData.user.id);
    res.json({ user: authData.user, message: 'SuperAdmin account created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

