import {
  SPAPIError,
  SPAPIRequestError,
  SPAPIServerError,
  RateLimitError,
  SPAPIAuthError,
  SPAPIValidationError,
} from '../../../src/utils/errors';

describe('Error Classes', () => {
  describe('SPAPIError', () => {
    it('should create basic error', () => {
      const error = new SPAPIError('Something went wrong');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SPAPIError);
      expect(error.name).toBe('SPAPIError');
      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBeUndefined();
      expect(error.statusCode).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('should create error with all properties', () => {
      const details = { field: 'productId', issue: 'invalid format' };
      const error = new SPAPIError(
        'Validation failed',
        'VALIDATION_ERROR',
        400,
        details,
      );

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });

    it('should have correct prototype chain', () => {
      const error = new SPAPIError('Test error');
      expect(Object.getPrototypeOf(error)).toBe(SPAPIError.prototype);
    });
  });

  describe('SPAPIRequestError', () => {
    it('should create client error (4xx)', () => {
      const error = new SPAPIRequestError('Bad request', 400);

      expect(error).toBeInstanceOf(SPAPIError);
      expect(error).toBeInstanceOf(SPAPIRequestError);
      expect(error.name).toBe('SPAPIRequestError');
      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(400);
    });

    it('should create error with code and details', () => {
      const details = { errors: ['Field required'] };
      const error = new SPAPIRequestError(
        'Missing fields',
        400,
        'MISSING_FIELDS',
        details,
      );

      expect(error.code).toBe('MISSING_FIELDS');
      expect(error.details).toEqual(details);
    });

    it('should handle 404 errors', () => {
      const error = new SPAPIRequestError('Resource not found', 404);
      expect(error.statusCode).toBe(404);
    });
  });

  describe('SPAPIServerError', () => {
    it('should create server error (5xx)', () => {
      const error = new SPAPIServerError('Internal server error', 500);

      expect(error).toBeInstanceOf(SPAPIError);
      expect(error).toBeInstanceOf(SPAPIServerError);
      expect(error.name).toBe('SPAPIServerError');
      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
    });

    it('should handle 503 service unavailable', () => {
      const error = new SPAPIServerError('Service unavailable', 503);
      expect(error.statusCode).toBe(503);
    });

    it('should handle 502 bad gateway', () => {
      const error = new SPAPIServerError(
        'Bad gateway',
        502,
        'BAD_GATEWAY',
      );
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('BAD_GATEWAY');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new RateLimitError('Too many requests');

      expect(error).toBeInstanceOf(SPAPIError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should include retry after seconds', () => {
      const error = new RateLimitError('Rate limit exceeded', 60);
      expect(error.retryAfter).toBe(60);
    });

    it('should include details', () => {
      const details = { limit: 10, remaining: 0, resetAt: '2024-01-01' };
      const error = new RateLimitError(
        'Rate limit exceeded',
        30,
        details,
      );
      expect(error.details).toEqual(details);
    });
  });

  describe('SPAPIAuthError', () => {
    it('should create auth error', () => {
      const error = new SPAPIAuthError('Unauthorized');

      expect(error).toBeInstanceOf(SPAPIRequestError);
      expect(error).toBeInstanceOf(SPAPIAuthError);
      expect(error.name).toBe('SPAPIAuthError');
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should include details about auth failure', () => {
      const details = { reason: 'Invalid access token' };
      const error = new SPAPIAuthError('Authentication failed', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('SPAPIValidationError', () => {
    it('should create validation error', () => {
      const error = new SPAPIValidationError('Invalid input');

      expect(error).toBeInstanceOf(SPAPIRequestError);
      expect(error).toBeInstanceOf(SPAPIValidationError);
      expect(error.name).toBe('SPAPIValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should include validation details', () => {
      const details = {
        fields: {
          orderId: 'Required field',
          marketplaceId: 'Invalid format',
        },
      };
      const error = new SPAPIValidationError('Validation failed', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('Error instanceof checks', () => {
    it('should correctly identify error types', () => {
      const baseError = new SPAPIError('base');
      const requestError = new SPAPIRequestError('request', 400);
      const serverError = new SPAPIServerError('server', 500);
      const rateLimitError = new RateLimitError('rate limit');
      const authError = new SPAPIAuthError('auth');
      const validationError = new SPAPIValidationError('validation');

      // All are SPAPIError
      expect(baseError).toBeInstanceOf(SPAPIError);
      expect(requestError).toBeInstanceOf(SPAPIError);
      expect(serverError).toBeInstanceOf(SPAPIError);
      expect(rateLimitError).toBeInstanceOf(SPAPIError);
      expect(authError).toBeInstanceOf(SPAPIError);
      expect(validationError).toBeInstanceOf(SPAPIError);

      // Request errors
      expect(requestError).toBeInstanceOf(SPAPIRequestError);
      expect(authError).toBeInstanceOf(SPAPIRequestError);
      expect(validationError).toBeInstanceOf(SPAPIRequestError);

      // Not request errors
      expect(baseError).not.toBeInstanceOf(SPAPIRequestError);
      expect(serverError).not.toBeInstanceOf(SPAPIRequestError);

      // Specific types
      expect(authError).toBeInstanceOf(SPAPIAuthError);
      expect(validationError).toBeInstanceOf(SPAPIValidationError);
      expect(serverError).toBeInstanceOf(SPAPIServerError);
      expect(rateLimitError).toBeInstanceOf(RateLimitError);
    });
  });

  describe('Error serialization', () => {
    it('should serialize error properties', () => {
      const error = new SPAPIError('Test error', 'TEST_CODE', 400, {
        field: 'value',
      });

      // Standard Error properties (not enumerable, so check directly)
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('SPAPIError');

      // Custom properties (enumerable)
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'value' });

      // Verify custom properties are serializable
      const serialized = JSON.parse(JSON.stringify(error));
      expect(serialized.code).toBe('TEST_CODE');
      expect(serialized.statusCode).toBe(400);
      expect(serialized.details).toEqual({ field: 'value' });
    });

    it('should handle errors in try-catch', () => {
      try {
        throw new RateLimitError('Too many requests', 60);
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBe(60);
      }
    });
  });
});
