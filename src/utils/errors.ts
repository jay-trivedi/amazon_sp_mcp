/**
 * Custom error classes for Amazon SP-API
 */

/**
 * Base error class for all SP-API related errors
 */
export class SPAPIError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'SPAPIError';
    Object.setPrototypeOf(this, SPAPIError.prototype);
  }
}

/**
 * Error for client-side errors (4xx responses)
 */
export class SPAPIRequestError extends SPAPIError {
  constructor(message: string, statusCode: number, code?: string, details?: unknown) {
    super(message, code, statusCode, details);
    this.name = 'SPAPIRequestError';
    Object.setPrototypeOf(this, SPAPIRequestError.prototype);
  }
}

/**
 * Error for server-side errors (5xx responses)
 */
export class SPAPIServerError extends SPAPIError {
  constructor(message: string, statusCode: number, code?: string, details?: unknown) {
    super(message, code, statusCode, details);
    this.name = 'SPAPIServerError';
    Object.setPrototypeOf(this, SPAPIServerError.prototype);
  }
}

/**
 * Error for rate limit exceeded (429 responses)
 */
export class RateLimitError extends SPAPIError {
  constructor(
    message: string,
    public readonly retryAfter?: number, // seconds to wait before retry
    details?: unknown
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, details);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Error for authentication/authorization failures
 */
export class SPAPIAuthError extends SPAPIRequestError {
  constructor(message: string, details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details);
    this.name = 'SPAPIAuthError';
    Object.setPrototypeOf(this, SPAPIAuthError.prototype);
  }
}

/**
 * Error for invalid request parameters
 */
export class SPAPIValidationError extends SPAPIRequestError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'SPAPIValidationError';
    Object.setPrototypeOf(this, SPAPIValidationError.prototype);
  }
}
