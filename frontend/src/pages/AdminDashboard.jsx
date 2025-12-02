import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import Layout from '../components/Layout';

export default function AdminDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', code: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', deadline: '', max_points: 100 });
  const [searchTerm, setSearchTerm] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(true);
  const [adminKey, setAdminKey] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isVerified) {
      loadData();
    }
  }, [isVerified]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesRes, studentsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/students'),
      ]);
      setCourses(coursesRes.data);
      setStudents(studentsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyKey = async (e) => {
    e.preventDefault();
    setVerificationError('');
    try {
      await api.post('/auth/validate-admin', { adminKey });
      setIsVerified(true);
      setShowKeyModal(false);
    } catch (error) {
      setVerificationError(error.response?.data?.error || 'Invalid admin access key');
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/courses', newCourse);
      setCourses([...courses, res.data]);
      setNewCourse({ title: '', description: '', code: '' });
      setShowCourseModal(false);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create course');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/courses/${selectedCourse.id}/tasks`, {
        ...newTask,
        deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : null,
      });
      setNewTask({ title: '', description: '', deadline: '', max_points: 100 });
      setShowTaskModal(false);
      setSelectedCourse(null);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create task');
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await api.delete(`/courses/${id}`);
      setCourses(courses.filter(c => c.id !== id));
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete course');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter(course =>
      course.title.toLowerCase().includes(term) ||
      course.code.toLowerCase().includes(term) ||
      course.description?.toLowerCase().includes(term)
    );
  }, [courses, searchTerm]);

  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const totalStudents = students.length;
    const avgStudentsPerCourse = totalCourses ? Math.round(totalStudents / totalCourses) : 0;
    return {
      totalCourses,
      totalStudents,
      avgStudentsPerCourse,
    };
  }, [courses, students]);

  if (!isVerified) {
    return (
      <Layout user={user}>
        <div className="card" style={{ maxWidth: '520px', margin: '60px auto', textAlign: 'center' }}>
          <h3>Admin Access Locked</h3>
          <p style={{ marginTop: '10px', color: '#6b7280' }}>
            Enter the shared admin access key to open the management console.
          </p>
          <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => setShowKeyModal(true)}>
            Enter Admin Key
          </button>
        </div>

        {showKeyModal && (
          <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Admin Access Key</h3>
              <form onSubmit={handleVerifyKey}>
                <div className="form-group">
                  <label>Shared Admin Password</label>
                  <input
                    type="password"
                    className="input"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    required
                  />
                </div>
                {verificationError && (
                  <div className="error-message" style={{ marginBottom: '10px' }}>
                    {verificationError}
                  </div>
                )}
                <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowKeyModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Unlock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Layout>
    );
  }

  if (loading) {
    return <Layout user={user}><div>Loading...</div></Layout>;
  }

  return (
    <Layout user={user}>
      <div className="dashboard-hero">
        <div>
          <p className="hero-kicker">Welcome back</p>
          <h2>{user?.user_metadata?.name || user?.email || 'Admin'}</h2>
          <p className="hero-subtitle">
            Manage courses, launch tasks, and keep your learners engaged.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => setShowCourseModal(true)}>
              + Create Course
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                if (!courses.length) return;
                setSelectedCourse(courses[0]);
                setShowTaskModal(true);
              }}
              disabled={!courses.length}
            >
              + Quick Task
            </button>
          </div>
        </div>
        <div className="hero-highlight">
          <p>Active Students</p>
          <h3>{stats.totalStudents}</h3>
          <span>{stats.avgStudentsPerCourse} avg per course</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <p>Total Courses</p>
          <h3>{stats.totalCourses}</h3>
          <span>Across all programs</span>
        </div>
        <div className="stats-card">
          <p>Total Students</p>
          <h3>{stats.totalStudents}</h3>
          <span>Registered learners</span>
        </div>
        <div className="stats-card">
          <p>Avg Students / Course</p>
          <h3>{stats.avgStudentsPerCourse}</h3>
          <span>Engagement health</span>
        </div>
      </div>

      <div className="section-header">
        <div>
          <h3>Active Courses</h3>
          <p>Curate lessons, view tasks, and watch submissions roll in.</p>
        </div>
        <div className="section-actions">
          <input
            type="text"
            placeholder="Search by course or code..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="row g-4">
        {filteredCourses.map(course => (
          <div key={course.id} className="col-12 col-md-6 col-xl-4">
            <div className="card course-card h-100">
              <div className="course-code-chip">#{course.code}</div>
              <div className="course-card__content">
                <div>
                  <h3>{course.title}</h3>
                  {course.description ? (
                    <p className="course-description">{course.description}</p>
                  ) : (
                    <p className="course-description muted">No description provided</p>
                  )}
                </div>
                <div className="course-actions">
                  <button
                    className="btn btn-secondary ghost"
                    onClick={() => {
                      setSelectedCourse(course);
                      setShowTaskModal(true);
                    }}
                  >
                    Add Task
                  </button>
                  <button
                    className="btn btn-danger ghost"
                    onClick={() => handleDeleteCourse(course.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <Link to={`/admin/courses/${course.id}`} className="btn btn-primary full-width">
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>

      {!filteredCourses.length && (
        <div className="empty-state">
          <h3>No courses match that filter</h3>
          <p>Try adjusting your search or create a new course</p>
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Course</h3>
            <form onSubmit={handleCreateCourse}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  className="input"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="input"
                  rows="4"
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Join Code (leave empty for auto-generate)</label>
                <input
                  type="text"
                  className="input"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                />
              </div>
              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCourseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && selectedCourse && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Task for {selectedCourse.title}</h3>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  className="input"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="input"
                  rows="4"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Deadline</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Max Points</label>
                <input
                  type="number"
                  className="input"
                  value={newTask.max_points}
                  onChange={(e) => setNewTask({ ...newTask, max_points: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

