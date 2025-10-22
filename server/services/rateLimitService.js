/**
 * Rate Limiting Service
 * Provides comprehensive rate limiting for API endpoints with Redis backing
 */

const Redis = require('ioredis');
const EventEmitter = require('events');

class RateLimitService extends EventEmitter {
  constructor() {
    super();
    
    // Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Fallback storage
    this.redisAvailable = false;
    this.memoryStore = new Map();
    
    // Initialize tracking maps
    this.failedAttempts = new Map();
    this.suspiciousActivity = new Map();
    this.deviceRegistry = new Map();
    
    // Security thresholds
    this.maxFailedAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.suspiciousThreshold = 3;

    // Rate limit configurations
    this.limits = {
      // Authentication endpoints
      auth: {
        login: { requests: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
        register: { requests: 3, window: 60 * 60 * 1000 }, // 3 registrations per hour
        passwordReset: { requests: 3, window: 60 * 60 * 1000 }, // 3 resets per hour
        twoFA: { requests: 10, window: 5 * 60 * 1000 }, // 10 2FA attempts per 5 minutes
      },
      
      // Payment endpoints
      payments: {
        create: { requests: 100, window: 60 * 1000 }, // 100 payments per minute
        process: { requests: 50, window: 60 * 1000 }, // 50 processed per minute
        status: { requests: 200, window: 60 * 1000 }, // 200 status checks per minute
        webhook: { requests: 1000, window: 60 * 1000 }, // 1000 webhooks per minute
      },
      
      // API endpoints
      api: {
        general: { requests: 1000, window: 60 * 1000 }, // 1000 requests per minute
        analytics: { requests: 100, window: 60 * 1000 }, // 100 analytics requests per minute
        compliance: { requests: 50, window: 60 * 1000 }, // 50 compliance requests per minute
        security: { requests: 200, window: 60 * 1000 }, // 200 security requests per minute
      },
      
      // Upload endpoints
      upload: {
        documents: { requests: 10, window: 60 * 1000 }, // 10 document uploads per minute
        images: { requests: 20, window: 60 * 1000 }, // 20 image uploads per minute
      }
    };

    // User tier configurations
    this.userTiers = {
      free: {
        multiplier: 1.0,
        maxRequestsPerMinute: 100,
        maxRequestsPerHour: 1000,
        maxRequestsPerDay: 10000
      },
      premium: {
        multiplier: 2.0,
        maxRequestsPerMinute: 200,
        maxRequestsPerHour: 2000,
        maxRequestsPerDay: 20000
      },
      enterprise: {
        multiplier: 5.0,
        maxRequestsPerMinute: 500,
        maxRequestsPerHour: 5000,
        maxRequestsPerDay: 50000
      },
      admin: {
        multiplier: 10.0,
        maxRequestsPerMinute: 1000,
        maxRequestsPerHour: 10000,
        maxRequestsPerDay: 100000
      }
    };

    // Whitelisted IPs (for internal services)
    this.whitelistedIPs = new Set([
      '127.0.0.1',
      '::1',
      '::ffff:127.0.0.1'
    ]);

    // Blacklisted IPs (for blocked IPs)
    this.blacklistedIPs = new Set();

    // Initialize Redis connection
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      await this.redis.connect();
      console.log('Rate limiting service connected to Redis');
      this.redisAvailable = true;
      
      // Set up error handling
      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error);
        this.redisAvailable = false;
        this.emit('redis_error', error);
      });

      this.redis.on('connect', () => {
        console.log('Redis connection restored');
        this.redisAvailable = true;
        this.emit('redis_connected');
      });

    } catch (error) {
      console.error('Failed to connect to Redis, using in-memory fallback:', error);
      this.redisAvailable = false;
      this.memoryStore = new Map(); // Fallback to in-memory storage
      this.emit('redis_error', error);
    }
  }

  /**
   * Check if IP is whitelisted
   */
  isWhitelistedIP(ip) {
    return this.whitelistedIPs.has(ip) || this.whitelistedIPs.has(this.normalizeIP(ip));
  }

  /**
   * Check if IP is blacklisted
   */
  isBlacklistedIP(ip) {
    return this.blacklistedIPs.has(ip) || this.blacklistedIPs.has(this.normalizeIP(ip));
  }

  /**
   * Normalize IP address (handle IPv4-mapped IPv6 addresses)
   */
  normalizeIP(ip) {
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    return ip;
  }

  /**
   * Add IP to whitelist
   */
  addToWhitelist(ip) {
    const normalizedIP = this.normalizeIP(ip);
    this.whitelistedIPs.add(normalizedIP);
    this.emit('ip_whitelisted', normalizedIP);
  }

  /**
   * Add IP to blacklist
   */
  addToBlacklist(ip, reason = 'Rate limit exceeded') {
    const normalizedIP = this.normalizeIP(ip);
    this.blacklistedIPs.add(normalizedIP);
    this.emit('ip_blacklisted', { ip: normalizedIP, reason });
  }

  /**
   * Remove IP from blacklist
   */
  removeFromBlacklist(ip) {
    const normalizedIP = this.normalizeIP(ip);
    this.blacklistedIPs.delete(normalizedIP);
    this.emit('ip_unblacklisted', normalizedIP);
  }

  /**
   * Get rate limit configuration for endpoint
   */
  getRateLimitConfig(endpoint, userTier = 'free') {
    // Get the appropriate limit configuration
    let config;
    if (this.limits[endpoint]) {
      // If it's a nested structure, use the first available sub-endpoint
      const subEndpoints = Object.keys(this.limits[endpoint]);
      config = this.limits[endpoint][subEndpoints[0]] || this.limits.api.general;
    } else {
      config = this.limits.api.general;
    }
    
    const tierConfig = this.userTiers[userTier] || this.userTiers.free;
    
    return {
      requests: Math.floor(config.requests * tierConfig.multiplier),
      window: config.window,
      tier: userTier
    };
  }

  /**
   * Generate rate limit key
   */
  generateKey(identifier, endpoint, window) {
    const windowKey = Math.floor(Date.now() / window);
    return `rate_limit:${endpoint}:${identifier}:${windowKey}`;
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(identifier, endpoint, userTier = 'free') {
    try {
      // Check if IP is blacklisted
      if (this.isBlacklistedIP(identifier)) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 60 * 60 * 1000, // 1 hour
          reason: 'IP blacklisted'
        };
      }

      // Skip rate limiting for whitelisted IPs
      if (this.isWhitelistedIP(identifier)) {
        return {
          allowed: true,
          remaining: Infinity,
          resetTime: Date.now() + 60 * 1000,
          reason: 'Whitelisted IP'
        };
      }

      const config = this.getRateLimitConfig(endpoint, userTier);
      const key = this.generateKey(identifier, endpoint, config.window);
      
      // Get current count from Redis or memory
      let currentCount, ttl;
      if (this.redisAvailable) {
        currentCount = await this.redis.get(key);
        ttl = await this.redis.ttl(key);
      } else {
        // Use in-memory fallback
        const memoryKey = `${key}_${Date.now()}`;
        const memoryData = this.memoryStore.get(key);
        if (memoryData && Date.now() < memoryData.expires) {
          currentCount = memoryData.count.toString();
          ttl = Math.ceil((memoryData.expires - Date.now()) / 1000);
        } else {
          currentCount = null;
          ttl = -1;
          this.memoryStore.delete(key);
        }
      }
      const count = currentCount ? parseInt(currentCount) : 0;

      if (count >= config.requests) {
        // Rate limit exceeded
        const resetTime = Date.now() + (ttl * 1000);
        
        // Log rate limit violation
        this.logRateLimitViolation(identifier, endpoint, count, config);
        
        // Consider blacklisting for severe violations
        if (count > config.requests * 2) {
          this.addToBlacklist(identifier, 'Severe rate limit violation');
        }

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          reason: 'Rate limit exceeded'
        };
      }

      // Increment counter
      let newCount;
      if (this.redisAvailable) {
        const pipeline = this.redis.pipeline();
        pipeline.incr(key);
        pipeline.expire(key, Math.ceil(config.window / 1000));
        
        const results = await pipeline.exec();
        newCount = results[0][1];
      } else {
        // Use in-memory fallback
        const memoryData = this.memoryStore.get(key);
        if (memoryData && Date.now() < memoryData.expires) {
          newCount = memoryData.count + 1;
          memoryData.count = newCount;
        } else {
          newCount = 1;
          this.memoryStore.set(key, {
            count: newCount,
            expires: Date.now() + config.window
          });
        }
      }
      
      return {
        allowed: true,
        remaining: Math.max(0, config.requests - newCount),
        resetTime: Date.now() + config.window,
        total: config.requests,
        count: newCount,
        tier: userTier
      };

    } catch (error) {
      console.error('Rate limit check error:', error);
      
      // Fallback: allow request if Redis is down
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: Date.now() + 60 * 1000,
        reason: 'Rate limit service unavailable'
      };
    }
  }

  /**
   * Log rate limit violation
   */
  logRateLimitViolation(identifier, endpoint, count, config) {
    const violation = {
      identifier,
      endpoint,
      count,
      limit: config.requests,
      timestamp: new Date().toISOString(),
      userAgent: 'Unknown', // Will be set by middleware
      ip: identifier
    };

    console.warn('Rate limit violation:', violation);
    this.emit('rate_limit_violation', violation);
  }

  /**
   * Get rate limit status for identifier
   */
  async getRateLimitStatus(identifier, endpoint, userTier = 'free') {
    try {
      const config = this.getRateLimitConfig(endpoint, userTier);
      const key = this.generateKey(identifier, endpoint, config.window);
      
      let count = 0;
      let ttl = 0;
      
      if (this.redisAvailable) {
        const currentCount = await this.redis.get(key);
        count = currentCount ? parseInt(currentCount) : 0;
        ttl = await this.redis.ttl(key);
      } else {
        // Use in-memory fallback
        const memoryData = this.memoryStore.get(key);
        if (memoryData && Date.now() < memoryData.expires) {
          count = memoryData.count;
          ttl = Math.ceil((memoryData.expires - Date.now()) / 1000);
        }
      }
      
      return {
        endpoint,
        tier: userTier,
        current: count,
        limit: config.requests,
        remaining: Math.max(0, config.requests - count),
        resetTime: Date.now() + (ttl * 1000),
        window: config.window,
        isWhitelisted: this.isWhitelistedIP(identifier),
        isBlacklisted: this.isBlacklistedIP(identifier)
      };

    } catch (error) {
      console.error('Get rate limit status error:', error);
      return null;
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async resetRateLimit(identifier, endpoint) {
    try {
      const config = this.getRateLimitConfig(endpoint);
      const key = this.generateKey(identifier, endpoint, config.window);
      
      if (this.redisAvailable) {
        await this.redis.del(key);
      } else {
        // Use in-memory fallback
        this.memoryStore.delete(key);
      }
      
      this.emit('rate_limit_reset', { identifier, endpoint });
      
      return true;
    } catch (error) {
      console.error('Reset rate limit error:', error);
      return false;
    }
  }

  /**
   * Get all rate limit statistics
   */
  async getRateLimitStats() {
    try {
      let keys = [];
      
      if (this.redisAvailable) {
        keys = await this.redis.keys('rate_limit:*');
      } else {
        // Use in-memory fallback
        keys = Array.from(this.memoryStore.keys());
      }
      
      const stats = {
        totalKeys: keys.length,
        activeLimits: {},
        violations: 0,
        whitelistedIPs: this.whitelistedIPs.size,
        blacklistedIPs: this.blacklistedIPs.size
      };

      // Get stats for each key
      for (const key of keys) {
        let count = 0;
        
        if (this.redisAvailable) {
          count = await this.redis.get(key);
        } else {
          // Use in-memory fallback
          const memoryData = this.memoryStore.get(key);
          if (memoryData && Date.now() < memoryData.expires) {
            count = memoryData.count;
          }
        }
        
        const [, endpoint, identifier] = key.split(':');
        
        if (!stats.activeLimits[endpoint]) {
          stats.activeLimits[endpoint] = {
            totalRequests: 0,
            uniqueIdentifiers: new Set()
          };
        }
        
        stats.activeLimits[endpoint].totalRequests += parseInt(count) || 0;
        stats.activeLimits[endpoint].uniqueIdentifiers.add(identifier);
      }

      // Convert sets to counts
      for (const endpoint in stats.activeLimits) {
        stats.activeLimits[endpoint].uniqueCount = stats.activeLimits[endpoint].uniqueIdentifiers.size;
        delete stats.activeLimits[endpoint].uniqueIdentifiers;
      }

      return stats;

    } catch (error) {
      console.error('Get rate limit stats error:', error);
      return null;
    }
  }

  /**
   * Clean up expired rate limit keys
   */
  async cleanupExpiredKeys() {
    try {
      const keys = await this.redis.keys('rate_limit:*');
      const expiredKeys = [];

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        await this.redis.del(...expiredKeys);
        console.log(`Cleaned up ${expiredKeys.length} expired rate limit keys`);
      }

      return expiredKeys.length;

    } catch (error) {
      console.error('Cleanup expired keys error:', error);
      return 0;
    }
  }

  /**
   * Get user tier from user data
   */
  getUserTier(user) {
    if (!user) return 'free';
    
    // Check for admin role
    if (user.role === 'admin') return 'admin';
    
    // Check for premium subscription (you can extend this logic)
    if (user.subscription && user.subscription.tier) {
      return user.subscription.tier;
    }
    
    // Check for enterprise features
    if (user.isEnterprise) return 'enterprise';
    
    return 'free';
  }

  /**
   * Middleware factory for rate limiting
   */
  createRateLimitMiddleware(endpoint, options = {}) {
    return async (req, res, next) => {
      try {
        // Get identifier (IP or user ID)
        const identifier = options.useUserId && req.user 
          ? req.user.id 
          : req.ip || req.connection.remoteAddress;
        
        // Get user tier
        const userTier = this.getUserTier(req.user);
        
        // Check rate limit
        const result = await this.checkRateLimit(identifier, endpoint, userTier);
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': result.total || 'N/A',
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          'X-RateLimit-Tier': result.tier || 'free'
        });

        if (!result.allowed) {
          // Set retry-after header
          const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
          res.set('Retry-After', retryAfter);
          
          return res.status(429).json({
            error: 'Too Many Requests',
            message: result.reason,
            retryAfter: retryAfter,
            resetTime: result.resetTime
          });
        }

        // Add rate limit info to request
        req.rateLimit = result;
        next();

      } catch (error) {
        console.error('Rate limit middleware error:', error);
        // Continue without rate limiting if there's an error
        next();
      }
    };
  }

  /**
   * Track failed login attempt
   */
  trackFailedAttempt(identifier, type = 'login') {
    const key = `${type}_${identifier}`;
    const now = Date.now();
    
    if (!this.failedAttempts.has(key)) {
      this.failedAttempts.set(key, {
        count: 0,
        lastAttempt: now,
        lockedUntil: null
      });
    }

    const attempt = this.failedAttempts.get(key);
    attempt.count += 1;
    attempt.lastAttempt = now;

    // Check if should be locked out
    if (attempt.count >= this.maxFailedAttempts) {
      attempt.lockedUntil = now + this.lockoutDuration;
      this.emit('account_locked', { identifier, type, lockedUntil: attempt.lockedUntil });
    }

    // Check for suspicious activity
    if (attempt.count >= this.suspiciousThreshold) {
      this.trackSuspiciousActivity(identifier, type, {
        failedAttempts: attempt.count,
        timeWindow: now - attempt.lastAttempt
      });
    }
  }

  /**
   * Track suspicious activity
   */
  trackSuspiciousActivity(identifier, type, details) {
    const key = `${type}_${identifier}`;
    const now = Date.now();
    
    if (!this.suspiciousActivity.has(key)) {
      this.suspiciousActivity.set(key, {
        count: 0,
        lastActivity: now,
        activities: []
      });
    }

    const activity = this.suspiciousActivity.get(key);
    activity.count += 1;
    activity.lastActivity = now;
    activity.activities.push({
      timestamp: now,
      details,
      severity: this.calculateSeverity(details)
    });

    // Keep only last 10 activities
    if (activity.activities.length > 10) {
      activity.activities = activity.activities.slice(-10);
    }

    // Emit security alert if threshold exceeded
    if (activity.count >= this.suspiciousThreshold) {
      this.emit('suspicious_activity', {
        identifier,
        type,
        activity: activity.activities[activity.activities.length - 1]
      });
    }
  }

  /**
   * Calculate activity severity
   */
  calculateSeverity(details) {
    let severity = 'low';
    
    if (details.failedAttempts >= 10) {
      severity = 'high';
    } else if (details.failedAttempts >= 5) {
      severity = 'medium';
    }

    return severity;
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    return {
      totalFailedAttempts: this.failedAttempts.size,
      totalSuspiciousActivities: this.suspiciousActivity.size,
      totalIPWhitelists: this.whitelistedIPs.size,
      totalDevices: Array.from(this.deviceRegistry.values())
        .reduce((sum, devices) => sum + devices.size, 0)
    };
  }

  /**
   * Close Redis connection
   */
  async close() {
    try {
      await this.redis.quit();
      console.log('Rate limiting service disconnected from Redis');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}

module.exports = RateLimitService;

