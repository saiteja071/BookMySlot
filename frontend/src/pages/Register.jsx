import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import { AuthContext } from '../context/AuthContext';
import '../styles/Register.css';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !email.trim() || !password.trim() || !role) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    const res = await register(name.trim(), email.trim(), password, role);
    setSubmitting(false);

    if (res.success) {
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>Create Account</h2>
        <p className="register-subtitle">Sign up for BookMySlot</p>

        {error && <Alert severity="error" className="auth-alert">{error}</Alert>}
        {success && <Alert severity="success" className="auth-alert">{success}</Alert>}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <TextField
              label="Full Name"
              variant="outlined"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <TextField
              label="Email Address"
              type="email"
              variant="outlined"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group select-group">
            <label className="select-label">Select Role *</label>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              fullWidth
              disabled={submitting}
            >
              <MenuItem value="user">User (Browse & Book)</MenuItem>
              <MenuItem value="organizer">Organizer (Manage Events)</MenuItem>
            </Select>
          </div>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={submitting}
            className="register-btn"
          >
            {submitting ? 'Registering...' : 'Register'}
          </Button>
        </form>

        <p className="auth-link-text">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
