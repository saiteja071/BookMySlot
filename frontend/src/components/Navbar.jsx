import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import { AuthContext } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="static" className="navbar-appbar">
      <Toolbar className="navbar-toolbar">
        <Link to="/events" className="navbar-logo">
          BookMySlot
        </Link>
        <div className="navbar-links">
          {user ? (
            <>
              <Button component={Link} to="/events" color="inherit" className="nav-btn">
                All Events
              </Button>
              {user.role === 'organizer' && (
                <>
                  <Button component={Link} to="/my-events" color="inherit" className="nav-btn">
                    My Events
                  </Button>
                  <Button component={Link} to="/events/create" color="inherit" className="nav-btn">
                    Create Event
                  </Button>
                </>
              )}
              {user.role === 'user' && (
                <Button component={Link} to="/my-bookings" color="inherit" className="nav-btn">
                  My Bookings
                </Button>
              )}
              <Button component={Link} to="/wallet" color="inherit" className="nav-btn">
                Wallet
              </Button>
              <div className="navbar-user-section">
                <Avatar className="navbar-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <div className="navbar-user-info">
                  <span className="navbar-username">{user.name}</span>
                  <span className="navbar-role">({user.role})</span>
                </div>
                <Button onClick={handleLogout} variant="outlined" color="inherit" size="small" className="logout-btn">
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button component={Link} to="/login" color="inherit" className="nav-btn">
                Login
              </Button>
              <Button component={Link} to="/register" color="inherit" className="nav-btn">
                Register
              </Button>
            </>
          )}
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
