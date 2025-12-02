import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Layout({ user, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.user_metadata?.is_admin === true;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <h1>LMS</h1>
          <nav>
            <Link to={isAdmin ? '/admin' : '/student'} className={location.pathname.includes('dashboard') || location.pathname === '/admin' || location.pathname === '/student' ? 'active' : ''}>
              Dashboard
            </Link>
            <Link to="/leaderboard" className={location.pathname === '/leaderboard' ? 'active' : ''}>
              Leaderboard
            </Link>
            <Link to="/settings" className={location.pathname === '/settings' ? 'active' : ''}>
              Settings
            </Link>
            <button className="btn btn-secondary" onClick={handleLogout} style={{ marginLeft: '10px' }}>
              Logout
            </button>
          </nav>
        </div>
      </header>
      <div className="container">
        {children}
      </div>
    </div>
  );
}

