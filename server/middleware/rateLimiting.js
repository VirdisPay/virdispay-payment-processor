/**
 * Rate Limiting Middleware
 * Applies rate limiting to different types of endpoints
 */

const RateLimitService = require('../services/rateLimitService');

// Initialize rate limit service
const rateLimitService = new RateLimitService();

/**
 * Authentication rate limiting
 */
const authRateLimit = rateLimitService.createRateLimitMiddleware('auth', {
  useUserId: false // Use IP for auth endpoints
});

/**
 * Login specific rate limiting
 */
const loginRateLimit = rateLimitService.createRateLimitMiddleware('auth', {
  useUserId: false
});

/**
 * Registration rate limiting
 */
const registerRateLimit = rateLimitService.createRateLimitMiddleware('auth', {
  useUserId: false
});

/**
 * Password reset rate limiting
 */
const passwordResetRateLimit = rateLimitService.createRateLimitMiddleware('auth', {
  useUserId: false
});

/**
 * 2FA rate limiting
 */
const twoFARateLimit = rateLimitService.createRateLimitMiddleware('auth', {
  useUserId: true // Use user ID for 2FA
});

/**
 * Payment creation rate limiting
 */
const paymentCreateRateLimit = rateLimitService.createRateLimitMiddleware('payments', {
  useUserId: true
});

/**
 * Payment processing rate limiting
 */
const paymentProcessRateLimit = rateLimitService.createRateLimitMiddleware('payments', {
  useUserId: true
});

/**
 * Payment status rate limiting
 */
const paymentStatusRateLimit = rateLimitService.createRateLimitMiddleware('payments', {
  useUserId: true
});

/**
 * Webhook rate limiting
 */
const webhookRateLimit = rateLimitService.createRateLimitMiddleware('payments', {
  useUserId: false // Use IP for webhooks
});

/**
 * General API rate limiting
 */
const apiRateLimit = rateLimitService.createRateLimitMiddleware('api', {
  useUserId: true
});

/**
 * Analytics rate limiting
 */
const analyticsRateLimit = rateLimitService.createRateLimitMiddleware('analytics', {
  useUserId: true
});

/**
 * Compliance rate limiting
 */
const complianceRateLimit = rateLimitService.createRateLimitMiddleware('compliance', {
  useUserId: true
});

/**
 * Security rate limiting
 */
const securityRateLimit = rateLimitService.createRateLimitMiddleware('security', {
  useUserId: true
});

/**
 * Document upload rate limiting
 */
const documentUploadRateLimit = rateLimitService.createRateLimitMiddleware('upload', {
  useUserId: true
});

/**
 * Image upload rate limiting
 */
const imageUploadRateLimit = rateLimitService.createRateLimitMiddleware('upload', {
  useUserId: true
});

/**
 * Custom rate limiting middleware
 */
const createCustomRateLimit = (endpoint, options = {}) => {
  return rateLimitService.createRateLimitMiddleware(endpoint, options);
};

/**
 * Rate limit status middleware
 */
const rateLimitStatus = async (req, res, next) => {
  try {
    const identifier = req.user ? req.user.id : req.ip;
    const endpoint = req.route?.path || 'general';
    const userTier = rateLimitService.getUserTier(req.user);
    
    const status = await rateLimitService.getRateLimitStatus(identifier, endpoint, userTier);
    
    if (status) {
      res.json({
        success: true,
        rateLimit: status
      });
    } else {
      res.status(500).json({
        error: 'Failed to get rate limit status'
      });
    }
  } catch (error) {
    console.error('Rate limit status error:', error);
    res.status(500).json({
      error: 'Failed to get rate limit status'
    });
  }
};

/**
 * Rate limit info middleware - adds rate limit info to response
 */
const rateLimitInfo = (req, res, next) => {
  // Rate limit info is already set by the rate limiting middleware
  // This middleware just ensures it's available
  next();
};

/**
 * Emergency rate limit bypass for critical operations
 */
const emergencyBypass = (req, res, next) => {
  // Check for emergency bypass header
  const emergencyKey = req.headers['x-emergency-bypass'];
  
  if (emergencyKey === process.env.EMERGENCY_BYPASS_KEY) {
    // Add bypass info to request
    req.rateLimit = {
      allowed: true,
      remaining: Infinity,
      bypass: true
    };
  }
  
  next();
};

/**
 * Rate limit monitoring middleware
 */
const rateLimitMonitor = (req, res, next) => {
  // Log rate limit usage
  if (req.rateLimit) {
    console.log(`Rate limit: ${req.ip} - ${req.route?.path} - ${req.rateLimit.remaining} remaining`);
    
    // Emit monitoring event
    rateLimitService.emit('rate_limit_usage', {
      ip: req.ip,
      userId: req.user?.id,
      endpoint: req.route?.path,
      remaining: req.rateLimit.remaining,
      tier: req.rateLimit.tier,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Rate limit violation handler
 */
const rateLimitViolationHandler = (err, req, res, next) => {
  if (err.status === 429) {
    // Log violation
    console.warn(`Rate limit violation: ${req.ip} - ${req.route?.path}`);
    
    // Emit violation event
    rateLimitService.emit('rate_limit_violation_handled', {
      ip: req.ip,
      userId: req.user?.id,
      endpoint: req.route?.path,
      timestamp: new Date().toISOString()
    });
  }
  
  next(err);
};

module.exports = {
  // Rate limiting middleware
  authRateLimit,
  loginRateLimit,
  registerRateLimit,
  passwordResetRateLimit,
  twoFARateLimit,
  paymentCreateRateLimit,
  paymentProcessRateLimit,
  paymentStatusRateLimit,
  webhookRateLimit,
  apiRateLimit,
  analyticsRateLimit,
  complianceRateLimit,
  securityRateLimit,
  documentUploadRateLimit,
  imageUploadRateLimit,
  
  // Utility functions
  createCustomRateLimit,
  rateLimitStatus,
  rateLimitInfo,
  emergencyBypass,
  rateLimitMonitor,
  rateLimitViolationHandler,
  
  // Service instance
  rateLimitService
};



