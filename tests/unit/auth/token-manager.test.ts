/**
 * Unit tests for TokenManager
 */

import axios from 'axios';
import { TokenManager } from '../../../src/auth/token-manager';
import { LWACredentials } from '../../../src/types/sp-api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TokenManager', () => {
  const mockCredentials: LWACredentials = {
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    refreshToken: 'test_refresh_token',
  };

  let tokenManager: TokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager(mockCredentials);
    jest.clearAllMocks();
  });

  describe('getAccessToken', () => {
    it('should fetch and cache a new token', async () => {
      const mockResponse = {
        data: {
          access_token: 'mock_access_token',
          token_type: 'bearer',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const token = await tokenManager.getAccessToken();

      expect(token).toBe('mock_access_token');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.amazon.com/auth/o2/token',
        expect.any(URLSearchParams),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    });

    it('should return cached token if still valid', async () => {
      const mockResponse = {
        data: {
          access_token: 'cached_token',
          token_type: 'bearer',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      // First call - fetches token
      const token1 = await tokenManager.getAccessToken();

      // Second call - should return cached token
      const token2 = await tokenManager.getAccessToken();

      expect(token1).toBe('cached_token');
      expect(token2).toBe('cached_token');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should refresh token when cached token expires', async () => {
      const mockResponse1 = {
        data: {
          access_token: 'first_token',
          token_type: 'bearer',
          expires_in: 0, // Expires immediately
        },
      };

      const mockResponse2 = {
        data: {
          access_token: 'second_token',
          token_type: 'bearer',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      // First call
      const token1 = await tokenManager.getAccessToken();
      expect(token1).toBe('first_token');

      // Wait a bit for token to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second call - should refresh
      const token2 = await tokenManager.getAccessToken();
      expect(token2).toBe('second_token');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should throw error on failed token refresh', async () => {
      const mockError = {
        response: {
          data: {
            error: 'invalid_grant',
            error_description: 'The provided refresh token is invalid',
          },
        },
        isAxiosError: true,
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(tokenManager.getAccessToken()).rejects.toThrow(
        'Failed to refresh LWA access token'
      );
    });

    it('should send correct request parameters', async () => {
      const mockResponse = {
        data: {
          access_token: 'test_token',
          token_type: 'bearer',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await tokenManager.getAccessToken();

      const callArgs = mockedAxios.post.mock.calls[0];
      const params = callArgs[1] as URLSearchParams;

      expect(params.get('grant_type')).toBe('refresh_token');
      expect(params.get('refresh_token')).toBe('test_refresh_token');
      expect(params.get('client_id')).toBe('test_client_id');
      expect(params.get('client_secret')).toBe('test_client_secret');
    });
  });

  describe('clearCache', () => {
    it('should clear the cached token', async () => {
      const mockResponse = {
        data: {
          access_token: 'test_token',
          token_type: 'bearer',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      // Get token (caches it)
      await tokenManager.getAccessToken();
      expect(tokenManager.hasCachedToken()).toBe(true);

      // Clear cache
      tokenManager.clearCache();
      expect(tokenManager.hasCachedToken()).toBe(false);

      // Next call should fetch new token
      await tokenManager.getAccessToken();
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('hasCachedToken', () => {
    it('should return false when no token is cached', () => {
      expect(tokenManager.hasCachedToken()).toBe(false);
    });

    it('should return true when valid token is cached', async () => {
      const mockResponse = {
        data: {
          access_token: 'test_token',
          token_type: 'bearer',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await tokenManager.getAccessToken();
      expect(tokenManager.hasCachedToken()).toBe(true);
    });

    it('should return false when cached token is expired', async () => {
      const mockResponse = {
        data: {
          access_token: 'test_token',
          token_type: 'bearer',
          expires_in: 0, // Expires immediately
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await tokenManager.getAccessToken();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(tokenManager.hasCachedToken()).toBe(false);
    });
  });
});
