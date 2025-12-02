import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import AdminCourseDetail from './pages/AdminCourseDetail';
import StudentDashboard from './pages/StudentDashboard';
import StudentCourseDetail from './pages/StudentCourseDetail';
import Settings from './pages/Settings';
import Leaderboard from './pages/Leaderboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Update token in localStorage for API calls
      if (session?.access_token) {
        localStorage.setItem('supabase.auth.token', session.access_token);
      } else {
        localStorage.removeItem('supabase.auth.token');
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

  const isAdmin = user?.user_metadata?.is_admin === true;

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
              isAdmin ? (
                <AdminDashboard user={user} />
              ) : (
                <Navigate to="/student" />
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
                <AdminCourseDetail user={user} />
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
          element={user ? <Settings user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/leaderboard"
          element={user ? <Leaderboard user={user} /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={user ? (isAdmin ? '/admin' : '/student') : '/login'} />} />
      </Routes>
    </Router>
  );
}

export default App;

