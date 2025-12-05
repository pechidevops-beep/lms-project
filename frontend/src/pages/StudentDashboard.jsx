import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../lib/api';
import Layout from '../components/Layout';

// Pending Request Badge Component
const PendingBadge = () => (
  <span className="pending-badge">
    <span className="spinner"></span>
    Pending
  </span>
);

export default function StudentDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [pendingRequests, setPendingRequests] = useState({});
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setApiError(null);
      
      // Get all available courses
      const coursesRes = await api.get('/courses/available');
      
      // Get user's enrollments
      const enrollmentsRes = await api.get('/enrollments/me');
      
      setCourses(coursesRes.data);
      
      // Create a map of courseId to enrollment status
      const requestsMap = {};
      enrollmentsRes.data.forEach(enrollment => {
        if (enrollment.status === 'pending') {
          requestsMap[enrollment.course_id] = 'pending';
        } else if (enrollment.status === 'approved') {
          requestsMap[enrollment.course_id] = 'approved';
        }
      });
      setPendingRequests(requestsMap);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRequestJoin = async (courseId) => {
    try {
      setIsSubmitting(true);
      setApiError(null);
      
      await api.post(`/enrollments/${courseId}/enroll`);
      
      setPendingRequests(prev => ({
        ...prev,
        [courseId]: 'pending'
      }));
      
      toast.success('Join request sent successfully');
    } catch (error) {
      console.error('Error requesting to join course:', error);
      toast.error(error.response?.data?.error || 'Failed to send join request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinCourse = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    try {
      setIsSubmitting(true);
      const response = await api.post('/courses/join', { code: joinCode });
      toast.success('Joined course successfully!');
      setJoinCode('');
      setShowJoinModal(false);
      await loadData();
    } catch (error) {
      console.error('Error joining course:', error);
      toast.error(error.response?.data?.error || 'Failed to join course');
    } finally {
      setIsSubmitting(false);
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
          <p className="text-muted">Browse joined repositories and stay on top of your tasks.</p>
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
                {pendingRequests[course.id] === 'pending' && <PendingBadge />}
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
                    {pendingRequests[course.id] === 'pending' ? (
                      <button 
                        className="btn btn-outline-secondary w-100" 
                        disabled
                      >
                        Request Pending
                      </button>
                    ) : course.isEnrolled ? (
                      <Link
                        to={`/student/courses/${course.id}`}
                        className="btn btn-primary w-100"
                      >
                        View Course
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleRequestJoin(course.id)}
                        className="btn btn-outline-primary w-100"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Processing...' : 'Request to Join'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-12">
            <div className="empty-state">
              <h3>No courses available</h3>
              <p>Join a course using the button above or wait to be enrolled by an administrator.</p>
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
                  disabled={isSubmitting}
                />
                <div className="form-text">The code is usually a combination of the course code and term.</div>
              </div>
              
              <div className="d-flex justify-content-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowJoinModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting || !joinCode.trim()}
                >
                  {isSubmitting ? (
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

