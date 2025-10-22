# 🛡️ VirdisPay Rate Limiting System

## Overview

The VirdisPay Rate Limiting System provides comprehensive API protection with Redis-backed rate limiting, tiered user limits, IP whitelisting/blacklisting, and real-time monitoring. This system ensures fair usage, prevents abuse, and maintains service availability.

## 🚀 Features

### Core Rate Limiting
- **Redis-backed storage** for scalable rate limiting
- **Tiered user limits** (Free, Premium, Enterprise, Admin)
- **Endpoint-specific limits** for different API operations
- **Sliding window algorithm** for accurate rate limiting
- **Automatic cleanup** of expired rate limit keys

### Security Features
- **IP Whitelisting** for trusted sources
- **IP Blacklisting** for malicious actors
- **Failed attempt tracking** with automatic lockouts
- **Suspicious activity monitoring**
- **Emergency bypass** for critical operations

### Monitoring & Management
- **Real-time dashboard** for rate limit monitoring
- **Admin management interface** for IP and user management
- **Comprehensive statistics** and analytics
- **Rate limit violation logging**
- **Health monitoring** for Redis connectivity

## 📊 Rate Limit Configurations

### Authentication Endpoints
```javascript
auth: {
  login: { requests: 5, window: 15 * 60 * 1000 },      // 5 attempts per 15 minutes
  register: { requests: 3, window: 60 * 60 * 1000 },   // 3 registrations per hour
  passwordReset: { requests: 3, window: 60 * 60 * 1000 }, // 3 resets per hour
  twoFA: { requests: 10, window: 5 * 60 * 1000 },      // 10 2FA attempts per 5 minutes
}
```

### Payment Endpoints
```javascript
payments: {
  create: { requests: 100, window: 60 * 1000 },        // 100 payments per minute
  process: { requests: 50, window: 60 * 1000 },        // 50 processed per minute
  status: { requests: 200, window: 60 * 1000 },        // 200 status checks per minute
  webhook: { requests: 1000, window: 60 * 1000 },      // 1000 webhooks per minute
}
```

### API Endpoints
```javascript
api: {
  general: { requests: 1000, window: 60 * 1000 },      // 1000 requests per minute
  analytics: { requests: 100, window: 60 * 1000 },     // 100 analytics requests per minute
  compliance: { requests: 50, window: 60 * 1000 },     // 50 compliance requests per minute
  security: { requests: 200, window: 60 * 1000 },      // 200 security requests per minute
}
```

### Upload Endpoints
```javascript
upload: {
  documents: { requests: 10, window: 60 * 1000 },      // 10 document uploads per minute
  images: { requests: 20, window: 60 * 1000 },         // 20 image uploads per minute
}
```

## 👥 User Tiers

### Free Tier
- **Multiplier**: 1.0x
- **Max Requests/Minute**: 100
- **Max Requests/Hour**: 1,000
- **Max Requests/Day**: 10,000

### Premium Tier
- **Multiplier**: 2.0x
- **Max Requests/Minute**: 200
- **Max Requests/Hour**: 2,000
- **Max Requests/Day**: 20,000

### Enterprise Tier
- **Multiplier**: 5.0x
- **Max Requests/Minute**: 500
- **Max Requests/Hour**: 5,000
- **Max Requests/Day**: 50,000

### Admin Tier
- **Multiplier**: 10.0x
- **Max Requests/Minute**: 1,000
- **Max Requests/Hour**: 10,000
- **Max Requests/Day**: 100,000

## 🔧 Installation & Setup

### 1. Install Dependencies
```bash
npm install express-rate-limit redis ioredis
```

### 2. Environment Variables
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Emergency Bypass (optional)
EMERGENCY_BYPASS_KEY=your_emergency_key
```

### 3. Initialize Rate Limiting Service
```javascript
const { rateLimitService } = require('./middleware/rateLimiting');

// Service automatically connects to Redis on initialization
```

## 📡 API Endpoints

### Rate Limit Status
```http
GET /api/rate-limit/status?endpoint=general
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "rateLimit": {
    "endpoint": "general",
    "tier": "premium",
    "current": 45,
    "limit": 200,
    "remaining": 155,
    "resetTime": 1640995200000,
    "window": 60000,
    "isWhitelisted": false,
    "isBlacklisted": false
  }
}
```

### Rate Limit Configuration
```http
GET /api/rate-limit/limits
Authorization: Bearer <token>
```

### Admin Statistics (Admin Only)
```http
GET /api/rate-limit/stats
Authorization: Bearer <admin_token>
```

### Reset Rate Limit (Admin Only)
```http
POST /api/rate-limit/reset
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "identifier": "user_id_or_ip",
  "endpoint": "auth"
}
```

### IP Whitelist Management (Admin Only)
```http
POST /api/rate-limit/whitelist
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "ip": "192.168.1.100"
}
```

### IP Blacklist Management (Admin Only)
```http
POST /api/rate-limit/blacklist
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "ip": "192.168.1.100",
  "reason": "Suspicious activity detected"
}
```

## 🎯 Usage Examples

### Basic Rate Limiting Middleware
```javascript
const { apiRateLimit } = require('./middleware/rateLimiting');

// Apply to all API routes
app.use('/api/', apiRateLimit);

// Apply to specific routes
app.post('/api/payments/create', 
  authMiddleware,
  paymentCreateRateLimit,
  createPaymentHandler
);
```

### Custom Rate Limiting
```javascript
const { createCustomRateLimit } = require('./middleware/rateLimiting');

const customLimit = createCustomRateLimit('custom-endpoint', {
  useUserId: true // Use user ID instead of IP
});

