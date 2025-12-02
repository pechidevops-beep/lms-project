import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Signup() {
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [studentId, setStudentId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [adminAccessKey, setAdminAccessKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          name,
          department,
          year: role === 'student' ? year : null,
          studentId: role === 'student' ? studentId : null,
          staffId: role === 'admin' ? staffId : null,
          adminAccessKey: role === 'admin' ? adminAccessKey : null,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (signInData.session?.access_token) {
        localStorage.setItem('supabase.auth.token', signInData.session.access_token);
      }

      const isAdmin = signInData.user?.user_metadata?.is_admin;
      navigate(isAdmin ? '/admin' : '/student');
    } catch (err) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card wide">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Tell us who you are so we can prepare the right workspace.</p>
        <form onSubmit={handleSubmit} className="auth-grid">
          <div className="form-group span-2">
            <label>Registering as</label>
            <div className="role-toggle">
              <button
                type="button"
                className={role === 'student' ? 'role-option active' : 'role-option'}
                onClick={() => setRole('student')}
              >
                Student
              </button>
              <button
                type="button"
                className={role === 'admin' ? 'role-option active' : 'role-option'}
                onClick={() => setRole('admin')}
              >
                Admin / Staff
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Department</label>
            <input
              type="text"
              className="input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., Computer Science"
            />
          </div>

          {role === 'student' ? (
            <>
              <div className="form-group">
                <label>Student ID</label>
                <input
                  type="text"
                  className="input"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Year</label>
                <input
                  type="text"
                  className="input"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g., 3rd Year"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Staff ID</label>
                <input
                  type="text"
                  className="input"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Department Year/Batch</label>
              <div className="form-group span-2">
                <label>Admin Access Key</label>
                <input
                  type="password"
                  className="input"
                  value={adminAccessKey}
                  onChange={(e) => setAdminAccessKey(e.target.value)}
                  placeholder="Enter the shared admin password"
                  required
                />
              </div>
                <input
                  type="text"
                  className="input"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Institute Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="error-message span-2">
              {error}
            </div>
          )}

          <div className="span-2">
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <p className="auth-link">
          Already registered? <a href="/login">Go to Login</a>
        </p>
      </div>
    </div>
  );
}

