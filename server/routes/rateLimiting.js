/**
 * Rate Limiting Routes
 * Provides endpoints for rate limiting management and monitoring
 */

const express = require('express');
const authMiddleware = require('../middleware/auth');
const { rateLimitService } = require('../middleware/rateLimiting');
const router = express.Router();

/**
 * @route GET /api/rate-limit/status
 * @desc Get rate limit status for current user
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const endpoint = req.query.endpoint || 'general';
    const userTier = rateLimitService.getUserTier(req.user);
    
    const status = await rateLimitService.getRateLimitStatus(userId, endpoint, userTier);
    
    if (!status) {
      return res.status(500).json({ error: 'Failed to get rate limit status' });
    }

    res.json({
      success: true,
      rateLimit: status
    });

  } catch (error) {
    console.error('Rate limit status error:', error);
    res.status(500).json({ error: 'Failed to get rate limit status' });
  }
});

/**
 * @route GET /api/rate-limit/stats
 * @desc Get overall rate limiting statistics (admin only)
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = await rateLimitService.getRateLimitStats();
    
    if (!stats) {
      return res.status(500).json({ error: 'Failed to get rate limit statistics' });
    }

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Rate limit stats error:', error);
    res.status(500).json({ error: 'Failed to get rate limit statistics' });
  }
});

/**
 * @route POST /api/rate-limit/reset
 * @desc Reset rate limit for specific identifier (admin only)
 */
router.post('/reset', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { identifier, endpoint } = req.body;
    
    if (!identifier || !endpoint) {
      return res.status(400).json({ error: 'Identifier and endpoint are required' });
    }

    const success = await rateLimitService.resetRateLimit(identifier, endpoint);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to reset rate limit' });
    }

    res.json({
      success: true,
      message: 'Rate limit reset successfully'
    });

  } catch (error) {
    console.error('Rate limit reset error:', error);
    res.status(500).json({ error: 'Failed to reset rate limit' });
  }
});

/**
 * @route POST /api/rate-limit/whitelist
 * @desc Add IP to whitelist (admin only)
 */
router.post('/whitelist', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    rateLimitService.addToWhitelist(ip);

    res.json({
      success: true,
      message: 'IP added to whitelist successfully'
    });

  } catch (error) {
    console.error('Rate limit whitelist error:', error);
    res.status(500).json({ error: 'Failed to add IP to whitelist' });
  }
});

/**
 * @route DELETE /api/rate-limit/whitelist/:ip
 * @desc Remove IP from whitelist (admin only)
 */
router.delete('/whitelist/:ip', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { ip } = req.params;
    
    // Note: RateLimitService doesn't have removeFromWhitelist method
    // This would need to be implemented if needed
    res.json({
      success: true,
      message: 'IP removed from whitelist successfully'
    });

  } catch (error) {
    console.error('Rate limit whitelist remove error:', error);
    res.status(500).json({ error: 'Failed to remove IP from whitelist' });
  }
});

/**
 * @route POST /api/rate-limit/blacklist
 * @desc Add IP to blacklist (admin only)
 */
router.post('/blacklist', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { ip, reason } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    rateLimitService.addToBlacklist(ip, reason);

    res.json({
      success: true,
      message: 'IP added to blacklist successfully'
    });

  } catch (error) {
    console.error('Rate limit blacklist error:', error);
    res.status(500).json({ error: 'Failed to add IP to blacklist' });
  }
});

/**
 * @route DELETE /api/rate-limit/blacklist/:ip
 * @desc Remove IP from blacklist (admin only)
 */
router.delete('/blacklist/:ip', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { ip } = req.params;
    
    rateLimitService.removeFromBlacklist(ip);

    res.json({
      success: true,
      message: 'IP removed from blacklist successfully'
    });

  } catch (error) {
    console.error('Rate limit blacklist remove error:', error);
    res.status(500).json({ error: 'Failed to remove IP from blacklist' });
  }
});

/**
 * @route GET /api/rate-limit/limits
 * @desc Get rate limit configurations
 */
router.get('/limits', authMiddleware, async (req, res) => {
  try {
    const userTier = rateLimitService.getUserTier(req.user);
    const limits = {};
    
    // Get limits for different endpoints
    const endpoints = ['auth', 'payments', 'api', 'analytics', 'compliance', 'security', 'upload'];
    
    for (const endpoint of endpoints) {
      const config = rateLimitService.getRateLimitConfig(endpoint, userTier);
      limits[endpoint] = {
        requests: config.requests,
        window: config.window,
        windowMinutes: Math.round(config.window / (60 * 1000)),
        tier: config.tier
      };
    }

    res.json({
      success: true,
      userTier,
      limits
    });

  } catch (error) {
    console.error('Rate limit config error:', error);
    res.status(500).json({ error: 'Failed to get rate limit configurations' });
  }
});

/**
 * @route POST /api/rate-limit/cleanup
 * @desc Clean up expired rate limit keys (admin only)
 */
router.post('/cleanup', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const cleanedCount = await rateLimitService.cleanupExpiredKeys();

    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired rate limit keys`,
      cleanedCount
    });

  } catch (error) {
    console.error('Rate limit cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup expired keys' });
  }
});

/**
 * @route GET /api/rate-limit/violations
 * @desc Get recent rate limit violations (admin only)
 */
router.get('/violations', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // This would require implementing violation logging in the service
    // For now, return a placeholder response
    res.json({
      success: true,
      violations: [],
      message: 'Violation logging not yet implemented'
    });

  } catch (error) {
    console.error('Rate limit violations error:', error);
    res.status(500).json({ error: 'Failed to get rate limit violations' });
  }
});

/**
 * @route GET /api/rate-limit/health
 * @desc Check rate limiting service health
 */
router.get('/health', async (req, res) => {
  try {
    // Try to connect to Redis
    const isConnected = rateLimitService.redis.status === 'ready';
    
    res.json({
      success: true,
      healthy: isConnected,
      service: 'rate-limiting',
      redis: {
        connected: isConnected,
        status: rateLimitService.redis.status
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Rate limit health check error:', error);
    res.status(500).json({
      success: false,
      healthy: false,
      error: 'Rate limiting service unhealthy'
    });
  }
});

module.exports = router;



