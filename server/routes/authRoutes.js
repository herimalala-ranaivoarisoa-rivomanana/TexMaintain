const express = require('express');
const UserService = require('../services/userService.js');
const { requireUser } = require('./middleware/auth.js');
const { User } = require('../models/User.js');
const { generateAccessToken, generateRefreshToken } = require('../utils/auth.js');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/login', async (req, res) => {
  const sendError = msg => res.status(400).json({ message: msg });
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return sendError(parse.error.issues?.[0]?.message || 'Invalid request');
  const { email, password } = parse.data;

  console.log(`Login attempt for email: ${email}`);

  if (!email || !password) {
    console.log('Login failed: Missing email or password');
    return sendError('Email and password are required');
  }

  try {
    const user = await UserService.authenticateWithPassword(email, password);

    if (user) {
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshToken = refreshToken;
      await user.save();
      
      console.log(`Login successful for user: ${email}, role: ${user.role}`);
      return res.json({...user.toObject(), accessToken, refreshToken});
    } else {
      console.log(`Login failed for user: ${email} - Invalid credentials`);
      return sendError('Email or password is incorrect');
    }
  } catch (error) {
    console.error(`Login error for user ${email}: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin','maintenance_manager','mechanic','electrician','general_maintenance_agent','dockworker','assistant_maintenance_manager','factory_manager','production_manager','line_manager','foreman','procurement_manager','project_manager']).optional(),
});

router.post('/register', async (req, res, next) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ message: parse.error.issues?.[0]?.message || 'Invalid request' });
  const { email, password, role } = parse.data;
  
  console.log(`Registration attempt for email: ${email}, role: ${role}`);

  if (req.user) {
    return res.json({ user: req.user });
  }
  
  try {
    const user = await UserService.create({ email, password, role });
    console.log(`Registration successful for user: ${email}, role: ${user.role}`);
    return res.status(200).json(user);
  } catch (error) {
    console.error(`Registration error for email ${email}: ${error.message}`);
    return res.status(400).json({ message: error.message });
  }
});

router.post('/logout', requireUser, async (req, res) => {
  const email = req.user?.email;

  console.log(`Logout attempt for authenticated user: ${email}`);

  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = null;
      await user.save();
      console.log(`Logout successful for user: ${email}`);
    }

    res.status(200).json({ message: 'User logged out successfully.' });
  } catch (error) {
    console.error(`Logout error for user ${email}: ${error.message}`);
    res.status(500).json({ message: 'Internal server error during logout' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find the user
    const user = await UserService.get(decoded.sub);

    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.refreshToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update user's refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();

    console.log(`Token refresh successful for user: ${user.email}`);

    // Return new tokens
    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error(`Token refresh error: ${error.message}`);

    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Refresh token has expired'
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

router.get('/me', requireUser, async (req, res) => {
  console.log(`User info request for user: ${req.user.email}, role: ${req.user.role}`);
  return res.status(200).json(req.user);
});

module.exports = router;