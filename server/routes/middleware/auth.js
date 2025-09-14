const UserService = require('../../services/userService.js');
const jwt = require('jsonwebtoken');

const requireUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    console.log('Authentication failed: No token provided');
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserService.get(decoded.sub);
    
    if (!user) {
      console.log(`Authentication failed: User not found for token`);
      return res.status(401).json({ message: 'Unauthorized - User not found' });
    }
    
    if (!user.isActive) {
      console.log(`Authentication failed: User account is inactive for ${user.email}`);
      return res.status(401).json({ message: 'Unauthorized - Account is inactive' });
    }
    
    req.user = user;
    console.log(`Authentication successful for user: ${user.email}, role: ${user.role}`);
    next();
  } catch (err) {
    console.error(`Authentication error: ${err.message}`);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Unauthorized - Token expired' });
    }
    return res.status(401).json({ message: 'Unauthorized - Invalid token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.log('Role check failed: No user in request');
      return res.status(401).json({ message: 'Unauthorized - No user found' });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!userRoles.includes(req.user.role)) {
      console.log(`Role check failed: User ${req.user.email} has role ${req.user.role}, required: ${userRoles.join(', ')}`);
      return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
    }

    console.log(`Role check passed for user: ${req.user.email}, role: ${req.user.role}`);
    next();
  };
};

module.exports = {
  requireUser,
  requireRole,
};