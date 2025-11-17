/**
 * Simple test to verify Jest setup
 */

describe('Hello World Test', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });

  it('should have test environment variables set', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.AWS_ACCESS_KEY_ID).toBe('test_access_key');
  });
});
