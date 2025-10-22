const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Setup test database
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clean up after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  
  // Clear any cached data
  if (global.testUtils) {
    // Reset any global test state if needed
  }
});

// Clean up after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Global test utilities
global.testUtils = {
  // Create a test user
  createTestUser: (overrides = {}) => ({
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    businessName: 'Test Business',
    businessType: 'hemp',
    licenseNumber: 'TEST123456',
    walletAddress: '0x1234567890123456789012345678901234567890',
    ...overrides
  }),

  // Create a test payment
  createTestPayment: (overrides = {}) => ({
    amount: 100,
    currency: 'USD',
    customerEmail: 'customer@example.com',
    description: 'Test payment',
    targetStablecoin: 'USDC',
    paymentMethod: 'ACH',
    ...overrides
  }),

  // Create a test transaction
  createTestTransaction: (overrides = {}) => ({
    transactionId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.floor(Math.random() * 10000)}`,
    merchantId: new mongoose.Types.ObjectId(),
    customerEmail: `customer_${Date.now()}@example.com`,
    amount: 100,
    currency: 'USDC',
    cryptoAmount: '100.0',
    exchangeRate: 1.0,
    status: 'pending',
    paymentMethod: 'stablecoin',
    blockchain: 'ethereum',
    fromAddress: '0x1234567890123456789012345678901234567890',
    toAddress: '0x0987654321098765432109876543210987654321',
    ...overrides
  }),

  // Generate test JWT token
  generateTestToken: (userId = new mongoose.Types.ObjectId()) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, email: 'test@example.com', role: 'merchant' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  },

  // Mock external API responses
  mockExchangeRates: () => ({
    'USDC': { USD: 1.0, EUR: 0.85, GBP: 0.73 },
    'USDT': { USD: 1.0, EUR: 0.85, GBP: 0.73 },
    'DAI': { USD: 1.0, EUR: 0.85, GBP: 0.73 },
    'ETH': { USD: 2000, EUR: 1700, GBP: 1460 },
    'BTC': { USD: 45000, EUR: 38250, GBP: 32850 }
  }),

  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/voodoohemp-test';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.ETHEREUM_RPC_URL = 'https://mainnet.infura.io/v3/test-key';
