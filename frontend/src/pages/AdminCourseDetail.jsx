import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';

const isImage = (url = '') => /\.(png|jpe?g|gif|webp|svg)$/i.test(url);

// Component to make links clickable in task descriptions
const LinkifyDescription = ({ text }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return (
    <p>
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
    </p>
  );
};

export default function AdminCourseDetail({ user, profile }) {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [enrollments, setEnrollments] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [availableQuickTasks, setAvailableQuickTasks] = useState([]);
  const [selectedQuickTask, setSelectedQuickTask] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper: Check if user can modify this course (is creator or superadmin)
  const canModifyCourse = () => {
    if (!course || !user) return false;
    // Superadmin can modify any course
    if (profile?.role === 'superadmin') return true;
    // Staff can only modify courses they created
    return course.created_by === user.id;
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    try {
      const [courseRes, tasksRes, enrollmentsRes] = await Promise.all([
        api.get(`/courses`).then(res => res.data.find(c => c.id === courseId)),
        api.get(`/courses/${courseId}/tasks`),
        api.get(`/courses/${courseId}/enrollments`)
      ]);
      // also load quick tasks
      const [quickRes] = await Promise.all([
        api.get('/tasks/quick')
      ]);
      setCourse(courseRes);
      setTasks(tasksRes.data);
      setEnrollments(enrollmentsRes.data || []);
      setAvailableQuickTasks(quickRes.data || []);

      // Load submissions for each task
      const submissionsData = {};
      for (const task of tasksRes.data) {
        const subsRes = await api.get(`/tasks/${task.id}/submissions`);
        submissionsData[task.id] = subsRes.data;
      }
      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async (submissionId, status, points, feedback) => {
    try {
      await api.put(`/submissions/${submissionId}/grade`, {
        status,
        points_awarded: points,
        feedback,
      });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to grade submission');
    }
  };

  if (loading) {
    return <Layout user={user} profile={profile}><div>Loading...</div></Layout>;
  }

  return (
    <Layout user={user} profile={profile}>
      <Link to="/admin" className="btn btn-secondary" style={{ marginBottom: '20px' }}>
        ← Back to Dashboard
      </Link>
      <h2>{course?.title || 'Course Details'}</h2>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>{course?.description}</p>

      <div className="card" style={{ marginBottom: '25px' }}>
        <div className="flex-between">
          <h3>Enrolled Students ({enrollments.length})</h3>
          {canModifyCourse() && (
            <div>
              <select value={selectedQuickTask || ''} onChange={(e) => setSelectedQuickTask(e.target.value || null)}>
                <option value="">Select Quick Task</option>
                {availableQuickTasks.map(q => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!selectedQuickTask) return alert('Select a quick task');
                  const ids = Array.from(selectedStudents);
                  try {
                    await api.post(`/tasks/quick/${selectedQuickTask}/assign`, { student_ids: ids });
                    alert('Assigned quick task to selected students');
                  } catch (err) {
                    alert(err.response?.data?.error || 'Failed to assign');
                  }
                }}
                style={{ marginLeft: '10px' }}
              >Assign</button>
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  if (!selectedQuickTask) return alert('Select a quick task');
                  const ids = Array.from(selectedStudents);
                  try {
                    await api.post(`/tasks/quick/${selectedQuickTask}/unassign`, { student_ids: ids });
                    alert('Unassigned quick task from selected students');
                  } catch (err) {
                    alert(err.response?.data?.error || 'Failed to unassign');
                  }
                }}
                style={{ marginLeft: '10px' }}
              >Unassign</button>
            </div>
          )}
          {!canModifyCourse() && (
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>View only - Created by another staff member</p>
          )}
        </div>
        {enrollments.length ? (
          <table className="table" style={{ marginTop: '15px' }}>
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Student ID</th>
                <th>Department</th>
                <th>Year</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map(student => (
                <tr key={student.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.id)}
                      onChange={(e) => {
                        const copy = new Set(selectedStudents);
                        if (e.target.checked) copy.add(student.id);
                        else copy.delete(student.id);
                        setSelectedStudents(copy);
                      }}
                    />
                  </td>
                  <td>{student.name || student.email}</td>
                  <td>{student.student_id || '—'}</td>
                  <td>{student.department || '—'}</td>
                  <td>{student.year || '—'}</td>
                  <td>{student.enrolled_at ? new Date(student.enrolled_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#6b7280', marginTop: '10px' }}>No students have joined this course yet.</p>
        )}
      </div>

      {tasks.map(task => (
        <div key={task.id} className="card">
          <div className="flex-between">
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3>{task.title}</h3>
                  {task.description && (
                    <div style={{ marginTop: '5px' }}>
                      <LinkifyDescription text={task.description} />
                    </div>
                  )}
                  <p style={{ color: '#6b7280', marginTop: '10px' }}>
                    Deadline: {task.deadline ? new Date(task.deadline).toLocaleString() : 'No deadline'}
                    {' | '}Max Points: {task.max_points}
                  </p>
                </div>
                {canModifyCourse() && (
                  <button
                    className="btn btn-danger ghost"
                    onClick={async () => {
                      if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
                      try {
                        await api.delete(`/tasks/${task.id}`);
                        loadData();
                      } catch (error) {
                        alert(error.response?.data?.error || 'Failed to delete task');
                      }
                    }}
                    style={{ marginLeft: '10px' }}
                  >
                    Remove Task
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4>Submissions ({submissions[task.id]?.length || 0})</h4>
            {submissions[task.id]?.length > 0 ? (
              <table className="table" style={{ marginTop: '10px' }}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Submitted</th>
                    <th>Response</th>
                    <th>Files</th>
                    <th>Status</th>
                    <th>Points</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions[task.id].map(sub => (
                    <tr key={sub.id}>
                      <td>{sub.student?.email || 'Unknown'}</td>
                      <td>{new Date(sub.submitted_at).toLocaleString()}</td>
                      <td style={{ maxWidth: '220px' }}>
                        {sub.text_response ? (
                          <span>{sub.text_response}</span>
                        ) : (
                          <span className="text-muted">No text response</span>
                        )}
                      </td>
                      <td>
                        {sub.file_urls?.length ? (
                          <div className="submission-files">
                            {sub.file_urls.map((url, idx) => (
                              <div key={url} className="submission-file">
                                <a href={url} target="_blank" rel="noopener noreferrer">
                                  File {idx + 1}
                                </a>
                                {isImage(url) && (
                                  <div className="submission-preview">
                                    <img src={url} alt={`Submission file ${idx + 1}`} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">No files</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${sub.status === 'accepted' ? 'success' : sub.status === 'rejected' ? 'danger' : 'warning'}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td>{sub.points_awarded}</td>
                      <td>
                        {canModifyCourse() ? (
                          <button
                            className="btn btn-success"
                            style={{ fontSize: '12px', padding: '5px 10px' }}
                            onClick={() => {
                              const points = prompt('Enter points:', sub.points_awarded || task.max_points);
                              const feedback = prompt('Enter feedback (optional):', sub.feedback || '');
                              if (points !== null) {
                                handleGradeSubmission(sub.id, 'accepted', parseInt(points), feedback);
                              }
                            }}
                          >
                            Grade
                          </button>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>View only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#6b7280', marginTop: '10px' }}>No submissions yet</p>
            )}
          </div>
        </div>
      ))}

      {tasks.length === 0 && (
        <div className="empty-state">
          <h3>No tasks yet</h3>
          <p>Create tasks from the main dashboard</p>
        </div>
      )}
    </Layout>
  );
}

