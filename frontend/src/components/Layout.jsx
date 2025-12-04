import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Layout({ user, profile, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get role from profile first, then fallback to user metadata
  const userRole = profile?.role || user?.user_metadata?.role || 'student';
  const isAdmin = ['superadmin', 'admin', 'staff'].includes(userRole);
  const isSuperAdmin = userRole === 'superadmin';
  
  // Determine dashboard route based on role
  const dashboardRoute = isSuperAdmin ? '/superadmin' : isAdmin ? '/admin' : '/student';

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
            <Link 
              to={dashboardRoute} 
              className={location.pathname === '/admin' || location.pathname === '/superadmin' || location.pathname === '/student' ? 'active' : ''}
            >
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

