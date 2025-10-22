const request = require('supertest');
const app = require('../../server/index');
const User = require('../../server/models/User');
const Transaction = require('../../server/models/Transaction');

describe('Crypto Payment Flow', () => {
  let merchant;
  let authToken;
  let transactionId;

  beforeAll(async () => {
    // Create test merchant
    merchant = new User({
      email: 'merchant@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Merchant',
      businessName: 'Test Hemp Business',
      businessType: 'hemp',
      licenseNumber: 'TEST123456',
      walletAddress: '0x1234567890123456789012345678901234567890'
    });
    await merchant.save();

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'merchant@example.com',
        password: 'TestPassword123!'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({ email: /test.*@example\.com/ });
    await Transaction.deleteMany({ customerEmail: /test.*@example\.com/ });
  });

  describe('Payment Request Creation', () => {
    it('should create a crypto payment request', async () => {
      const paymentData = {
        amount: 100,
        currency: 'USD',
        description: 'Test hemp product purchase',
        customerEmail: 'customer@example.com',
        targetStablecoin: 'USDC'
      };

      const response = await request(app)
        .post('/api/payments/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body).toHaveProperty('paymentRequest');
      expect(response.body.paymentRequest.amount).toBe(100);
      expect(response.body.paymentRequest.currency).toBe('USD');
      expect(response.body.paymentRequest.customerEmail).toBe('customer@example.com');
      expect(response.body.paymentRequest.status).toBe('pending');
      expect(response.body.paymentRequest).toHaveProperty('paymentAddress');
      expect(response.body.paymentRequest).toHaveProperty('cryptoAmount');
      expect(response.body.paymentRequest).toHaveProperty('exchangeRate');

      transactionId = response.body.paymentRequest.transactionId;
    });

    it('should reject payment request with invalid amount', async () => {
      const paymentData = {
        amount: -10,
        currency: 'USD',
        description: 'Invalid amount test',
        customerEmail: 'customer@example.com',
        targetStablecoin: 'USDC'
      };

      const response = await request(app)
        .post('/api/payments/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject payment request with invalid email', async () => {
      const paymentData = {
        amount: 100,
        currency: 'USD',
        description: 'Invalid email test',
        customerEmail: 'invalid-email',
        targetStablecoin: 'USDC'
      };

      const response = await request(app)
        .post('/api/payments/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Payment Status Tracking', () => {
    it('should track payment status', async () => {
      const response = await request(app)
        .get(`/api/payments/status/${transactionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('transaction');
      expect(response.body.transaction.transactionId).toBe(transactionId);
      expect(response.body.transaction.status).toBe('pending');
    });

    it('should return 404 for non-existent transaction', async () => {
      const fakeTransactionId = 'fake-transaction-id';
      
      const response = await request(app)
        .get(`/api/payments/status/${fakeTransactionId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Payment Confirmation', () => {
    it('should confirm payment with valid transaction hash', async () => {
      const mockTransactionHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      const response = await request(app)
        .post(`/api/payments/confirm/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transactionHash: mockTransactionHash
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Payment confirmed');
    });

    it('should reject confirmation without transaction hash', async () => {
      const response = await request(app)
        .post(`/api/payments/confirm/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should reject confirmation with invalid transaction hash', async () => {
      const response = await request(app)
        .post(`/api/payments/confirm/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transactionHash: 'invalid-hash'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Transaction History', () => {
    it('should return merchant transaction history', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter transactions by status', async () => {
      const response = await request(app)
        .get('/api/transactions?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter transactions by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/transactions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('Payment Refunds', () => {
    it('should initiate refund for completed transaction', async () => {
      // First, we need a completed transaction
      const transaction = await Transaction.findOne({ transactionId });
      if (transaction) {
        transaction.status = 'completed';
        transaction.timestamps.completed = new Date();
        await transaction.save();
      }

      const refundData = {
        reason: 'Customer requested refund',
        amount: 50 // Partial refund
      };

      const response = await request(app)
        .post(`/api/payments/refund/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(refundData)
        .expect(200);

      expect(response.body).toHaveProperty('refund');
      expect(response.body.refund.status).toBe('pending');
      expect(response.body.refund.amount).toBe(50);
    });

    it('should reject refund for pending transaction', async () => {
      const refundData = {
        reason: 'Invalid refund test',
        amount: 50
      };

      const response = await request(app)
        .post(`/api/payments/refund/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(refundData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Exchange Rate Integration', () => {
    it('should fetch current exchange rates', async () => {
      const response = await request(app)
        .get('/api/payments/exchange-rates')
        .expect(200);

      expect(response.body).toHaveProperty('rates');
      expect(response.body.rates).toHaveProperty('USDC');
      expect(response.body.rates).toHaveProperty('USDT');
      expect(response.body.rates).toHaveProperty('DAI');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Compliance and Risk Assessment', () => {
    it('should assess transaction risk', async () => {
      const riskData = {
        amount: 5000,
        customerEmail: 'customer@example.com',
        customerInfo: {
          name: 'John Doe',
          phone: '+1234567890'
        }
      };

      const response = await request(app)
        .post('/api/payments/assess-risk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(riskData)
        .expect(200);

      expect(response.body).toHaveProperty('riskScore');
      expect(response.body).toHaveProperty('riskLevel');
      expect(response.body).toHaveProperty('flags');
      expect(typeof response.body.riskScore).toBe('number');
      expect(response.body.riskScore).toBeGreaterThanOrEqual(0);
      expect(response.body.riskScore).toBeLessThanOrEqual(100);
    });

    it('should flag high-risk transactions', async () => {
      const highRiskData = {
        amount: 50000, // High amount
        customerEmail: 'suspicious@example.com',
        customerInfo: {
          name: '', // Missing name
          phone: '' // Missing phone
        }
      };

      const response = await request(app)
        .post('/api/payments/assess-risk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(highRiskData)
        .expect(200);

      expect(response.body.riskScore).toBeGreaterThan(50);
      expect(response.body.riskLevel).toBe('high');
      expect(response.body.flags.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Currency Support', () => {
    it('should handle EUR payments', async () => {
      const paymentData = {
        amount: 85,
        currency: 'EUR',
        description: 'Test EUR payment',
        customerEmail: 'customer-eur@example.com',
        targetStablecoin: 'USDC'
      };

      const response = await request(app)
        .post('/api/payments/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.paymentRequest.currency).toBe('EUR');
      expect(response.body.paymentRequest).toHaveProperty('exchangeRate');
    });

    it('should handle GBP payments', async () => {
      const paymentData = {
        amount: 75,
        currency: 'GBP',
        description: 'Test GBP payment',
        customerEmail: 'customer-gbp@example.com',
        targetStablecoin: 'USDT'
      };

      const response = await request(app)
        .post('/api/payments/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.paymentRequest.currency).toBe('GBP');
      expect(response.body.paymentRequest).toHaveProperty('exchangeRate');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // This would test how the system handles blockchain network issues
      const response = await request(app)
        .get('/api/payments/exchange-rates')
        .expect(200);

      // Even if external API fails, should return cached or default rates
      expect(response.body).toHaveProperty('rates');
    });

    it('should handle invalid blockchain transactions', async () => {
      const invalidHash = '0x0000000000000000000000000000000000000000000000000000000000000000';

      const response = await request(app)
        .post(`/api/payments/confirm/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transactionHash: invalidHash
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});



