/**
 * Type definitions for Amazon SP-API
 */

/**
 * LWA (Login with Amazon) credentials
 */
export interface LWACredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/**
 * AWS credentials for SP-API
 */
export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

/**
 * SP-API configuration
 */
export interface SPAPIConfig {
  sellerId: string;
  marketplaceId: string;
  endpoint: string;
}

/**
 * Complete credentials for SP-API access
 */
export interface SPAPICredentials {
  aws: AWSCredentials;
  lwa: LWACredentials;
  config: SPAPIConfig;
}

/**
 * LWA access token response
 */
export interface LWATokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

/**
 * Cached access token with expiration
 */
export interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * SP-API error response
 */
export interface SPAPIError {
  code: string;
  message: string;
  details?: string;
}

/**
 * SP-API error response wrapper
 */
export interface SPAPIErrorResponse {
  errors: SPAPIError[];
}

/**
 * HTTP request options for SP-API
 */
export interface SPAPIRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  queryParams?: Record<string, string | number | boolean>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * HTTP response from SP-API
 */
export interface SPAPIResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  retryableStatusCodes: number[];
  retryDelay: number; // milliseconds
  backoffMultiplier: number;
}
