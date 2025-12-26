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

    // Handle Factory Context
    const factoryIdHeader = req.headers['x-factory-id'];

    if (factoryIdHeader) {
      // Verify user has access to this factory
      const hasAccess = user.factories.some(f => {
        const fId = f._id ? f._id.toString() : f.toString();
        return fId === factoryIdHeader;
      });

      if (hasAccess) {
        req.activeFactoryId = factoryIdHeader;

        // Optionally update user's activeFactory if different (could be done in a separate endpoint too)
        // For now, we just set it in the request context for filtering
      } else {
        console.warn(`User ${user.email} attempted to access unauthorized factory ${factoryIdHeader}`);
        // We don't fail, we just fallback to default active factory or error out?
        // Let's fallback to user.activeFactory but warn.
        // OR return 403? 
        // Better to return 403 to avoid confusion if frontend sends explicit header.
        return res.status(403).json({ message: 'Forbidden - Access to this factory is not allowed' });
      }
    } else {
      // No header, use user's active factory
      if (user.activeFactory) {
        req.activeFactoryId = user.activeFactory.toString();
      } else if (user.factories && user.factories.length > 0) {
        // Fallback to first factory
        req.activeFactoryId = user.factories[0].toString();
      }
    }

    console.log(`Authentication successful. User: ${user.email}, Factory: ${req.activeFactoryId}`);
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