import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../lib/api';
import Layout from '../components/Layout';

export default function StudentDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setApiError(null);

      // Students see only courses they are already enrolled in
      const response = await api.get('/courses');
      setCourses(response.data || []);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to load courses';
      setApiError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCourse = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    try {
      setIsJoiningByCode(true);
      await api.post('/courses/join', { code: joinCode });
      toast.success('Joined course successfully!');
      setJoinCode('');
      setShowJoinModal(false);
      await loadData();
    } catch (error) {
      const backendMessage = error.response?.data?.error;

      if (backendMessage === 'Already enrolled') {
        toast.info('You are already enrolled in this course.');
        await loadData();
      } else {
        const message = backendMessage || 'Failed to join course';
        toast.error(message);
      }
    } finally {
      setIsJoiningByCode(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user}>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="flex-between mb-20">
        <div>
          <h2>My Courses</h2>
          <p className="text-muted">Browse your joined courses and stay on top of your tasks.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowJoinModal(true)}>
          + Join Course
        </button>
      </div>

      {apiError && (
        <div className="alert alert-danger shadow-sm">
          {apiError}
        </div>
      )}

      <div className="row g-4">
        {courses.length > 0 ? (
          courses.map(course => (
            <div key={course.id} className="col-12 col-md-6 col-xl-4">
              <div className="course-card card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="card-title mb-0">{course.title}</h5>
                    <span className="badge bg-primary">{course.code}</span>
                  </div>
                  
                  {course.description && (
                    <p className="card-text">
                      {course.description.length > 120 
                        ? `${course.description.substring(0, 120)}...` 
                        : course.description}
                    </p>
                  )}
                  
                  <div className="mt-auto pt-3">
                    <Link
                      to={`/student/courses/${course.id}`}
                      className="btn btn-primary w-100"
                    >
                      View Course
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-12">
            <div className="empty-state">
              <h3>No courses joined yet</h3>
              <p>Use the button above to join a course using its code.</p>
              <button 
                onClick={() => setShowJoinModal(true)}
                className="btn btn-primary"
              >
                Join a Course
              </button>
            </div>
          </div>
        )}
      </div>

      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="mb-0">Join a Course</h3>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowJoinModal(false)}
                aria-label="Close"
              ></button>
            </div>
            
            <p className="text-muted mb-4">
              Enter the course code provided by your instructor to join the course.
              Your request will be reviewed by the course administrator.
            </p>
            
            <form onSubmit={handleJoinCourse}>
              <div className="mb-4">
                <label htmlFor="joinCode" className="form-label">Course Code</label>
                <input
                  id="joinCode"
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="e.g., CS101-FALL2023"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  required
                  disabled={isJoiningByCode}
                />
                <div className="form-text">The code is usually a combination of the course code and term.</div>
              </div>
              
              <div className="d-flex justify-content-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowJoinModal(false)}
                  disabled={isJoiningByCode}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isJoiningByCode || !joinCode.trim()}
                >
                  {isJoiningByCode ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Joining...
                    </>
                  ) : 'Join Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

