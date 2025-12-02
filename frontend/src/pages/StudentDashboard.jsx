import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';

export default function StudentDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinStatus, setJoinStatus] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const res = await api.get('/courses');
      setCourses(res.data);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCourse = async (e) => {
    e.preventDefault();
    try {
      await api.post('/courses/join', { code: joinCode.trim().toUpperCase() });
      setJoinStatus({ type: 'success', message: 'Joined course successfully!' });
      setJoinCode('');
      setShowJoinModal(false);
      loadCourses();
    } catch (error) {
      setJoinStatus({
        type: 'error',
        message: error.response?.data?.error || 'Failed to join course'
      });
    }
  };

  if (loading) {
    return <Layout user={user}><div>Loading...</div></Layout>;
  }

  return (
    <Layout user={user}>
      <div className="flex-between mb-20">
        <div>
          <h2>My Courses</h2>
          <p className="text-muted">Browse joined repositories and stay on top of your tasks.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowJoinModal(true)}>
          + Join Course
        </button>
      </div>

      {joinStatus && (
        <div className={`alert ${joinStatus.type === 'success' ? 'alert-success' : 'alert-danger'} shadow-sm`}>
          {joinStatus.message}
        </div>
      )}

      <div className="row g-4">
        {courses.map(course => (
          <div key={course.id} className="col-12 col-md-6 col-xl-4">
            <div className="card shadow-sm neon-card h-100">
              <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">{course.title}</h5>
                  <span className="badge bg-dark-subtle text-dark-emphasis">{course.code}</span>
                </div>
                {course.description && (
                  <p className="card-text text-muted mt-3 flex-grow-1">{course.description}</p>
                )}
                <Link
                  to={`/student/courses/${course.id}`}
                  className="btn btn-primary mt-3 w-100"
                >
                  View Tasks
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="empty-state">
          <h3>No courses enrolled</h3>
          <p>Join a course using a course code</p>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Join Course</h3>
            <form onSubmit={handleJoinCourse}>
              <div className="form-group">
                <label>Course Code</label>
                <input
                  type="text"
                  className="input"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter course code"
                  required
                />
              </div>
              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowJoinModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

