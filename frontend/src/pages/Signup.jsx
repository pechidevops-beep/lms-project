import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const themeOptions = [
  { id: 'classic', label: 'Classic' },
  { id: 'midnight', label: 'Black & White' },
  { id: 'crimson', label: 'Red & Black' },
];

export default function Signup() {
  const [role, setRole] = useState('student');
  const [theme, setTheme] = useState('classic');
  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('');
  const [badge, setBadge] = useState('');
  const [studentId, setStudentId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let endpoint = '';
      let body = {};

      if (role === 'student') {
        endpoint = `${API_URL}/auth/signup/student`;
        body = {
          email,
          password,
          display_name: displayName,
          dept: department,
          student_id: studentId,
          badge: badge || null
        };
      } else {
        endpoint = `${API_URL}/auth/signup/staff`;
        body = {
          email,
          password,
          display_name: displayName,
          dept: department,
          staff_id: staffId
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      // For students and admins, auto-login
      if (role === 'student') {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (signInData.session?.access_token) {
          localStorage.setItem('supabase.auth.token', signInData.session.access_token);
        }

        // Get profile to determine redirect
        const profileRes = await fetch(`${API_URL}/profile`, {
          headers: {
            'Authorization': `Bearer ${signInData.session.access_token}`
          }
        });
        const profile = await profileRes.json();
        
        navigate('/student');
      } else {
        // Staff signup - show success message, don't auto-login
        setSuccess(data.message || 'Staff signup request submitted. Awaiting approval from SuperAdmin.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-container theme-${theme}`}>
      <div className={`auth-card wide theme-${theme}`}>
        <div className="theme-toggle">
          {themeOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`theme-pill ${theme === opt.id ? 'active' : ''}`}
              onClick={() => setTheme(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <h2>Create Account</h2>
        <p className="auth-subtitle">Select your role and provide the required information.</p>
        <form onSubmit={handleSubmit} className="auth-grid">
          <div className="form-group span-2">
            <label>Registering as</label>
            <div className="role-toggle">
              <button
                type="button"
                className={role === 'student' ? 'role-option active' : 'role-option'}
                onClick={() => {
                  setRole('student');
                  setError('');
                  setSuccess('');
                }}
              >
                Student
              </button>
              <button
                type="button"
                className={role === 'staff' ? 'role-option active' : 'role-option'}
                onClick={() => {
                  setRole('staff');
                  setError('');
                  setSuccess('');
                }}
              >
                Staff
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Your full name"
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
                <label>Student Registration Number</label>
                <input
                  type="text"
                  className="input"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  placeholder="e.g., CS2023001"
                />
              </div>
              <div className="form-group">
                <label>Year Badge (e.g., 2023-2027)</label>
                <input
                  type="text"
                  className="input"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g., 2023-2027"
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
                  placeholder="Your staff identification number"
                />
              </div>
              <div className="form-group span-2">
                <div className="info-box">
                  <p><strong>Note:</strong> Staff accounts require SuperAdmin approval. You'll receive an email once your account is approved.</p>
                </div>
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
              placeholder="your.email@institute.edu"
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
              placeholder="Minimum 6 characters"
            />
          </div>

          {error && (
            <div className="error-message span-2">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message span-2">
              {success}
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

