// Simple test to verify Jest setup is working
describe('Basic Test Setup', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to test utilities', () => {
    expect(global.testUtils).toBeDefined();
    expect(typeof global.testUtils.createTestUser).toBe('function');
  });

  it('should have proper environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
  });
});



