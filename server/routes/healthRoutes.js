const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * Health Check Endpoint
 * GET /api/health
 * Returns the health status of the application and its dependencies
 */
router.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: 'unknown',
      memory: 'unknown'
    }
  };

  try {
    // Check database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      health.checks.database = 'OK';
    } else {
      health.checks.database = 'DISCONNECTED';
      health.status = 'DEGRADED';
    }
  } catch (err) {
    health.checks.database = 'ERROR';
    health.status = 'DEGRADED';
    health.checks.databaseError = err.message;
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };

  health.checks.memory = memUsageMB;

  // Warn if heap usage is over 80%
  if (memUsageMB.heapUsed / memUsageMB.heapTotal > 0.8) {
    health.status = 'DEGRADED';
    health.checks.memoryWarning = 'High memory usage detected';
  }

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Readiness Check
 * GET /api/ready
 * Returns 200 if the application is ready to serve requests
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        ready: false, 
        reason: 'Database not connected' 
      });
    }

    // Ping database
    await mongoose.connection.db.admin().ping();

    res.status(200).json({ 
      ready: true,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(503).json({ 
      ready: false, 
      reason: err.message 
    });
  }
});

/**
 * Liveness Check
 * GET /api/live
 * Returns 200 if the application is alive (for Kubernetes liveness probes)
 */
router.get('/live', (req, res) => {
  res.status(200).json({ 
    alive: true,
    timestamp: Date.now()
  });
});

module.exports = router;
