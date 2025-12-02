import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { createTransport } from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
const adminMasterKey = process.env.ADMIN_MASTER_KEY;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Email transporter
const emailTransporter = process.env.SMTP_HOST ? createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
}) : null;

// Helper: Get user from token
async function getUserFromToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// Helper: Check if user is admin
async function isAdmin(user) {
  if (!user) return false;
  return user.user_metadata?.is_admin === true;
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

// Helper: Send email notification
async function sendEmail(to, subject, html) {
  if (!emailTransporter) {
    console.log('Email not configured. Would send:', { to, subject });
    return;
  }

  try {
    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@lms.com',
      to,
      subject,
      html
    });
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes (mostly handled by Supabase client-side, but we can add server-side helpers)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const {
      email,
      password,
      role,
      name,
      department,
      year,
      staffId,
      studentId,
      adminAccessKey
    } = req.body;

    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalizedRole = role === 'admin' ? 'admin' : 'student';
    const metadata = {
      is_admin: normalizedRole === 'admin',
      role: normalizedRole,
      name,
      department: department || null,
    };

    if (normalizedRole === 'admin') {
      if (!process.env.ADMIN_MASTER_KEY) {
        return res.status(500).json({ error: 'Admin master key not configured' });
      }
      if (!adminAccessKey || adminAccessKey !== process.env.ADMIN_MASTER_KEY) {
        return res.status(403).json({ error: 'Invalid admin access key' });
      }
      if (!staffId) {
        return res.status(400).json({ error: 'Staff ID is required for admins' });
      }
      metadata.staff_id = staffId;
    } else {
      if (!studentId || !year) {
        return res.status(400).json({ error: 'Student ID and year are required for students' });
      }
      metadata.student_id = studentId;
      metadata.year = year;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    await createAuditLog(data.user.id, 'user_registered', 'user', data.user.id, { role: normalizedRole });
    res.json({ user: data.user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/validate-admin', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !(await isAdmin(user))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!process.env.ADMIN_MASTER_KEY) {
      return res.status(500).json({ error: 'Admin master key not configured' });
    }

    const { adminKey } = req.body;
    if (!adminKey || adminKey !== process.env.ADMIN_MASTER_KEY) {
      return res.status(403).json({ error: 'Invalid admin access key' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Courses routes
app.get('/api/courses', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const admin = await isAdmin(user);
    let query = supabase.from('courses').select('*');

    if (!admin) {
      // Students see only enrolled courses
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('student_id', user.id);

      const courseIds = enrollments?.map(e => e.course_id) || [];
      if (courseIds.length === 0) {
        return res.json([]);
      }
      query = query.in('id', courseIds);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !(await isAdmin(user))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, description, code } = req.body;
    const { data, error } = await supabase
      .from('courses')
      .insert({
        title,
        description,
        code: code || Math.random().toString(36).substring(2, 8).toUpperCase(),
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    await createAuditLog(user.id, 'course_created', 'course', data.id, { title });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Course join via code
app.post('/api/courses/join', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Course code is required' });
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('code', code.trim())
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const { data, error } = await supabase
      .from('course_enrollments')
      .insert({
        course_id: course.id,
        student_id: user.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Already enrolled' });
      }
      throw error;
    }

    await createAuditLog(user.id, 'course_enrolled', 'course', course.id, { code });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/courses/:courseId/enrollments', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !(await isAdmin(user))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { courseId } = req.params;
    const { data: enrollments, error } = await supabase
      .from('course_enrollments')
      .select('student_id, enrolled_at')
      .eq('course_id', courseId);

    if (error) throw error;

    const enriched = await Promise.all(
      (enrollments || []).map(async (enrollment) => {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(enrollment.student_id);
          const profile = userData?.user;
          return {
            id: enrollment.student_id,
            email: profile?.email,
            name: profile?.user_metadata?.name || profile?.email,
            student_id: profile?.user_metadata?.student_id || null,
            department: profile?.user_metadata?.department || null,
            year: profile?.user_metadata?.year || null,
            enrolled_at: enrollment.enrolled_at,
          };
        } catch (err) {
          return {
            id: enrollment.student_id,
            email: 'Unknown',
            name: 'Unknown',
            student_id: null,
            department: null,
            year: null,
            enrolled_at: enrollment.enrolled_at,
          };
        }
      })
    );

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/courses/:id', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !(await isAdmin(user))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { title, description, code } = req.body;

    const { data, error } = await supabase
      .from('courses')
      .update({ title, description, code })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog(user.id, 'course_updated', 'course', id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !(await isAdmin(user))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { error } = await supabase.from('courses').delete().eq('id', id);

    if (error) throw error;

    await createAuditLog(user.id, 'course_deleted', 'course', id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Course enrollment
app.post('/api/courses/:courseId/enroll', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId } = req.params;
    const { code } = req.body;

    // Verify course code if provided
    if (code) {
      const { data: course } = await supabase
        .from('courses')
        .select('id, code')
        .eq('id', courseId)
        .single();

      if (!course || course.code !== code) {
        return res.status(400).json({ error: 'Invalid course code' });
      }
    }

    const { data, error } = await supabase
      .from('course_enrollments')
      .insert({
        course_id: courseId,
        student_id: user.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Already enrolled' });
      }
      throw error;
    }

    await createAuditLog(user.id, 'course_enrolled', 'course', courseId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tasks routes
app.get('/api/courses/:courseId/tasks', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId } = req.params;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/courses/:courseId/tasks', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !(await isAdmin(user))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { courseId } = req.params;
    const { title, description, deadline, max_points } = req.body;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        course_id: courseId,
        title,
        description,
        deadline,
        max_points: max_points || 100,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Notify enrolled students
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('student_id')
      .eq('course_id', courseId);

    if (enrollments) {
      const { data: students } = await supabase.auth.admin.listUsers();
      enrollments.forEach(async (enrollment) => {
        const student = students?.users.find(u => u.id === enrollment.student_id);
        if (student?.email) {
          await sendEmail(
            student.email,
            `New Task: ${title}`,
            `<p>A new task "${title}" has been added to your course.</p>`
          );
        }
      });
    }

    await createAuditLog(user.id, 'task_created', 'task', data.id, { title });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !(await isAdmin(user))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { title, description, deadline, max_points } = req.body;

    const { data, error } = await supabase
      .from('tasks')
      .update({ title, description, deadline, max_points })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog(user.id, 'task_updated', 'task', id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !(await isAdmin(user))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) throw error;

    await createAuditLog(user.id, 'task_deleted', 'task', id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submissions routes
app.get('/api/tasks/:taskId/submissions', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { taskId } = req.params;
    const admin = await isAdmin(user);

    let query = supabase
      .from('submissions')
      .select('*')
      .eq('task_id', taskId);

    if (!admin) {
      // Students see only their own submissions
      query = query.eq('student_id', user.id);
    }

    const { data: submissions, error } = await query.order('submitted_at', { ascending: false });

    if (error) throw error;

    // Fetch student details separately
    const submissionsWithStudents = await Promise.all(
      (submissions || []).map(async (submission) => {
        try {
          const { data: studentData } = await supabase.auth.admin.getUserById(submission.student_id);
          return {
            ...submission,
            student: studentData?.user ? {
              id: studentData.user.id,
              email: studentData.user.email,
              raw_user_meta_data: studentData.user.user_metadata
            } : null
          };
        } catch (err) {
          return {
            ...submission,
            student: null
          };
        }
      })
    );

    res.json(submissionsWithStudents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks/:taskId/submissions', upload.array('files', 5), async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { taskId } = req.params;
    const { text_response } = req.body;

    // Check if already submitted
    const { data: existing } = await supabase
      .from('submissions')
      .select('id')
      .eq('task_id', taskId)
      .eq('student_id', user.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already submitted' });
    }

    // Get task to calculate points based on submission order and gating
    const { data: task } = await supabase
      .from('tasks')
      .select('max_points, course_id')
      .eq('id', taskId)
      .single();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { data: courseTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('course_id', task.course_id)
      .order('created_at', { ascending: true });

    const taskIndex = courseTasks?.findIndex(t => t.id === taskId) ?? -1;
    if (taskIndex > 0) {
      const previousTaskIds = courseTasks.slice(0, taskIndex).map(t => t.id);
      if (previousTaskIds.length > 0) {
        const { data: previousSubmissions } = await supabase
          .from('submissions')
          .select('task_id')
          .in('task_id', previousTaskIds)
          .eq('student_id', user.id);

        const completedIds = new Set(previousSubmissions?.map(sub => sub.task_id));
        const allCompleted = previousTaskIds.every(id => completedIds.has(id));
        if (!allCompleted) {
          return res.status(400).json({ error: 'Complete previous tasks before attempting this one' });
        }
      }
    }

    // Upload files to Supabase Storage
    const fileUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileName = `${taskId}/${user.id}/${Date.now()}_${file.originalname}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('submissions')
          .getPublicUrl(fileName);

        fileUrls.push(publicUrl);
      }
    }

    // Count existing submissions to determine points
    const { count } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', taskId);

    // Award points: first submission gets max_points, subsequent get decreasing points
    const submissionOrder = (count || 0) + 1;
    const pointsAwarded = Math.max(10, Math.floor((task?.max_points || 100) * (1 - (submissionOrder - 1) * 0.1)));

    const { data, error } = await supabase
      .from('submissions')
      .insert({
        task_id: taskId,
        student_id: user.id,
        text_response,
        file_urls: fileUrls,
        points_awarded: pointsAwarded,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    await createAuditLog(user.id, 'submission_created', 'submission', data.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/submissions/:id/grade', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !(await isAdmin(user))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { status, points_awarded, feedback } = req.body;

    const updateData = {
      status: status || 'graded',
      graded_at: new Date().toISOString(),
      graded_by: user.id
    };

    if (points_awarded !== undefined) {
      updateData.points_awarded = points_awarded;
    }
    if (feedback) {
      updateData.feedback = feedback;
    }

    const { data, error } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Notify student
    const { data: submission } = await supabase
      .from('submissions')
      .select('student_id, task:tasks!submissions_task_id_fkey(title)')
      .eq('id', id)
      .single();

    if (submission) {
      const { data: student } = await supabase.auth.admin.getUserById(submission.student_id);
      if (student?.user?.email) {
        await sendEmail(
          student.user.email,
          `Submission Graded: ${submission.task?.title || 'Task'}`,
          `<p>Your submission has been graded. Points: ${updateData.points_awarded || data.points_awarded}</p>${feedback ? `<p>Feedback: ${feedback}</p>` : ''}`
        );
      }
    }

    await createAuditLog(user.id, 'submission_graded', 'submission', id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Students list (admin only)
app.get('/api/students', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !(await isAdmin(user))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    const students = users.users.filter(u => !u.user_metadata?.is_admin);
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId } = req.query;

    let query = supabase
      .from('submissions')
      .select(`
        student_id,
        points_awarded,
        task:tasks!submissions_task_id_fkey(course_id)
      `);

    if (courseId) {
      // Get task IDs for this course
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('course_id', courseId);

      if (tasks && tasks.length > 0) {
        query = query.in('task_id', tasks.map(t => t.id));
      } else {
        return res.json([]);
      }
    }

    const { data: submissions, error } = await query;

    if (error) throw error;

    // Aggregate points by student
    const leaderboard = {};
    submissions?.forEach(sub => {
      if (!leaderboard[sub.student_id]) {
        leaderboard[sub.student_id] = {
          student_id: sub.student_id,
          total_points: 0,
          submissions_count: 0
        };
      }
      leaderboard[sub.student_id].total_points += sub.points_awarded || 0;
      leaderboard[sub.student_id].submissions_count += 1;
    });

    // Get student details
    const { data: users } = await supabase.auth.admin.listUsers();
    const leaderboardArray = Object.values(leaderboard)
      .map(entry => {
        const student = users?.users.find(u => u.id === entry.student_id);
        return {
          ...entry,
          email: student?.email,
          name: student?.user_metadata?.name || student?.email
        };
      })
      .sort((a, b) => b.total_points - a.total_points)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    res.json(leaderboardArray);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Audit logs (admin only)
app.get('/api/audit-logs', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || !(await isAdmin(user))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { limit = 100 } = req.query;
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Profile update
app.put('/api/profile', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, email } = req.body;
    const updateData = {};

    if (name) {
      updateData.user_metadata = { ...user.user_metadata, name };
    }

    if (email) {
      updateData.email = email;
    }

    const { data, error } = await supabase.auth.admin.updateUserById(user.id, updateData);

    if (error) throw error;

    await createAuditLog(user.id, 'profile_updated', 'user', user.id);
    res.json(data.user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

