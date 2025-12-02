import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';

const isImage = (url = '') => /\.(png|jpe?g|gif|webp|svg)$/i.test(url);

export default function AdminCourseDetail({ user }) {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setCourse(courseRes);
      setTasks(tasksRes.data);
      setEnrollments(enrollmentsRes.data || []);

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
    return <Layout user={user}><div>Loading...</div></Layout>;
  }

  return (
    <Layout user={user}>
      <Link to="/admin" className="btn btn-secondary" style={{ marginBottom: '20px' }}>
        ← Back to Dashboard
      </Link>
      <h2>{course?.title || 'Course Details'}</h2>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>{course?.description}</p>

      <div className="card" style={{ marginBottom: '25px' }}>
        <div className="flex-between">
          <h3>Enrolled Students ({enrollments.length})</h3>
        </div>
        {enrollments.length ? (
          <table className="table" style={{ marginTop: '15px' }}>
            <thead>
              <tr>
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
            <div>
              <h3>{task.title}</h3>
              {task.description && <p style={{ marginTop: '5px' }}>{task.description}</p>}
              <p style={{ color: '#6b7280', marginTop: '10px' }}>
                Deadline: {task.deadline ? new Date(task.deadline).toLocaleString() : 'No deadline'}
                {' | '}Max Points: {task.max_points}
              </p>
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

