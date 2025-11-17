/**
 * Token management for LWA (Login with Amazon) OAuth 2.0
 */

import axios from 'axios';
import { LWACredentials, LWATokenResponse, CachedToken } from '../types/sp-api.js';

const LWA_TOKEN_ENDPOINT = 'https://api.amazon.com/auth/o2/token';

/**
 * Manages LWA access tokens with automatic refresh and caching
 */
export class TokenManager {
  private credentials: LWACredentials;
  private cachedToken: CachedToken | null = null;

  constructor(credentials: LWACredentials) {
    this.credentials = credentials;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    // Check if cached token is still valid
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      return this.cachedToken.accessToken;
    }

    // Fetch new token
    return await this.refreshAccessToken();
  }

  /**
   * Check if a cached token is still valid
   * Considers token expired if less than 5 minutes remain
   */
  private isTokenValid(token: CachedToken): boolean {
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return token.expiresAt > now + bufferTime;
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    try {
      const response = await axios.post<LWATokenResponse>(
        LWA_TOKEN_ENDPOINT,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.credentials.refreshToken,
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, expires_in } = response.data;

      // Cache the new token
      this.cachedToken = {
        accessToken: access_token,
        expiresAt: Date.now() + expires_in * 1000,
      };

      return access_token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error_description || error.message;
        throw new Error(`Failed to refresh LWA access token: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Clear the cached token (useful for testing)
   */
  clearCache(): void {
    this.cachedToken = null;
  }

  /**
   * Check if a token is currently cached
   */
  hasCachedToken(): boolean {
    return this.cachedToken !== null && this.isTokenValid(this.cachedToken);
  }
}