app.post('/api/custom', customLimit, handler);
```

### Rate Limit Status Check
```javascript
const { rateLimitService } = require('./middleware/rateLimiting');

// Check rate limit for user
const status = await rateLimitService.getRateLimitStatus(
  userId, 
  'payments', 
  'premium'
);

if (!status.allowed) {
  return res.status(429).json({
    error: 'Rate limit exceeded',
    retryAfter: status.resetTime
  });
}
```

## 🖥️ Frontend Integration

### Rate Limit Dashboard
The system includes a comprehensive React dashboard for monitoring and managing rate limits:

```typescript
import RateLimitDashboard from './components/RateLimitDashboard';

<RateLimitDashboard 
  token={authToken} 
  isAdmin={user.role === 'admin'} 
/>
```

### Dashboard Features
- **Real-time status monitoring**
- **Usage progress visualization**
- **Configuration overview**
- **Admin management tools**
- **Statistics and analytics**

## 🔍 Monitoring & Alerts

### Rate Limit Violations
The system automatically logs and tracks rate limit violations:

```javascript
// Violation event
rateLimitService.on('rate_limit_violation', (violation) => {
  console.warn('Rate limit violation:', violation);
  // Send alert to monitoring system
});
```

### Redis Health Monitoring
```javascript
// Redis connection events
rateLimitService.on('redis_error', (error) => {
  console.error('Redis connection error:', error);
  // Alert system administrators
});

rateLimitService.on('redis_connected', () => {
  console.log('Redis connection restored');
});
```

## 🛠️ Configuration

### Customizing Rate Limits
```javascript
// Modify rate limit configurations
rateLimitService.limits.payments.create = {
  requests: 200,  // Increase to 200 requests
  window: 60 * 1000  // Per minute
};
```

### Adding New Endpoints
```javascript
// Add new endpoint configuration
rateLimitService.limits.newEndpoint = {
  requests: 50,
  window: 30 * 1000  // 30 seconds
};
```

### User Tier Configuration
```javascript
// Add new user tier
rateLimitService.userTiers.custom = {
  multiplier: 3.0,
  maxRequestsPerMinute: 300,
  maxRequestsPerHour: 3000,
  maxRequestsPerDay: 30000
};
```

## 🔒 Security Considerations

### IP Management
- **Whitelisted IPs** bypass all rate limiting
- **Blacklisted IPs** are completely blocked
- **Automatic blacklisting** for severe violations
- **Manual IP management** through admin interface

### Emergency Bypass
```javascript
// Emergency bypass header
headers: {
  'X-Emergency-Bypass': 'your_emergency_key'
}
```

### Fallback Behavior
- **Redis unavailable**: Allow requests (fail-open)
- **Rate limit errors**: Continue without limiting
- **Configuration errors**: Use default limits

## 📈 Performance Optimization

### Redis Optimization
- **Connection pooling** for high concurrency
- **Pipeline operations** for batch requests
- **Automatic reconnection** with exponential backoff
- **Memory-efficient key expiration**

### Caching Strategy
- **In-memory caching** for frequently accessed limits
- **Lazy loading** of user tier configurations
- **Automatic cleanup** of expired data

## 🚨 Troubleshooting

### Common Issues

#### Redis Connection Errors
```bash
# Check Redis status
redis-cli ping

# Check Redis logs
tail -f /var/log/redis/redis-server.log
```

#### Rate Limits Not Working
1. Check Redis connectivity
2. Verify middleware order
3. Check user authentication
4. Review rate limit configuration

#### High Memory Usage
1. Run cleanup operation
2. Check for memory leaks
3. Optimize Redis configuration
4. Monitor key expiration

### Debug Mode
```javascript
// Enable debug logging
process.env.DEBUG = 'rate-limit:*';
```

## 📊 Metrics & Analytics

### Key Metrics
- **Request rate** per endpoint
- **Violation frequency** by IP/user
- **User tier distribution**
- **Redis performance** metrics
- **Cleanup efficiency**

### Monitoring Integration
```javascript
// Prometheus metrics
const prometheus = require('prom-client');

const rateLimitCounter = new prometheus.Counter({
  name: 'rate_limit_requests_total',
  help: 'Total rate limit requests',
  labelNames: ['endpoint', 'tier', 'status']
});
```

## 🔄 Maintenance

### Regular Tasks
- **Cleanup expired keys** (automated)
- **Monitor Redis memory usage**
- **Review violation patterns**
- **Update rate limit configurations**
- **Backup Redis data**

### Automated Cleanup
```javascript
// Run cleanup every hour
setInterval(async () => {
  const cleaned = await rateLimitService.cleanupExpiredKeys();
  console.log(`Cleaned up ${cleaned} expired keys`);
}, 60 * 60 * 1000);
```

## 🎯 Best Practices

### Rate Limit Design
- **Start conservative** and adjust based on usage
- **Consider user experience** when setting limits
- **Monitor violation patterns** for optimization
- **Use appropriate time windows** for different operations

### Security
- **Regularly review** whitelist/blacklist
- **Monitor for abuse patterns**
- **Implement progressive penalties**
- **Log all violations** for analysis

### Performance
- **Use Redis clustering** for high availability
- **Monitor Redis performance**
- **Optimize key expiration**
- **Implement proper error handling**

## 📚 Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [Express Rate Limit](https://github.com/nfriedly/express-rate-limit)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

---

## 🎉 Conclusion

The VirdisPay Rate Limiting System provides enterprise-grade API protection with comprehensive monitoring, flexible configuration, and robust security features. It ensures fair usage while maintaining high availability and performance for your payment processing platform.

For support or questions, please refer to the system logs or contact the development team.


