/**
 * HTTP client for Amazon SP-API
 * Handles authentication, rate limiting, error handling, and retries
 */

import axios, { AxiosError, AxiosResponse } from 'axios';
import type {
  SPAPIRequestOptions,
  SPAPIResponse,
  SPAPIErrorResponse,
  RetryConfig,
  AWSCredentials,
} from '../types/sp-api.js';
import { TokenManager } from '../auth/token-manager.js';
import { signRequest } from './aws-signature.js';
import { RateLimiter, DEFAULT_RATE_LIMITS } from './rate-limiter.js';
import {
  SPAPIError,
  SPAPIRequestError,
  SPAPIServerError,
  RateLimitError,
  SPAPIAuthError,
  SPAPIValidationError,
} from './errors.js';

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2, // exponential backoff
};

export interface SPAPIClientOptions {
  endpoint: string;
  marketplaceId: string;
  awsCredentials: AWSCredentials;
  tokenManager: TokenManager;
  rateLimiter?: RateLimiter;
  retryConfig?: Partial<RetryConfig>;
}

/**
 * SP-API HTTP Client
 *
 * Features:
 * - Automatic authentication (LWA OAuth 2.0)
 * - AWS Signature V4 signing
 * - Rate limiting per endpoint
 * - Automatic retries for transient failures
 * - Comprehensive error handling
 */
export class SPAPIClient {
  private endpoint: string;
  private marketplaceId: string;
  private awsCredentials: AWSCredentials;
  private tokenManager: TokenManager;
  private rateLimiter: RateLimiter;
  private retryConfig: RetryConfig;

  constructor(options: SPAPIClientOptions) {
    this.endpoint = options.endpoint;
    this.marketplaceId = options.marketplaceId;
    this.awsCredentials = options.awsCredentials;
    this.tokenManager = options.tokenManager;
    this.rateLimiter = options.rateLimiter || new RateLimiter(DEFAULT_RATE_LIMITS);
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...options.retryConfig,
    };
  }

  /**
   * Make an authenticated request to SP-API
   *
   * @param options - Request options (method, path, body, etc.)
   * @param endpointKey - Rate limit bucket key (e.g., 'orders', 'inventory')
   * @returns Response data
   */
  async request<T = unknown>(
    options: SPAPIRequestOptions,
    endpointKey: string = 'default'
  ): Promise<SPAPIResponse<T>> {
    // Wait for rate limit token
    await this.rateLimiter.acquire(endpointKey);

    // Make request with retries
    return await this.requestWithRetry<T>(options, 0);
  }

  private async requestWithRetry<T>(
    options: SPAPIRequestOptions,
    attemptNumber: number
  ): Promise<SPAPIResponse<T>> {
    try {
      return await this.makeRequest<T>(options);
    } catch (error) {
      // Check if we should retry
      const shouldRetry =
        attemptNumber < this.retryConfig.maxRetries && this.isRetryableError(error);

      if (shouldRetry) {
        // Calculate backoff delay
        const delay =
          this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffMultiplier, attemptNumber);

        // Handle rate limit errors specially
        if (error instanceof RateLimitError && error.retryAfter) {
          await this.sleep(error.retryAfter * 1000);
        } else {
          await this.sleep(delay);
        }

        return await this.requestWithRetry<T>(options, attemptNumber + 1);
      }

      throw error;
    }
  }

  private async makeRequest<T>(options: SPAPIRequestOptions): Promise<SPAPIResponse<T>> {
    // Get access token
    const accessToken = await this.tokenManager.getAccessToken();

    // Build full URL
    const url = new URL(options.path, this.endpoint);
    if (options.queryParams) {
      Object.entries(options.queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Sign request with AWS Signature V4
    const signedHeaders = signRequest(
      {
        method: options.method,
        url: url.toString(),
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      },
      this.awsCredentials
    );

    // Merge signed headers
    Object.assign(headers, signedHeaders);

    try {
      const response: AxiosResponse<T> = await axios({
        method: options.method,
        url: url.toString(),
        headers,
        data: options.body,
        validateStatus: () => true, // Handle all status codes manually
      });

      // Check for errors
      if (response.status >= 400) {
        throw this.createErrorFromResponse(response);
      }

      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      if (error instanceof SPAPIError) {
        throw error;
      }

      // Handle Axios errors
      if (axios.isAxiosError(error)) {
        throw this.createErrorFromAxiosError(error);
      }

      // Unknown error
      throw new SPAPIError(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private createErrorFromResponse(response: AxiosResponse): SPAPIError {
    const statusCode = response.status;
    const data = response.data as SPAPIErrorResponse | undefined;

    // Parse error message
    let message = `SP-API request failed with status ${statusCode}`;
    let code: string | undefined;
    let details: unknown;

    if (data && data.errors && data.errors.length > 0) {
      const firstError = data.errors[0];
      if (firstError) {
        message = firstError.message;
        code = firstError.code;
        details = data.errors.length > 1 ? data.errors : firstError.details;
      }
    }

    // Handle rate limit errors
    if (statusCode === 429) {
      const retryAfter = response.headers['retry-after']
        ? parseInt(response.headers['retry-after'], 10)
        : undefined;
      return new RateLimitError(message || 'Rate limit exceeded', retryAfter, details);
    }

    // Handle auth errors
    if (statusCode === 401 || statusCode === 403) {
      return new SPAPIAuthError(message || 'Authentication failed', details);
    }

    // Handle validation errors
    if (statusCode === 400) {
      return new SPAPIValidationError(message || 'Invalid request', details);
    }

    // Handle client errors (4xx)
    if (statusCode >= 400 && statusCode < 500) {
      return new SPAPIRequestError(message, statusCode, code, details);
    }

    // Handle server errors (5xx)
    if (statusCode >= 500) {
      return new SPAPIServerError(message, statusCode, code, details);
    }

    return new SPAPIError(message, code, statusCode, details);
  }

  private createErrorFromAxiosError(error: AxiosError): SPAPIError {
    if (error.response) {
      return this.createErrorFromResponse(error.response);
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new SPAPIError('Request timeout');
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new SPAPIError('Network error: Unable to reach SP-API');
    }

    return new SPAPIError(error.message || 'HTTP request failed', error.code);
  }

  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof SPAPIError)) {
      return false;
    }

    if (!error.statusCode) {
      return false;
    }

    return this.retryConfig.retryableStatusCodes.includes(error.statusCode);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limiter (useful for monitoring)
   */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  /**
   * Get marketplace ID
   */
  getMarketplaceId(): string {
    return this.marketplaceId;
  }
}
