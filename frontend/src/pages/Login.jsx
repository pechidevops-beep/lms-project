import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import './Auth.css';

const themeOptions = [
  { id: 'classic', label: 'Classic' },
  { id: 'midnight', label: 'Black & White' },
  { id: 'crimson', label: 'Red & Black' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [theme, setTheme] = useState('classic');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.session?.access_token) {
        localStorage.setItem('supabase.auth.token', data.session.access_token);
      }

      // Log the login to database
      try {
        await api.post('/auth/log-login');
      } catch (logError) {
        console.warn('Failed to log login:', logError);
        // Don't block login if logging fails
      }

      const profileRes = await api.get('/profile');
      const profile = profileRes.data;

      if (profile.role === 'superadmin') {
        navigate('/superadmin');
      } else if (['admin', 'staff'].includes(profile.role)) {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetMessage('Please enter your email to reset your password.');
      return;
    }

    try {
      setResetMessage('Sending reset instructions...');
      await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
      setResetMessage('Password reset email sent! Check your inbox.');
    } catch (error) {
      setResetMessage(error.message || 'Failed to send reset email.');
    }
  };

  return (
    <div className={`auth-container theme-${theme}`}>
      <div className={`auth-card theme-${theme}`}>
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
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Admins can login using the default credentials shared by the SuperAdmin.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
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
            />
          </div>
          <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <small className="text-muted">Students & staff use their registered credentials.</small>
            <button
              type="button"
              className="btn btn-link"
              style={{ padding: 0, fontSize: '13px', textDecoration: 'underline' }}
              onClick={() => setShowForgotModal(true)}
            >
              Forgot password?
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-link">
          Don't have an account? <a href="/signup">Sign up</a>
        </p>
      </div>

      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reset Password</h3>
            <p style={{ color: '#6b7280', marginBottom: '10px' }}>
              Enter your registered email to receive password reset instructions.
            </p>
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="input"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              {resetMessage && (
                <div className="info-box" style={{ marginBottom: '10px' }}>
                  <p>{resetMessage}</p>
                </div>
              )}
              <div className="flex" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForgotModal(false)}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary">
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
