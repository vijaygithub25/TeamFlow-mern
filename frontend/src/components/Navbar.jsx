import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="url(#paint0_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="url(#paint1_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="url(#paint2_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <defs>
            <linearGradient id="paint0_linear" x1="2" y1="2" x2="22" y2="12" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1"/>
              <stop offset="1" stopColor="#a855f7"/>
            </linearGradient>
            <linearGradient id="paint1_linear" x1="2" y1="17" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1"/>
              <stop offset="1" stopColor="#a855f7"/>
            </linearGradient>
            <linearGradient id="paint2_linear" x1="2" y1="12" x2="22" y2="17" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1"/>
              <stop offset="1" stopColor="#a855f7"/>
            </linearGradient>
          </defs>
        </svg>
        TeamFlow
      </Link>
      <div className="nav-links">
        {user ? (
          <>
            <span className="nav-link" style={{ cursor: 'default' }}>
              Welcome, {user.name} ({user.role})
            </span>
            <button onClick={handleLogout} className="btn btn-danger btn-sm">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm" style={{ width: 'auto' }}>Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
