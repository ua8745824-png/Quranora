const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../db/database');

/**
 * Sign JWT Token
 */
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

/**
 * Authenticate JWT middleware
 */
function authenticate(req, res, next) {
  let token = null;

  // Check Authorization Header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.quranora_token) {
    token = req.cookies.quranora_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided. Please log in.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // Fetch fresh user record from database
    const user = db.get('SELECT id, email, role, status, avatar FROM users WHERE id = ?', [decoded.id]);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. User not found in system.'
      });
    }

    if (user.status === 'PENDING') {
      return res.status(403).json({
        success: false,
        status: 'PENDING',
        message: 'Your registration is currently pending admin approval. You will receive an email once approved.'
      });
    }

    if (user.status === 'SUSPENDED' || user.status === 'REJECTED') {
      return res.status(403).json({
        success: false,
        status: user.status,
        message: `Account is ${user.status.toLowerCase()}. Please contact Quranora Academy administration.`
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Token is expired or invalid.'
    });
  }
}

/**
 * Role-Based Access Control Guard
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access.'
      });
    }

    const userRole = req.user.role;
    // Allow superadmin access across admin roles
    const isAllowed = allowedRoles.includes(userRole) || 
      (userRole === 'superadmin' && allowedRoles.includes('admin'));

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. You do not have permissions for role: [${allowedRoles.join(', ')}].`
      });
    }

    next();
  };
}

module.exports = {
  signToken,
  authenticate,
  requireRoles
};
