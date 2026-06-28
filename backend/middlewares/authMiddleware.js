const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
require('dotenv').config();

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization header provided' });
  }

  
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7).trim() 
    : authHeader.trim();

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bookmyslotsecrettokenjwt12345');
    
    
    const pool = getPool();
    const [users] = await pool.query('SELECT id, email, role FROM users WHERE id = ?', [decoded.id]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'User account no longer exists' });
    }

    req.user = {
      id: users[0].id,
      email: users[0].email,
      role: users[0].role
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const isOrganizer = (req, res, next) => {
  if (!req.user || req.user.role !== 'organizer') {
    return res.status(403).json({ message: 'Access denied: organizers only' });
  }
  next();
};

module.exports = {
  authMiddleware,
  isOrganizer
};
