import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import api from './lib/api';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import AdminCourseDetail from './pages/AdminCourseDetail';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentCourseDetail from './pages/StudentCourseDetail';
import Settings from './pages/Settings';
import Leaderboard from './pages/Leaderboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.access_token) {
        localStorage.setItem('supabase.auth.token', session.access_token);
        // Fetch profile
        try {
          const res = await api.get('/profile');
          setProfile(res.data);
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      // Update token in localStorage for API calls
      if (session?.access_token) {
        localStorage.setItem('supabase.auth.token', session.access_token);
        // Fetch profile
        try {
          const res = await api.get('/profile');
          setProfile(res.data);
        } catch (error) {
          console.error('Error fetching profile:', error);
          setProfile(null);
        }
      } else {
        localStorage.removeItem('supabase.auth.token');
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  const userRole = profile?.role || user?.user_metadata?.role || 'student';
  const isAdmin = ['superadmin', 'admin', 'staff'].includes(userRole);
  const isSuperAdmin = userRole === 'superadmin';

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={isAdmin ? '/admin' : '/student'} /> : <Login />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to={isAdmin ? '/admin' : '/student'} /> : <Signup />}
        />
        <Route
          path="/admin"
          element={
            user ? (
              isSuperAdmin ? (
                <SuperAdminDashboard user={user} profile={profile} />
              ) : isAdmin ? (
                <AdminDashboard user={user} profile={profile} />
              ) : (
                <Navigate to="/student" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/superadmin"
          element={
            user ? (
              isSuperAdmin ? (
                <SuperAdminDashboard user={user} profile={profile} />
              ) : (
                <Navigate to="/admin" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/student"
          element={user ? <StudentDashboard user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/student/courses/:courseId"
          element={user ? <StudentCourseDetail user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/courses/:courseId"
          element={
            user ? (
              isAdmin ? (
                <AdminCourseDetail user={user} profile={profile} />
              ) : (
                <Navigate to="/student" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/settings"
          element={user ? <Settings user={user} profile={profile} /> : <Navigate to="/login" />}
        />
        <Route
          path="/leaderboard"
          element={user ? <Leaderboard user={user} profile={profile} /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={user ? (isSuperAdmin ? '/superadmin' : isAdmin ? '/admin' : '/student') : '/login'} />} />
      </Routes>
    </Router>
  );
}

export default App;

