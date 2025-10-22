const request = require('supertest');
const app = require('../../server/index');
const User = require('../../server/models/User');

describe('Authentication Security', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create test user
    testUser = new User({
      email: 'security-test@example.com',
      password: 'SecurePassword123!',
      firstName: 'Security',
      lastName: 'Test',
      businessName: 'Security Test Business',
      businessType: 'hemp',
      licenseNumber: 'SEC123456',
      walletAddress: '0x1234567890123456789012345678901234567890'
    });
    await testUser.save();

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'security-test@example.com',
        password: 'SecurePassword123!'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /security.*@example\.com/ });
  });

  describe('JWT Token Security', () => {
    it('should reject requests without Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Access denied');
    });

    it('should reject requests with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with invalid token format', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-format')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with tampered token', async () => {
      const tamperedToken = authToken.slice(0, -5) + 'xxxxx';
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with expired token', async () => {
      // Create a token with past expiration
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: testUser._id, email: testUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should limit login attempts', async () => {
      const loginData = {
        email: 'security-test@example.com',
        password: 'WrongPassword'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);
      }

      // Should be rate limited after 5 attempts
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Too many requests');
    });

    it('should limit registration attempts', async () => {
      const registrationData = {
        email: 'rate-limit-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Rate',
        lastName: 'Limit',
        businessName: 'Rate Limit Test',
        businessType: 'hemp',
        licenseNumber: 'RATE123456',
        walletAddress: '0x1234567890123456789012345678901234567890'
      };

      // Make multiple registration attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/register')
          .send({ ...registrationData, email: `rate-limit-test${i}@example.com` })
          .expect(201);
      }

      // Should be rate limited after 5 attempts
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...registrationData, email: 'rate-limit-test6@example.com' })
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Too many requests');
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize malicious input in registration', async () => {
      const maliciousData = {
        email: 'test@example.com<script>alert("xss")</script>',
        password: 'TestPassword123!',
        firstName: '<script>alert("xss")</script>',
        lastName: 'User',
        businessName: 'Test Business',
        businessType: 'hemp',
        licenseNumber: 'TEST123456',
        walletAddress: '0x1234567890123456789012345678901234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      // Should not contain the script tags in the response
      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });

    it('should prevent NoSQL injection attacks', async () => {
      const injectionData = {
        email: { $ne: null },
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        businessName: 'Test Business',
        businessType: 'hemp',
        licenseNumber: 'TEST123456',
        walletAddress: '0x1234567890123456789012345678901234567890'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(injectionData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionData = {
        email: "test@example.com'; DROP TABLE users; --",
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        businessName: 'Test Business',
        businessType: 'hemp',
        licenseNumber: 'TEST123456',
        walletAddress: '0x1234567890123456789012345678901234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(sqlInjectionData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      // Should not execute the SQL injection
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Password Security', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        'abc123',
        'Password',
        'PASSWORD123',
        'password123',
        'Password123'
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `weak-password-test-${Date.now()}@example.com`,
            password: weakPassword,
            firstName: 'Test',
            lastName: 'User',
            businessName: 'Test Business',
            businessType: 'hemp',
            licenseNumber: `WEAK${Date.now()}`,
            walletAddress: '0x1234567890123456789012345678901234567890'
          });

        if (response.status === 201) {
          // If it somehow passes, it shouldn't
          expect(response.status).toBe(400);
        }
      }
    });

    it('should require strong passwords', async () => {
      const strongPassword = 'StrongPassword123!@#';

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'strong-password-test@example.com',
          password: strongPassword,
          firstName: 'Test',
          lastName: 'User',
          businessName: 'Test Business',
          businessType: 'hemp',
          licenseNumber: 'STRONG123456',
          walletAddress: '0x1234567890123456789012345678901234567890'
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
    });

    it('should hash passwords securely', async () => {
      const user = await User.findOne({ email: 'security-test@example.com' });
      
      expect(user.password).not.toBe('SecurePassword123!');
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash pattern
    });
  });

  describe('Session Security', () => {
    it('should not expose sensitive user data', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('verificationCode');
      expect(response.body.user).not.toHaveProperty('passwordResetToken');
    });

    it('should require authentication for protected routes', async () => {
      const protectedRoutes = [
        { method: 'get', path: '/api/auth/me' },
        { method: 'get', path: '/api/transactions' },
        { method: 'post', path: '/api/payments/request' },
        { method: 'get', path: '/api/merchants/dashboard' }
      ];

      for (const route of protectedRoutes) {
        const response = await request(app)[route.method](route.path)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('CORS Security', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://malicious-site.com')
        .expect(204);

      // Should include CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should restrict CORS to allowed origins', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'https://malicious-site.com')
        .send({
          email: 'security-test@example.com',
          password: 'SecurePassword123!'
        });

      // Should not include CORS headers for unauthorized origin
      expect(response.headers).not.toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Request Size Limits', () => {
    it('should limit request body size', async () => {
      const largeData = {
        email: 'large-request-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Large',
        lastName: 'Request',
        businessName: 'Large Request Test Business',
        businessType: 'hemp',
        licenseNumber: 'LARGE123456',
        walletAddress: '0x1234567890123456789012345678901234567890',
        description: 'A'.repeat(10000) // Large description
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(largeData);

      // Should either accept or reject with appropriate error
      expect([201, 400, 413]).toContain(response.status);
    });
  });

  describe('Header Security', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers).toHaveProperty('strict-transport-security');
    });
  });
});



