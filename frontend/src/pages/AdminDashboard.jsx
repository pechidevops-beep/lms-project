import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import Layout from '../components/Layout';

// Component to make links clickable in task descriptions
const LinkifyDescription = ({ text }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return (
    <span>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#3b82f6', textDecoration: 'underline', wordBreak: 'break-all' }}
              onClick={(e) => {
                e.stopPropagation();
                window.open(part, '_blank');
              }}
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default function AdminDashboard({ user, profile }) {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [quickTasks, setQuickTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' or 'quickTasks'
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showUnlockRequestsModal, setShowUnlockRequestsModal] = useState(false);
  const [unlockRequests, setUnlockRequests] = useState([]);
  const [selectedQuickTask, setSelectedQuickTask] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', code: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', deadline: '', max_points: 100 });
  const [newQuickTask, setNewQuickTask] = useState({ title: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [quickTaskSearchTerm, setQuickTaskSearchTerm] = useState('');
  const navigate = useNavigate();

  // Helper: Check if user can modify a course (is creator or superadmin)
  const canModifyCourse = (course) => {
    if (!course || !user) return false;
    // Superadmin can modify any course
    if (profile?.role === 'superadmin') return true;
    // Staff can only modify courses they created
    return course.created_by === user.id;
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map unlock requests by course for quick lookup per course card
  const coursePendingMap = useMemo(() => {
    const map = {};
    (unlockRequests || []).forEach((req) => {
      const courseId = req.task?.course_id;
      if (!courseId) return;
      if (!map[courseId]) map[courseId] = [];
      map[courseId].push(req);
    });
    return map;
  }, [unlockRequests]);

  const handleUpdateUnlockRequest = async (requestId, status) => {
    try {
      await api.put(`/tasks/unlock-requests/${requestId}`, { status });
      // Optimistically remove from local pending list; loadData will sync
      setUnlockRequests(prev => prev.filter(r => r.id !== requestId));
      await loadData();
    } catch (error) {
      alert(error.response?.data?.error || `Failed to ${status} request`);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const coursePromise = api.get('/courses');
      const studentsPromise = api.get('/admin/students');
      const quickPromise = api.get('/tasks/quick');
      const staffPromise =
        profile?.role === 'admin' || profile?.role === 'superadmin'
          ? api.get('/admin/staffs')
          : null;
      const unlockPromise =
        profile?.role === 'admin' || profile?.role === 'staff'
          ? api.get('/tasks/unlock-requests?status=pending').catch(() => ({ data: [] }))
          : null;

      const [courseRes, studentsRes, quickRes, staffRes, unlockRes] = await Promise.all([
        coursePromise,
        studentsPromise,
        quickPromise,
        staffPromise,
        unlockPromise
      ]);

      setCourses(courseRes?.data || []);
      setStudents(studentsRes?.data || []);
      setQuickTasks(quickRes?.data || []);
      if (staffRes) setStaff(staffRes.data || []);
      if (unlockRes) setUnlockRequests(unlockRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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

  const filteredQuickTasks = useMemo(() => {
    const term = quickTaskSearchTerm.trim().toLowerCase();
    if (!term) return quickTasks;
    return quickTasks.filter(task =>
      task.title.toLowerCase().includes(term) ||
      task.description?.toLowerCase().includes(term)
    );
  }, [quickTasks, quickTaskSearchTerm]);

  const handleAssignQuickTask = async () => {
    if (!selectedQuickTask) return;
    const studentIds = Array.from(selectedStudents);
    if (studentIds.length === 0) {
      alert('Please select at least one student');
      return;
    }
    try {
      await api.post(`/tasks/quick/${selectedQuickTask.id}/assign`, { student_ids: studentIds });
      alert('Quick task assigned successfully');
      setShowAssignModal(false);
      setSelectedStudents(new Set());
      setSelectedQuickTask(null);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to assign quick task');
    }
  };

  const handleUnassignQuickTask = async () => {
    if (!selectedQuickTask) return;
    const studentIds = Array.from(selectedStudents);
    if (studentIds.length === 0) {
      alert('Please select at least one student');
      return;
    }
    try {
      await api.post(`/tasks/quick/${selectedQuickTask.id}/unassign`, { student_ids: studentIds });
      alert('Quick task unassigned successfully');
      setShowAssignModal(false);
      setSelectedStudents(new Set());
      setSelectedQuickTask(null);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to unassign quick task');
    }
  };

  const handleDeleteQuickTask = async (id) => {
    if (!confirm('Are you sure you want to delete this quick task?')) return;
    try {
      await api.delete(`/tasks/quick/${id}`);
      setQuickTasks(quickTasks.filter(t => t.id !== id));
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete quick task');
    }
  };

  if (loading) {
    return <Layout user={user} profile={profile}><div>Loading...</div></Layout>;
  }

  return (
    <Layout user={user} profile={profile}>
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
            <button
              className="btn btn-outline"
              onClick={() => setShowQuickTaskModal(true)}
            >
              + Create Global Quick Task
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
        <div 
          className="stats-card" 
          style={{ cursor: 'pointer' }}
          onClick={() => setShowStudentsModal(true)}
        >
          <p>Total Students</p>
          <h3>{stats.totalStudents}</h3>
          <span>Click to view registered learners</span>
        </div>
        <div className="stats-card">
          <p>Avg Students / Course</p>
          <h3>{stats.avgStudentsPerCourse}</h3>
          <span>Engagement health</span>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
          <div 
            className="stats-card" 
            style={{ cursor: 'pointer' }}
            onClick={() => setShowStaffModal(true)}
          >
            <p>Total Staff</p>
            <h3>{staff.length}</h3>
            <span>Click to view registered staff</span>
          </div>
        )}
        {(profile?.role === 'admin' || profile?.role === 'staff') && unlockRequests.length > 0 && (
          <div 
            className="stats-card" 
            style={{ cursor: 'pointer', border: '2px solid #f59e0b' }}
            onClick={() => setShowUnlockRequestsModal(true)}
          >
            <p>Pending Unlock Requests</p>
            <h3>{unlockRequests.length}</h3>
            <span>Click to review requests</span>
          </div>
        )}
      </div>


      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
        <button
          className={`btn ${activeTab === 'courses' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('courses')}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: activeTab === 'courses' ? '2px solid transparent' : 'none' }}
        >
          Courses
        </button>
        <button
          className={`btn ${activeTab === 'quickTasks' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('quickTasks')}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: activeTab === 'quickTasks' ? '2px solid transparent' : 'none' }}
        >
          Quick Tasks
        </button>
      </div>

      {activeTab === 'courses' && (
        <>
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
                    {canModifyCourse(course) && (coursePendingMap[course.id]?.length > 0) && (
                      <div className="alert" style={{ background: '#fff7ed', border: '1px solid #fb923c', borderRadius: '8px', padding: '10px 12px', marginTop: '10px' }}>
                        <strong>{coursePendingMap[course.id].length} pending unlock request(s)</strong>
                        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {coursePendingMap[course.id].map((req) => (
                            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{req.task?.title || 'Task'}</div>
                                <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                                  {req.student?.display_name || req.student?.email || 'Student'} — {req.reason}
                                </div>
                                <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                                  Requested: {new Date(req.requested_at).toLocaleString()}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleUpdateUnlockRequest(req.id, 'approved')}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleUpdateUnlockRequest(req.id, 'rejected')}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {canModifyCourse(course) && (
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
                    )}
                    {!canModifyCourse(course) && (
                      <div style={{ padding: '10px 0', color: '#6b7280', fontSize: '0.875rem' }}>
                        View only - Created by another staff member
                      </div>
                    )}
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
        </>
      )}

      {activeTab === 'quickTasks' && (
        <>
          <div className="section-header">
            <div>
              <h3>Quick Tasks</h3>
              <p>Create and assign quick tasks to selected students.</p>
            </div>
            <div className="section-actions">
              <button className="btn btn-primary" onClick={() => setShowQuickTaskModal(true)}>
                + Create Quick Task
              </button>
              <input
                type="text"
                placeholder="Search quick tasks..."
                className="search-input"
                value={quickTaskSearchTerm}
                onChange={(e) => setQuickTaskSearchTerm(e.target.value)}
                style={{ marginLeft: '10px' }}
              />
            </div>
          </div>

          <div className="row g-4">
            {filteredQuickTasks.map(task => (
              <div key={task.id} className="col-12 col-md-6 col-xl-4">
                <div className="card course-card h-100">
                  <div className="course-card__content">
                    <div>
                      <h3>{task.title}</h3>
                      {task.description ? (
                        <div className="course-description">
                          <LinkifyDescription text={task.description} />
                        </div>
                      ) : (
                        <p className="course-description muted">No description provided</p>
                      )}
                      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '10px' }}>
                        Created: {new Date(task.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="course-actions">
                      <button
                        className="btn btn-primary ghost"
                        onClick={() => {
                          setSelectedQuickTask(task);
                          setShowAssignModal(true);
                        }}
                      >
                        Assign to Students
                      </button>
                      <button
                        className="btn btn-danger ghost"
                        onClick={() => handleDeleteQuickTask(task.id)}
                      >
                        Remove Task
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!filteredQuickTasks.length && (
            <div className="empty-state">
              <h3>No quick tasks found</h3>
              <p>Create a new quick task to get started</p>
            </div>
          )}
        </>
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

      {/* Quick Task Modal (global quick tasks) */}
      {showQuickTaskModal && (
        <div className="modal-overlay" onClick={() => setShowQuickTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Quick Task</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.post('/tasks/quick', newQuickTask);
                setNewQuickTask({ title: '', description: '' });
                setShowQuickTaskModal(false);
                loadData();
              } catch (err) {
                alert(err.response?.data?.error || 'Failed to create quick task');
              }
            }}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  className="input"
                  value={newQuickTask.title}
                  onChange={(e) => setNewQuickTask({ ...newQuickTask, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="input"
                  rows="4"
                  value={newQuickTask.description}
                  onChange={(e) => setNewQuickTask({ ...newQuickTask, description: e.target.value })}
                />
              </div>
              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowQuickTaskModal(false)}>
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

      {/* Assign Quick Task Modal */}
      {showAssignModal && selectedQuickTask && (
        <div className="modal-overlay" onClick={() => {
          setShowAssignModal(false);
          setSelectedStudents(new Set());
          setSelectedQuickTask(null);
        }}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3>Assign Quick Task: {selectedQuickTask.title}</h3>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>{selectedQuickTask.description}</p>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleAssignQuickTask}
                  disabled={selectedStudents.size === 0}
                >
                  Assign to Selected ({selectedStudents.size})
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleUnassignQuickTask}
                  disabled={selectedStudents.size === 0}
                >
                  Unassign from Selected ({selectedStudents.size})
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const allIds = new Set(students.map(s => s.id));
                    setSelectedStudents(allIds);
                  }}
                >
                  Select All
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedStudents(new Set())}
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>
                      <input
                        type="checkbox"
                        checked={selectedStudents.size === students.length && students.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents(new Set(students.map(s => s.id)));
                          } else {
                            setSelectedStudents(new Set());
                          }
                        }}
                      />
                    </th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Student ID</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.id)}
                          onChange={(e) => {
                            const copy = new Set(selectedStudents);
                            if (e.target.checked) {
                              copy.add(student.id);
                            } else {
                              copy.delete(student.id);
                            }
                            setSelectedStudents(copy);
                          }}
                        />
                      </td>
                      <td>{student.display_name || student.email}</td>
                      <td>{student.email}</td>
                      <td>{student.student_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {students.length === 0 && (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>No students found</p>
              )}
            </div>

            <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedStudents(new Set());
                  setSelectedQuickTask(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Students Modal */}
      {showStudentsModal && (
        <div className="modal-overlay" onClick={() => setShowStudentsModal(false)}>
          <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Registered Students ({students.length})</h3>
              <button className="btn btn-secondary" onClick={() => setShowStudentsModal(false)}>Close</button>
            </div>
            {students.length > 0 ? (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Year (Badge)</th>
                      <th>Student ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id}>
                        <td>{s.display_name || '—'}</td>
                        <td>{s.email}</td>
                        <td>{s.dept || '—'}</td>
                        <td>{s.badge || '—'}</td>
                        <td>{s.student_id || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>No students registered</p>
            )}
          </div>
        </div>
      )}

      {/* Staff Modal (Admin/SuperAdmin only) */}
      {showStaffModal && (profile?.role === 'admin' || profile?.role === 'superadmin') && (
        <div className="modal-overlay" onClick={() => setShowStaffModal(false)}>
          <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Registered Staff ({staff.length})</h3>
              <button className="btn btn-secondary" onClick={() => setShowStaffModal(false)}>Close</button>
            </div>
            {staff.length > 0 ? (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Staff ID</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(s => (
                      <tr key={s.id}>
                        <td>{s.display_name || '—'}</td>
                        <td>{s.email}</td>
                        <td>{s.dept || '—'}</td>
                        <td>{s.staff_id || '—'}</td>
                        <td>
                          <span className={`badge badge-${s.role === 'superadmin' ? 'danger' : s.role === 'admin' ? 'warning' : 'info'}`}>
                            {s.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>No staff registered</p>
            )}
          </div>
        </div>
      )}

      {/* Unlock Requests Modal */}
      {showUnlockRequestsModal && (
        <div className="modal-overlay" onClick={() => setShowUnlockRequestsModal(false)}>
          <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Pending Unlock Requests ({unlockRequests.length})</h3>
              <button className="btn btn-secondary" onClick={() => setShowUnlockRequestsModal(false)}>Close</button>
            </div>
            {unlockRequests.length > 0 ? (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {unlockRequests.map(request => (
                  <div key={request.id} className="card" style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h4>{request.task?.title || 'Task'}</h4>
                        <p style={{ color: '#6b7280', marginTop: '5px' }}>
                          <strong>Student:</strong> {request.student?.display_name || request.student?.email} ({request.student?.student_id || '—'})
                        </p>
                        <p style={{ color: '#6b7280', marginTop: '5px' }}>
                          <strong>Reason:</strong> {request.reason}
                        </p>
                        <p style={{ color: '#6b7280', marginTop: '5px', fontSize: '0.875rem' }}>
                          Requested: {new Date(request.requested_at).toLocaleString()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginLeft: '15px' }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={async () => {
                            await handleUpdateUnlockRequest(request.id, 'approved');
                          }}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={async () => {
                            await handleUpdateUnlockRequest(request.id, 'rejected');
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>No pending unlock requests</p>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

