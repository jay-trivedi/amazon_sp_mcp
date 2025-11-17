/**
 * Integration tests for authentication flow
 */

import nock from 'nock';
import { TokenManager } from '../../src/auth/token-manager';
import { LWACredentials } from '../../src/types/sp-api';

describe('Authentication Flow Integration', () => {
  const mockCredentials: LWACredentials = {
    clientId: 'integration_test_client',
    clientSecret: 'integration_test_secret',
    refreshToken: 'integration_test_refresh_token',
  };

  afterEach(() => {
    nock.cleanAll();
  });

  describe('LWA Token Refresh Flow', () => {
    it('should successfully complete full token refresh flow', async () => {
      // Mock LWA token endpoint
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|integration_test_access_token',
          token_type: 'bearer',
          expires_in: 3600,
        });

      const tokenManager = new TokenManager(mockCredentials);
      const accessToken = await tokenManager.getAccessToken();

      expect(accessToken).toBe('Atza|integration_test_access_token');
      expect(tokenManager.hasCachedToken()).toBe(true);
    });

    it('should handle token refresh with retry on failure', async () => {
      // First request fails
      nock('https://api.amazon.com').post('/auth/o2/token').reply(500, {
        error: 'server_error',
        error_description: 'Internal server error',
      });

      // Second request succeeds
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|retry_success_token',
          token_type: 'bearer',
          expires_in: 3600,
        });

      const tokenManager = new TokenManager(mockCredentials);

      // First attempt should fail
      await expect(tokenManager.getAccessToken()).rejects.toThrow(
        'Failed to refresh LWA access token'
      );

      // Second attempt should succeed
      const accessToken = await tokenManager.getAccessToken();
      expect(accessToken).toBe('Atza|retry_success_token');
    });

    it('should use cached token for subsequent requests', async () => {
      // Mock only one successful response
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|cached_token',
          token_type: 'bearer',
          expires_in: 7200, // 2 hours
        });

      const tokenManager = new TokenManager(mockCredentials);

      // First request
      const token1 = await tokenManager.getAccessToken();
      expect(token1).toBe('Atza|cached_token');

      // Second request should use cache (no additional HTTP call)
      const token2 = await tokenManager.getAccessToken();
      expect(token2).toBe('Atza|cached_token');

      // Verify only one HTTP request was made
      expect(nock.isDone()).toBe(true);
    });

    it('should automatically refresh expired token', async () => {
      // First token expires quickly
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|short_lived_token',
          token_type: 'bearer',
          expires_in: 1, // 1 second
        });

      // Second token has normal expiration
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|refreshed_token',
          token_type: 'bearer',
          expires_in: 3600,
        });

      const tokenManager = new TokenManager(mockCredentials);

      // Get first token
      const token1 = await tokenManager.getAccessToken();
      expect(token1).toBe('Atza|short_lived_token');

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should automatically refresh
      const token2 = await tokenManager.getAccessToken();
      expect(token2).toBe('Atza|refreshed_token');
    });

    it('should handle invalid credentials error', async () => {
      // Mock twice since we're making two assertions that both trigger requests
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .times(2)
        .reply(400, {
          error: 'invalid_grant',
          error_description: 'The provided authorization grant is invalid',
        });

      const tokenManager = new TokenManager(mockCredentials);

      await expect(tokenManager.getAccessToken()).rejects.toThrow(
        'Failed to refresh LWA access token'
      );

      // Create a new token manager for the second test to avoid cache
      const tokenManager2 = new TokenManager(mockCredentials);
      await expect(tokenManager2.getAccessToken()).rejects.toThrow(
        'The provided authorization grant is invalid'
      );
    });

    it('should send correct grant_type parameter', async () => {
      let requestBody: any = null;

      nock('https://api.amazon.com')
        .post('/auth/o2/token', (body) => {
          requestBody = body;
          return true;
        })
        .reply(200, {
          access_token: 'Atza|test_token',
          token_type: 'bearer',
          expires_in: 3600,
        });

      const tokenManager = new TokenManager(mockCredentials);
      await tokenManager.getAccessToken();

      // Nock intercepts the body as a parsed object
      expect(requestBody).toHaveProperty('grant_type', 'refresh_token');
      expect(requestBody).toHaveProperty('client_id', mockCredentials.clientId);
      expect(requestBody).toHaveProperty('client_secret', mockCredentials.clientSecret);
      expect(requestBody).toHaveProperty('refresh_token', mockCredentials.refreshToken);
    });
  });
});
