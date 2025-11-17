/**
 * Integration tests for complete SP-API client request flow
 * Tests the full stack: credentials → token → signing → request → response
 */

import nock from 'nock';
import { SPAPIClient } from '../../src/utils/sp-api-client';
import { TokenManager } from '../../src/auth/token-manager';
import { CredentialsManager } from '../../src/auth/credentials';
import { RateLimiter, RateLimitConfig } from '../../src/utils/rate-limiter';
import {
  RateLimitError,
  SPAPIAuthError,
  SPAPIServerError,
} from '../../src/utils/errors';

describe('SP-API Client Integration Tests', () => {
  let client: SPAPIClient;
  let tokenManager: TokenManager;
  let credManager: CredentialsManager;
  let testRateLimiter: RateLimiter;

  beforeAll(() => {
    // Disable real HTTP requests
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    // Clear all nock interceptors
    nock.cleanAll();

    // Create real credentials manager
    credManager = new CredentialsManager();
    const lwaCreds = credManager.getLWACredentials();
    const awsCreds = credManager.getAWSCredentials();
    const config = credManager.getSPAPIConfig();

    // Create real token manager
    tokenManager = new TokenManager(lwaCreds);

    // Create fast rate limiter for tests
    testRateLimiter = new RateLimiter(
      new Map<string, RateLimitConfig>([
        [
          'test',
          {
            maxRequests: 10,
            windowMs: 1000,
            queueRequests: true,
          },
        ],
        [
          'default',
          {
            maxRequests: 10,
            windowMs: 1000,
            queueRequests: true,
          },
        ],
      ]),
    );

    // Create SP-API client
    client = new SPAPIClient({
      endpoint: config.endpoint,
      marketplaceId: config.marketplaceId,
      awsCredentials: awsCreds,
      tokenManager,
      rateLimiter: testRateLimiter,
    });
  });

  afterEach(() => {
    nock.cleanAll();
    // Clean up rate limiter to prevent pending timers
    if (testRateLimiter) {
      testRateLimiter.reset();
    }
  });

  describe('successful request flow', () => {
    it('should complete full authenticated request', async () => {
      // Mock LWA token exchange
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|integration_access_token',
          token_type: 'bearer',
          expires_in: 3600,
        });

      // Mock SP-API request
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders')
        .query({ MarketplaceIds: 'ATVPDKIKX0DER' })
        .reply(200, {
          payload: {
            Orders: [
              {
                AmazonOrderId: '123-4567890-1234567',
                PurchaseDate: '2024-01-01T10:00:00Z',
                OrderStatus: 'Shipped',
              },
            ],
          },
        });

      const response = await client.request(
        {
          method: 'GET',
          path: '/orders/v0/orders',
          queryParams: { MarketplaceIds: 'ATVPDKIKX0DER' },
        },
        'test',
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('payload');
      expect(response.data.payload.Orders).toHaveLength(1);
      expect(response.data.payload.Orders[0].AmazonOrderId).toBe(
        '123-4567890-1234567',
      );
    });

    it('should reuse cached token for multiple requests', async () => {
      // Mock LWA token exchange (should only be called once)
      const tokenScope = nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|cached_token',
          token_type: 'bearer',
          expires_in: 3600,
        });

      // Mock multiple SP-API requests
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders/order1')
        .reply(200, { payload: { OrderId: 'order1' } })
        .get('/orders/v0/orders/order2')
        .reply(200, { payload: { OrderId: 'order2' } });

      // Make two requests
      await client.request(
        {
          method: 'GET',
          path: '/orders/v0/orders/order1',
        },
        'test',
      );

      await client.request(
        {
          method: 'GET',
          path: '/orders/v0/orders/order2',
        },
        'test',
      );

      // Token should only be fetched once
      expect(tokenScope.isDone()).toBe(true);
    });

    it('should handle POST request with body', async () => {
      // Mock LWA token
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|post_token',
          token_type: 'bearer',
          expires_in: 3600,
        });

      // Mock SP-API POST request
      const reportBody = {
        reportType: 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL',
        marketplaceIds: ['ATVPDKIKX0DER'],
      };

      nock('https://sellingpartnerapi-na.amazon.com')
        .post('/reports/2021-06-30/reports', reportBody)
        .reply(202, {
          payload: {
            reportId: 'report-12345',
          },
        });

      const response = await client.request(
        {
          method: 'POST',
          path: '/reports/2021-06-30/reports',
          body: reportBody,
        },
        'test',
      );

      expect(response.status).toBe(202);
      expect(response.data.payload.reportId).toBe('report-12345');
    });
  });

  describe('error handling flow', () => {
    it('should handle authentication errors', async () => {
      // Mock LWA token exchange
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|invalid_token',
          token_type: 'bearer',
          expires_in: 3600,
        });

      // Mock 401 response from SP-API
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders')
        .reply(401, {
          errors: [
            {
              code: 'Unauthorized',
              message: 'Access token is invalid',
            },
          ],
        });

      await expect(
        client.request(
          {
            method: 'GET',
            path: '/orders/v0/orders',
          },
          'test',
        ),
      ).rejects.toThrow(SPAPIAuthError);
    });

    it('should handle rate limit errors with retry', async () => {
      // Mock LWA token
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|rate_limit_token',
          token_type: 'bearer',
          expires_in: 3600,
        });

      // First request gets rate limited
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders')
        .reply(429, {
          errors: [
            {
              code: 'QuotaExceeded',
              message: 'Request was throttled',
            },
          ],
        });

      // Second request succeeds
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders')
        .reply(200, {
          payload: { Orders: [] },
        });

      const response = await client.request(
        {
          method: 'GET',
          path: '/orders/v0/orders',
        },
        'test',
      );

      expect(response.status).toBe(200);
    });

    it('should handle server errors with retry', async () => {
      // Mock LWA token
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|server_error_token',
          token_type: 'bearer',
          expires_in: 3600,
        });

      // First two requests fail with 503
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders')
        .reply(503, {
          errors: [
            {
              code: 'ServiceUnavailable',
              message: 'Service temporarily unavailable',
            },
          ],
        })
        .get('/orders/v0/orders')
        .reply(503, {
          errors: [
            {
              code: 'ServiceUnavailable',
              message: 'Service temporarily unavailable',
            },
          ],
        });

      // Third request succeeds
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders')
        .reply(200, {
          payload: { Orders: [] },
        });

      const response = await client.request(
        {
          method: 'GET',
          path: '/orders/v0/orders',
        },
        'test',
      );

      expect(response.status).toBe(200);
    });

    it('should fail after max retries', async () => {
      // Mock LWA token
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|max_retry_token',
          token_type: 'bearer',
          expires_in: 3600,
        });

      // All requests fail with 500
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders')
        .times(4) // 1 initial + 3 retries
        .reply(500, {
          errors: [
            {
              code: 'InternalError',
              message: 'Internal server error',
            },
          ],
        });

      await expect(
        client.request(
          {
            method: 'GET',
            path: '/orders/v0/orders',
          },
          'test',
        ),
      ).rejects.toThrow(SPAPIServerError);
    });
  });

  describe('rate limiting flow', () => {
    it('should respect rate limits', async () => {
      // Create client with strict rate limit
      const strictLimiter = new RateLimiter(
        new Map<string, RateLimitConfig>([
          [
            'strict',
            {
              maxRequests: 2,
              windowMs: 1000,
              queueRequests: true,
            },
          ],
        ]),
      );

      const strictClient = new SPAPIClient({
        endpoint: credManager.getSPAPIConfig().endpoint,
        marketplaceId: credManager.getSPAPIConfig().marketplaceId,
        awsCredentials: credManager.getAWSCredentials(),
        tokenManager,
        rateLimiter: strictLimiter,
      });

      // Mock LWA token
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|rate_limit_test',
          token_type: 'bearer',
          expires_in: 3600,
        });

      // Mock 3 successful requests
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/test/1')
        .reply(200, { payload: '1' })
        .get('/test/2')
        .reply(200, { payload: '2' })
        .get('/test/3')
        .reply(200, { payload: '3' });

      const startTime = Date.now();

      // Make 3 requests (limit is 2 per second)
      await strictClient.request(
        { method: 'GET', path: '/test/1' },
        'strict',
      );
      await strictClient.request(
        { method: 'GET', path: '/test/2' },
        'strict',
      );
      await strictClient.request(
        { method: 'GET', path: '/test/3' },
        'strict',
      );

      const elapsed = Date.now() - startTime;

      // Third request should have waited for refill (allow timing tolerance)
      // With continuous refill, the wait might be shorter than a full second
      expect(elapsed).toBeGreaterThanOrEqual(500);
    }, 10000); // Increase timeout
  });

  describe('request signing', () => {
    it('should include AWS signature headers', async () => {
      // Mock LWA token
      nock('https://api.amazon.com')
        .post('/auth/o2/token')
        .reply(200, {
          access_token: 'Atza|signature_test',
          token_type: 'bearer',
          expires_in: 3600,
        });

      // Mock SP-API request and capture headers
      let capturedHeaders: any;
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders')
        .reply(function () {
          capturedHeaders = this.req.headers;
          return [200, { payload: {} }];
        });

      await client.request(
        {
          method: 'GET',
          path: '/orders/v0/orders',
        },
        'test',
      );

      // Verify required headers are present
      expect(capturedHeaders).toHaveProperty('x-amz-access-token');
      expect(capturedHeaders).toHaveProperty('authorization');
      expect(capturedHeaders).toHaveProperty('x-amz-date');

      // Get authorization header (can be string or array)
      const authHeader = Array.isArray(capturedHeaders.authorization)
        ? capturedHeaders.authorization[0]
        : capturedHeaders.authorization;
      expect(authHeader).toContain('AWS4-HMAC-SHA256');
    });
  });
});
