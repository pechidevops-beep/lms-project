import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import Layout from '../components/Layout';

export default function Settings({ user, profile }) {
  const [name, setName] = useState(user?.user_metadata?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [timezone, setTimezone] = useState(user?.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [notifications, setNotifications] = useState(user?.user_metadata?.notifications ?? true);
  const [profileUrl, setProfileUrl] = useState(user?.user_metadata?.profile_url || '');
  const [theme, setTheme] = useState(user?.user_metadata?.theme || 'light');
  const [language, setLanguage] = useState(user?.user_metadata?.language || 'en');
  const [dateFormat, setDateFormat] = useState(user?.user_metadata?.date_format || 'MM/DD/YYYY');
  const [emailNotifications, setEmailNotifications] = useState(user?.user_metadata?.email_notifications ?? true);
  const [autoSave, setAutoSave] = useState(user?.user_metadata?.auto_save ?? true);
  const [compactMode, setCompactMode] = useState(user?.user_metadata?.compact_mode ?? false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load profile settings
    const loadProfile = async () => {
      try {
        const res = await api.get('/profile');
        const profile = res.data;
        if (profile) {
          setName(profile.display_name || '');
          setEmail(profile.email || '');
          setTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
          setNotifications(profile.notifications ?? true);
          setProfileUrl(profile.profile_url || '');
          setTheme(profile.theme || 'light');
          setLanguage(profile.language || 'en');
          setDateFormat(profile.date_format || 'MM/DD/YYYY');
          setEmailNotifications(profile.email_notifications ?? true);
          setAutoSave(profile.auto_save ?? true);
          setCompactMode(profile.compact_mode ?? false);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await api.put('/profile', {
        display_name: name,
        email,
        timezone,
        notifications,
        profile_url: profileUrl,
        theme,
        language,
        date_format: dateFormat,
        email_notifications: emailNotifications,
        auto_save: autoSave,
        compact_mode: compactMode
      });
      setMessage('Settings updated successfully');
      // Apply theme immediately
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout user={user} profile={profile}>
      <h2>Settings</h2>
      
      {message && (
        <div className={message.includes('success') ? 'success-message' : 'error-message'} style={{ marginBottom: '20px' }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Profile Section */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>Profile Information</h3>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
            />
          </div>
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
            <label>Profile Image URL</label>
            <input
              type="url"
              className="input"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
        </div>

        {/* Preferences Section */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>Preferences</h3>
          <div className="form-group">
            <label>Theme</label>
            <select className="input" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Language</label>
            <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
          <div className="form-group">
            <label>Date Format</label>
            <select className="input" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD MMM YYYY">DD MMM YYYY</option>
            </select>
          </div>
          <div className="form-group">
            <label>Timezone</label>
            <input
              type="text"
              className="input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g., America/New_York"
            />
            <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Current: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </small>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>Notifications</h3>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <span>Enable in-app notifications</span>
            </label>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <span>Enable email notifications</span>
            </label>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>Advanced</h3>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <span>Auto-save drafts</span>
            </label>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <span>Compact mode (show more content)</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save All Changes'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setName(user?.user_metadata?.name || '');
              setEmail(user?.email || '');
              setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
              setNotifications(true);
              setProfileUrl('');
              setTheme('light');
              setLanguage('en');
              setDateFormat('MM/DD/YYYY');
              setEmailNotifications(true);
              setAutoSave(true);
              setCompactMode(false);
            }}
          >
            Reset to Defaults
          </button>
        </div>
      </form>
    </Layout>
  );
}

