const request = require('supertest');
const app = require('../../../server/index');
const User = require('../../../server/models/User');

describe('Auth Routes', () => {
  let testUser;

  beforeEach(async () => {
    // Clean up any existing test users
    await User.deleteMany({ email: /test.*@example\.com/ });
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({ email: /test.*@example\.com/ });
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      businessName: 'Test Business',
      businessType: 'hemp',
      licenseNumber: 'TEST123456',
      walletAddress: '0x1234567890123456789012345678901234567890'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(validUserData.email);
      expect(response.body.user.businessName).toBe(validUserData.businessName);
      expect(response.body.user).not.toHaveProperty('password');

      // Verify user was saved to database
      const savedUser = await User.findOne({ email: validUserData.email });
      expect(savedUser).toBeTruthy();
      expect(savedUser.email).toBe(validUserData.email);
      expect(savedUser.isVerified).toBe(false);
      expect(savedUser.kycStatus).toBe('pending');
    });

    it('should reject registration with missing required fields', async () => {
      const invalidData = { ...validUserData };
      delete invalidData.email;

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ field: 'email' })
      );
    });

    it('should reject registration with invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ 
          field: 'email',
          message: expect.stringContaining('valid email')
        })
      );
    });

    it('should reject registration with weak password', async () => {
      const invalidData = { ...validUserData, password: '123' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ 
          field: 'password',
          message: expect.stringContaining('stronger password')
        })
      );
    });

    it('should reject registration with invalid business type', async () => {
      const invalidData = { ...validUserData, businessType: 'invalid' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject registration with invalid wallet address', async () => {
      const invalidData = { ...validUserData, walletAddress: 'invalid-address' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ 
          field: 'walletAddress',
          message: expect.stringContaining('valid Ethereum address')
        })
      );
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Second registration with same email
      const duplicateData = { ...validUserData, firstName: 'Different' };
      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ 
          field: 'email',
          message: expect.stringContaining('already exists')
        })
      );
    });

    it('should reject duplicate license number registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Second registration with same license number
      const duplicateData = { 
        ...validUserData, 
        email: 'different@example.com',
        licenseNumber: validUserData.licenseNumber
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      testUser = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        businessName: 'Test Business',
        businessType: 'hemp',
        licenseNumber: 'TEST123456',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });
      await testUser.save();
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject login with missing email', async () => {
      const loginData = {
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject login with missing password', async () => {
      const loginData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject login for inactive user', async () => {
      // Deactivate the user
      testUser.isActive = false;
      await testUser.save();

      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Account is inactive');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeEach(async () => {
      // Create a test user and get auth token
      testUser = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        businessName: 'Test Business',
        businessType: 'hemp',
        licenseNumber: 'TEST123456',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });
      await testUser.save();

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });
      
      authToken = loginResponse.body.token;
    });

    it('should return user data with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.businessName).toBe('Test Business');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Access denied');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid token');
    });

    it('should reject request with expired token', async () => {
      // Create an expired token (this would need to be implemented in the auth middleware)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzQ5YjEwYzAwMDAwMDAwMDAwMDAwMDAiLCJpYXQiOjE2MzQ5NjgwMDAsImV4cCI6MTYzNDk2ODAwMH0.invalid';

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/auth/verify', () => {
    let authToken;

    beforeEach(async () => {
      // Create a test user and get auth token
      testUser = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        businessName: 'Test Business',
        businessType: 'hemp',
        licenseNumber: 'TEST123456',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });
      await testUser.save();

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });
      
      authToken = loginResponse.body.token;
    });

    it('should verify user email successfully', async () => {
      const response = await request(app)
        .put('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          verificationCode: '123456' // This would need to match the actual code
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Email verified successfully');
    });

    it('should reject verification with invalid code', async () => {
      const response = await request(app)
        .put('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          verificationCode: 'invalid-code'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid verification code');
    });

    it('should reject verification without token', async () => {
      const response = await request(app)
        .put('/api/auth/verify')
        .send({
          verificationCode: '123456'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      // Create a test user
      testUser = new User({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        businessName: 'Test Business',
        businessType: 'hemp',
        licenseNumber: 'TEST123456',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });
      await testUser.save();
    });

    it('should send password reset email for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Password reset email sent');
    });

    it('should return success even for non-existent user (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Password reset email sent');
    });

    it('should reject request without email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });
});



