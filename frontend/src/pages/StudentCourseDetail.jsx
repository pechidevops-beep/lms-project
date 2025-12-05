import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';

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

export default function StudentCourseDetail({ user }) {
  const { courseId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [taskUnlocks, setTaskUnlocks] = useState({});
  const [unlockRequests, setUnlockRequests] = useState({});
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showUnlockRequestModal, setShowUnlockRequestModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [textResponse, setTextResponse] = useState('');
  const [unlockReason, setUnlockReason] = useState('');
  const [files, setFiles] = useState([]);

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    try {
      const tasksRes = await api.get(`/courses/${courseId}/tasks`);
      setTasks(tasksRes.data);

      // Load submissions and unlock status for each task
      const submissionsData = {};
      const unlocksData = {};
      const requestsData = {};
      
      for (const task of tasksRes.data) {
        try {
          const subsRes = await api.get(`/tasks/${task.id}/submissions`);
          submissionsData[task.id] = subsRes.data[0] || null;
        } catch (error) {
          submissionsData[task.id] = null;
        }
        
        // Check unlock status
        try {
          const unlockRes = await api.get(`/tasks/${task.id}/unlock-status`);
          unlocksData[task.id] = unlockRes.data.unlocked || false;
        } catch (error) {
          unlocksData[task.id] = false;
        }
      }
      
      setSubmissions(submissionsData);
      setTaskUnlocks(unlocksData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    const formData = new FormData();
    formData.append('text_response', textResponse);
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      await api.post(`/tasks/${selectedTask.id}/submissions`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setTextResponse('');
      setFiles([]);
      setShowSubmitModal(false);
      setSelectedTask(null);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to submit');
    }
  };

  const isTaskUnlocked = (taskId) => {
    const index = tasks.findIndex(task => task.id === taskId);
    if (index <= 0) return true;
    for (let i = 0; i < index; i++) {
      if (!submissions[tasks[i].id]) {
        return false;
      }
    }
    return true;
  };

  const handleUnlockRequest = async () => {
    if (!selectedTask || !unlockReason.trim()) {
      alert('Please provide a reason for unlock request');
      return;
    }
    
    try {
      await api.post(`/tasks/${selectedTask.id}/unlock-request`, { reason: unlockReason });
      alert('Unlock request submitted successfully. Staff will review your request.');
      setShowUnlockRequestModal(false);
      setUnlockReason('');
      setSelectedTask(null);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to submit unlock request');
    }
  };

  if (loading) {
    return <Layout user={user}><div>Loading...</div></Layout>;
  }

  return (
    <Layout user={user}>
      <Link to="/student" className="btn btn-secondary" style={{ marginBottom: '20px' }}>
        ← Back to Dashboard
      </Link>
      <h2>Course Tasks</h2>

      {tasks.map(task => {
        const submission = submissions[task.id];
        const isPastDeadline = task.deadline && new Date(task.deadline) < new Date();
        const isSubmitted = submission !== null;
        const isUnlockedBySequence = isTaskUnlocked(task.id);
        const isUnlockedByAdmin = taskUnlocks[task.id] || false;
        const canSubmit = isUnlockedBySequence && (isUnlockedByAdmin || !isPastDeadline || isSubmitted);

        return (
          <div key={task.id} className="card">
            <div className="flex-between">
              <div style={{ flex: 1 }}>
                <h3>{task.title}</h3>
                {task.description && (
                  <div style={{ marginTop: '5px' }}>
                    <LinkifyDescription text={task.description} />
                  </div>
                )}
                <p style={{ color: '#6b7280', marginTop: '10px' }}>
                  Deadline: {task.deadline ? new Date(task.deadline).toLocaleString() : 'No deadline'}
                  {isPastDeadline && !isSubmitted && !isUnlockedByAdmin && (
                    <span className="badge badge-danger" style={{ marginLeft: '10px' }}>Locked - Deadline Passed</span>
                  )}
                  {isUnlockedByAdmin && isPastDeadline && (
                    <span className="badge badge-success" style={{ marginLeft: '10px' }}>Unlocked by Staff</span>
                  )}
                  {' | '}Max Points: {task.max_points}
                </p>
              </div>
              <div>
                {!isUnlockedBySequence && (
                  <span className="badge badge-info" style={{ marginBottom: '10px', display: 'inline-block' }}>
                    Locked — complete previous task to unlock
                  </span>
                )}
                {isSubmitted ? (
                  <div>
                    <span className={`badge badge-${submission.status === 'accepted' ? 'success' : submission.status === 'rejected' ? 'danger' : 'warning'}`}>
                      {submission.status}
                    </span>
                    <p style={{ marginTop: '5px', fontSize: '14px' }}>
                      Points: {submission.points_awarded}
                    </p>
                    {submission.feedback && (
                      <p style={{ marginTop: '5px', fontSize: '12px', color: '#6b7280' }}>
                        Feedback: {submission.feedback}
                      </p>
                    )}
                  </div>
                ) : isPastDeadline && !isUnlockedByAdmin && isUnlockedBySequence ? (
                  <button
                    className="btn btn-warning"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowUnlockRequestModal(true);
                    }}
                  >
                    Request Unlock
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowSubmitModal(true);
                    }}
                    disabled={!canSubmit}
                  >
                    {canSubmit ? 'Submit' : 'Locked'}
                  </button>
                )}
              </div>
            </div>
            {isSubmitted && (
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e5e7eb' }}>
                <p><strong>Your Submission:</strong></p>
                <p style={{ marginTop: '5px' }}>{submission.text_response || 'No text response'}</p>
                {submission.file_urls && submission.file_urls.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <strong>Files:</strong>
                    <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                      {submission.file_urls.map((url, idx) => (
                        <li key={idx}>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            File {idx + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>
                  Submitted: {new Date(submission.submitted_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {tasks.length === 0 && (
        <div className="empty-state">
          <h3>No tasks yet</h3>
          <p>Check back later for new tasks</p>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Submit: {selectedTask.title}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Text Response</label>
                <textarea
                  className="input"
                  rows="6"
                  value={textResponse}
                  onChange={(e) => setTextResponse(e.target.value)}
                  placeholder="Enter your response..."
                />
              </div>
              <div className="form-group">
                <label>Files (optional, max 5 files, 10MB each)</label>
                <input
                  type="file"
                  className="input"
                  multiple
                  onChange={handleFileChange}
                  accept="*/*"
                />
                {files.length > 0 && (
                  <p style={{ marginTop: '5px', fontSize: '12px', color: '#6b7280' }}>
                    {files.length} file(s) selected
                  </p>
                )}
              </div>
              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unlock Request Modal */}
      {showUnlockRequestModal && selectedTask && (
        <div className="modal-overlay" onClick={() => {
          setShowUnlockRequestModal(false);
          setUnlockReason('');
          setSelectedTask(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Request Unlock: {selectedTask.title}</h3>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              This task is locked because the deadline has passed. Please provide a reason for requesting unlock.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUnlockRequest();
            }}>
              <div className="form-group">
                <label>Reason for Unlock Request</label>
                <textarea
                  className="input"
                  rows="4"
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="Please explain why you need this task unlocked..."
                  required
                />
              </div>
              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowUnlockRequestModal(false);
                    setUnlockReason('');
                    setSelectedTask(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

