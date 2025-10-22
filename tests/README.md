# VoodooHemp Payment Processor - Test Suite

This directory contains comprehensive tests for the VoodooHemp Payment Processor, covering all aspects of the system from unit tests to end-to-end payment flows.

## 🧪 Test Structure

```
tests/
├── setup/                    # Test configuration and utilities
│   └── jest.setup.js        # Jest configuration and global test utilities
├── unit/                     # Unit tests for individual components
│   ├── models/              # Database model tests
│   └── services/            # Service layer tests
├── integration/              # Integration tests for API endpoints
│   └── routes/              # API route tests
├── payment-flows/           # End-to-end payment flow tests
│   └── crypto-payment.test.js
├── security/                 # Security and authentication tests
│   └── authentication.test.js
├── run-tests.js             # Test runner script
└── README.md               # This file
```

## 🚀 Running Tests

### Run All Tests
```bash
npm test
# or
node tests/run-tests.js
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit
node tests/run-tests.js unit

# Integration tests only
npm run test:integration
node tests/run-tests.js integration

# Payment flow tests
npm run test:payment-flows
node tests/run-tests.js payment-flows

# Security tests
npm run test:security
node tests/run-tests.js security
```

### Run Tests with Coverage
```bash
npm run test:coverage
node tests/run-tests.js coverage
```

### Watch Mode (for development)
```bash
npm run test:watch
```

## 📊 Test Coverage

Our test suite maintains high coverage standards:

- **Global Coverage**: 80% minimum
- **Models**: 90% minimum (critical for data integrity)
- **Services**: 85% minimum (business logic)
- **Routes**: 75% minimum (API endpoints)

Coverage reports are generated in the `coverage/` directory after running tests.

## 🔧 Test Configuration

### Environment Setup
Tests run in a controlled environment with:
- In-memory MongoDB database
- Mocked external APIs
- Isolated test data
- Automatic cleanup between tests

### Test Utilities
Global test utilities are available in `tests/setup/jest.setup.js`:
- `createTestUser()` - Generate test user data
- `createTestPayment()` - Generate test payment data
- `createTestTransaction()` - Generate test transaction data
- `generateTestToken()` - Create JWT tokens for testing
- `mockExchangeRates()` - Mock cryptocurrency exchange rates

## 🧪 Test Categories

### 1. Unit Tests (`tests/unit/`)
Test individual components in isolation:
- **Models**: Database schema validation, data integrity
- **Services**: Business logic, calculations, external API integration

### 2. Integration Tests (`tests/integration/`)
Test API endpoints and their interactions:
- **Authentication**: Login, registration, token validation
- **Payment Routes**: Payment creation, status tracking, confirmations
- **Transaction Management**: History, filtering, pagination

### 3. Payment Flow Tests (`tests/payment-flows/`)
End-to-end testing of complete payment processes:
- **Crypto Payments**: Full crypto payment lifecycle
- **Fiat Conversions**: Crypto-to-fiat conversion flows
- **Cannabis-Friendly Payments**: ACH and specialized payment methods

### 4. Security Tests (`tests/security/`)
Comprehensive security testing:
- **Authentication**: JWT security, session management
- **Input Validation**: XSS, SQL injection, NoSQL injection prevention
- **Rate Limiting**: Brute force protection
- **Password Security**: Strength requirements, hashing

## 🔒 Security Testing

Our security tests cover:

### Authentication Security
- JWT token validation and expiration
- Password strength requirements
- Session management
- Rate limiting on login attempts

### Input Validation
- XSS prevention
- SQL injection protection
- NoSQL injection prevention
- Request size limits

### API Security
- CORS configuration
- Security headers
- Protected route access
- Data sanitization

## 💳 Payment Flow Testing

### Crypto Payment Flow
1. **Payment Request Creation**
   - Valid amount and currency validation
   - Customer information verification
   - Exchange rate calculation
   - Transaction ID generation

2. **Payment Status Tracking**
   - Real-time status updates
   - Blockchain confirmation monitoring
   - Transaction history management

3. **Payment Confirmation**
   - Transaction hash validation
   - Confirmation count tracking
   - Automatic status updates

4. **Refund Processing**
   - Refund eligibility checks
   - Partial vs full refunds
   - Refund status tracking

### Cannabis-Friendly Payment Flow
1. **ACH Bank Transfer**
   - Bank account validation
   - Routing number verification
   - Transfer initiation
   - Settlement tracking

2. **Specialized Payment Providers**
   - CanPay integration
   - Dutchie Pay integration
   - GreenRush integration

## 🛠️ Writing New Tests

### Test File Structure
```javascript
describe('Feature Name', () => {
  let testData;
  
  beforeEach(() => {
    // Setup test data
    testData = global.testUtils.createTestUser();
  });
  
  afterEach(async () => {
    // Cleanup after each test
    await User.deleteMany({ email: /test.*@example\.com/ });
  });
  
  describe('Specific Functionality', () => {
    it('should handle valid input correctly', async () => {
      // Test implementation
    });
    
    it('should handle invalid input gracefully', async () => {
      // Error handling test
    });
  });
});
```

### Best Practices
1. **Use descriptive test names** that explain what is being tested
2. **Test both success and failure scenarios**
3. **Use the global test utilities** for consistent test data
4. **Clean up after each test** to prevent test interference
5. **Mock external dependencies** to ensure test reliability
6. **Assert on specific values** rather than just existence

### Mocking External Services
```javascript
// Mock axios for API calls
jest.mock('axios');
const mockedAxios = axios;

beforeEach(() => {
  mockedAxios.get.mockResolvedValue({
    data: { 'usd-coin': { usd: 1.0 } }
  });
});
```

## 🐛 Debugging Tests

### Common Issues
1. **Database Connection**: Ensure MongoDB is running or use in-memory database
2. **Environment Variables**: Check that test environment variables are set
3. **Async Operations**: Use proper async/await or Promise handling
4. **Test Isolation**: Ensure tests don't interfere with each other

### Debug Commands
```bash
# Run specific test with verbose output
npx jest tests/unit/models/User.test.js --verbose

# Run tests in watch mode for development
npx jest --watch

# Run tests with detailed coverage
npx jest --coverage --verbose
```

## 📈 Continuous Integration

Tests are automatically run in CI/CD pipelines with:
- **Pre-commit hooks** for code quality
- **Pull request validation** for all changes
- **Coverage reporting** for quality metrics
- **Security scanning** for vulnerability detection

## 🎯 Test Goals

Our testing strategy ensures:
- **Reliability**: All payment flows work correctly
- **Security**: Protection against common vulnerabilities
- **Performance**: System handles expected load
- **Compliance**: Meets regulatory requirements
- **Maintainability**: Easy to update and extend

## 📞 Support

For questions about the test suite:
1. Check this documentation
2. Review existing test examples
3. Consult the Jest documentation
4. Contact the development team

---

**Remember**: Comprehensive testing is critical for a payment processor. Always run tests before deploying changes to production!



