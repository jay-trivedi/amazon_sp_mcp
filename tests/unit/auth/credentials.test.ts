/**
 * Unit tests for CredentialsManager
 */

import { CredentialsManager } from '../../../src/auth/credentials';

describe('CredentialsManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should load credentials from environment variables', () => {
      const manager = new CredentialsManager();
      const creds = manager.getAll();

      expect(creds.aws.accessKeyId).toBe('test_access_key');
      expect(creds.lwa.clientId).toBe('test_client_id');
      expect(creds.config.sellerId).toBe('test_seller_id');
    });

    it('should use default region if not specified', () => {
      delete process.env.AWS_REGION;
      const manager = new CredentialsManager();
      const creds = manager.getAWSCredentials();

      expect(creds.region).toBe('us-east-1');
    });

    it('should use default endpoint if not specified', () => {
      delete process.env.SP_API_ENDPOINT;
      const manager = new CredentialsManager();
      const config = manager.getSPAPIConfig();

      expect(config.endpoint).toBe('https://sellingpartnerapi-na.amazon.com');
    });

    it('should throw error when AWS_ACCESS_KEY_ID is missing', () => {
      delete process.env.AWS_ACCESS_KEY_ID;

      expect(() => new CredentialsManager()).toThrow('Missing required credentials');
      expect(() => new CredentialsManager()).toThrow('AWS_ACCESS_KEY_ID is required');
    });

    it('should throw error when AWS_SECRET_ACCESS_KEY is missing', () => {
      delete process.env.AWS_SECRET_ACCESS_KEY;

      expect(() => new CredentialsManager()).toThrow('AWS_SECRET_ACCESS_KEY is required');
    });

    it('should throw error when LWA_CLIENT_ID is missing', () => {
      delete process.env.LWA_CLIENT_ID;

      expect(() => new CredentialsManager()).toThrow('LWA_CLIENT_ID is required');
    });

    it('should throw error when LWA_CLIENT_SECRET is missing', () => {
      delete process.env.LWA_CLIENT_SECRET;

      expect(() => new CredentialsManager()).toThrow('LWA_CLIENT_SECRET is required');
    });

    it('should throw error when LWA_REFRESH_TOKEN is missing', () => {
      delete process.env.LWA_REFRESH_TOKEN;

      expect(() => new CredentialsManager()).toThrow('LWA_REFRESH_TOKEN is required');
    });

    it('should throw error when SELLER_ID is missing', () => {
      delete process.env.SELLER_ID;

      expect(() => new CredentialsManager()).toThrow('SELLER_ID is required');
    });

    it('should throw error when MARKETPLACE_ID is missing', () => {
      delete process.env.MARKETPLACE_ID;

      expect(() => new CredentialsManager()).toThrow('MARKETPLACE_ID is required');
    });

    it('should throw error with multiple missing credentials', () => {
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.LWA_CLIENT_ID;
      delete process.env.SELLER_ID;

      expect(() => new CredentialsManager()).toThrow('Missing required credentials');
      expect(() => new CredentialsManager()).toThrow('AWS_ACCESS_KEY_ID is required');
      expect(() => new CredentialsManager()).toThrow('LWA_CLIENT_ID is required');
      expect(() => new CredentialsManager()).toThrow('SELLER_ID is required');
    });
  });

  describe('getAWSCredentials', () => {
    it('should return AWS credentials', () => {
      const manager = new CredentialsManager();
      const creds = manager.getAWSCredentials();

      expect(creds).toEqual({
        accessKeyId: 'test_access_key',
        secretAccessKey: 'test_secret_key',
        region: 'us-east-1',
      });
    });
  });

  describe('getLWACredentials', () => {
    it('should return LWA credentials', () => {
      const manager = new CredentialsManager();
      const creds = manager.getLWACredentials();

      expect(creds).toEqual({
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        refreshToken: 'test_refresh_token',
      });
    });
  });

  describe('getSPAPIConfig', () => {
    it('should return SP-API configuration', () => {
      const manager = new CredentialsManager();
      const config = manager.getSPAPIConfig();

      expect(config).toEqual({
        sellerId: 'test_seller_id',
        marketplaceId: 'ATVPDKIKX0DER',
        endpoint: 'https://sellingpartnerapi-na.amazon.com',
      });
    });
  });

  describe('getAll', () => {
    it('should return all credentials', () => {
      const manager = new CredentialsManager();
      const all = manager.getAll();

      expect(all).toHaveProperty('aws');
      expect(all).toHaveProperty('lwa');
      expect(all).toHaveProperty('config');
      expect(all.aws.accessKeyId).toBe('test_access_key');
      expect(all.lwa.clientId).toBe('test_client_id');
      expect(all.config.sellerId).toBe('test_seller_id');
    });
  });
});
