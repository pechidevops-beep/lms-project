import { useState, useEffect, useMemo } from 'react';
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

export default function SuperAdminDashboard({ user, profile }) {
  const [pendingStaff, setPendingStaff] = useState([]);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [quickTasks, setQuickTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('staff'); // 'staff', 'quickTasks', or 'users'
  const [message, setMessage] = useState(null);
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showLoginHistoryModal, setShowLoginHistoryModal] = useState(false);
  const [selectedQuickTask, setSelectedQuickTask] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [newQuickTask, setNewQuickTask] = useState({ title: '', description: '' });
  const [quickTaskSearchTerm, setQuickTaskSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      // Load pending staff
      try {
        const staffRes = await api.get('/admin/staffs/pending');
        console.log('Pending staff response:', staffRes.data);
        setPendingStaff(staffRes.data || []);
      } catch (error) {
        console.error('Error loading pending staff:', error);
        setMessage({ type: 'error', text: `Error loading staff requests: ${error.response?.data?.error || error.message}` });
        setPendingStaff([]);
      }
      
      // Load students
      try {
        const studentsRes = await api.get('/admin/students');
        setStudents(studentsRes.data || []);
      } catch (error) {
        console.error('Error loading students:', error);
        setStudents([]);
      }
      
      // Load staff
      try {
        const staffRes = await api.get('/admin/staffs');
        setStaff(staffRes.data || []);
      } catch (error) {
        console.error('Error loading staff:', error);
        setStaff([]);
      }
      
      // Load login history
      try {
        const loginRes = await api.get('/auth/login-history');
        setLoginHistory(loginRes.data || []);
      } catch (error) {
        console.error('Error loading login history:', error);
        setLoginHistory([]);
      }
      
      // Load quick tasks (handle gracefully if table doesn't exist)
      try {
        const quickTasksRes = await api.get('/tasks/quick');
        setQuickTasks(quickTasksRes.data || []);
      } catch (error) {
        console.warn('Quick tasks table may not exist yet:', error.response?.data?.error || error.message);
        setQuickTasks([]);
        // Don't show error for quick tasks if table doesn't exist
      }
    } catch (error) {
      console.error('Unexpected error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingStaff = async () => {
    try {
      const res = await api.get('/admin/staffs/pending');
      setPendingStaff(res.data);
    } catch (error) {
      console.error('Error loading pending staff:', error);
    }
  };

  const handleApprove = async (staffId) => {
    try {
      await api.post(`/admin/staffs/${staffId}/approve`);
      setMessage({ type: 'success', text: 'Staff approved successfully!' });
      loadPendingStaff();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to approve staff' });
    }
  };

  const handleDecline = async (staffId) => {
    const reason = prompt('Reason for decline (optional):');
    try {
      await api.post(`/admin/staffs/${staffId}/decline`, { reason });
      setMessage({ type: 'success', text: 'Staff request declined' });
      loadPendingStaff();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to decline staff' });
    }
  };

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
      setMessage({ type: 'success', text: 'Quick task assigned successfully' });
      setShowAssignModal(false);
      setSelectedStudents(new Set());
      setSelectedQuickTask(null);
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to assign quick task' });
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
      setMessage({ type: 'success', text: 'Quick task unassigned successfully' });
      setShowAssignModal(false);
      setSelectedStudents(new Set());
      setSelectedQuickTask(null);
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to unassign quick task' });
    }
  };

  const handleDeleteQuickTask = async (id) => {
    if (!confirm('Are you sure you want to delete this quick task?')) return;
    try {
      await api.delete(`/tasks/quick/${id}`);
      setQuickTasks(quickTasks.filter(t => t.id !== id));
      setMessage({ type: 'success', text: 'Quick task deleted successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete quick task' });
    }
  };

  if (loading) {
    return <Layout user={user} profile={profile}><div>Loading...</div></Layout>;
  }

  return (
    <Layout user={user} profile={profile}>
      <div className="mb-4">
        <h2>SuperAdmin Dashboard</h2>
        <p className="text-muted">Manage staff approval requests, quick tasks, and system administration.</p>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} mb-4`}>
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div 
          className="stats-card" 
          style={{ cursor: 'pointer' }}
          onClick={() => setShowStudentsModal(true)}
        >
          <p>Total Students</p>
          <h3>{students.length}</h3>
          <span>Click to view registered students</span>
        </div>
        <div 
          className="stats-card" 
          style={{ cursor: 'pointer' }}
          onClick={() => setShowStaffModal(true)}
        >
          <p>Total Staff</p>
          <h3>{staff.length}</h3>
          <span>Click to view registered staff</span>
        </div>
        <div 
          className="stats-card" 
          style={{ cursor: 'pointer' }}
          onClick={() => setShowLoginHistoryModal(true)}
        >
          <p>Login History</p>
          <h3>{loginHistory.length}</h3>
          <span>Click to view and manage</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
        <button
          className={`btn ${activeTab === 'staff' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('staff')}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: activeTab === 'staff' ? '2px solid transparent' : 'none' }}
        >
          Staff Approval
        </button>
        <button
          className={`btn ${activeTab === 'quickTasks' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('quickTasks')}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: activeTab === 'quickTasks' ? '2px solid transparent' : 'none' }}
        >
          Quick Tasks
        </button>
      </div>

      {activeTab === 'staff' && (
        <div className="card">
          <h3 className="mb-3">Pending Staff Approval Requests</h3>
          {pendingStaff.length === 0 ? (
            <p className="text-muted">No pending staff requests.</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Staff ID</th>
                    <th>Department</th>
                    <th>Requested</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingStaff.map((staff) => (
                    <tr key={staff.id}>
                      <td>{staff.display_name || 'N/A'}</td>
                      <td>{staff.email}</td>
                      <td>{staff.staff_id || 'N/A'}</td>
                      <td>{staff.dept || 'N/A'}</td>
                      <td>{new Date(staff.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-success btn-sm me-2"
                          onClick={() => handleApprove(staff.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDecline(staff.id)}
                        >
                          Decline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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

      {/* Quick Task Modal */}
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
                setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create quick task' });
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

      {/* Staff Modal */}
      {showStaffModal && (
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

      {/* Login History Modal */}
      {showLoginHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowLoginHistoryModal(false)}>
          <div className="modal-content" style={{ maxWidth: '1000px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Login History ({loginHistory.length})</h3>
              <button className="btn btn-secondary" onClick={() => setShowLoginHistoryModal(false)}>Close</button>
            </div>
            {loginHistory.length > 0 ? (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Login Time</th>
                      <th>IP Address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginHistory.map(login => (
                      <tr key={login.id}>
                        <td>{login.email}</td>
                        <td>
                          <span className={`badge badge-${login.role === 'superadmin' ? 'danger' : login.role === 'admin' ? 'warning' : login.role === 'staff' ? 'info' : 'success'}`}>
                            {login.role}
                          </span>
                        </td>
                        <td>{new Date(login.login_at).toLocaleString()}</td>
                        <td>{login.ip_address || '—'}</td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={async () => {
                              if (!confirm('Are you sure you want to remove this login record?')) return;
                              try {
                                await api.delete(`/auth/login-history/${login.id}`);
                                setMessage({ type: 'success', text: 'Login record removed successfully' });
                                loadData();
                              } catch (error) {
                                setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to remove login record' });
                              }
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>No login history</p>
            )}
          </div>
        </div>
      )}

    </Layout>
  );
}

