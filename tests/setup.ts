/**
 * Global test setup file
 * Runs before all test suites
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AWS_ACCESS_KEY_ID = 'test_access_key';
process.env.AWS_SECRET_ACCESS_KEY = 'test_secret_key';
process.env.LWA_CLIENT_ID = 'test_client_id';
process.env.LWA_CLIENT_SECRET = 'test_client_secret';
process.env.LWA_REFRESH_TOKEN = 'test_refresh_token';
process.env.SELLER_ID = 'test_seller_id';
process.env.MARKETPLACE_ID = 'ATVPDKIKX0DER';
process.env.SP_API_ENDPOINT = 'https://sellingpartnerapi-na.amazon.com';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep warn and error for important messages
};
