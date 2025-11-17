import axios from 'axios';
import { SPAPIClient, SPAPIClientOptions } from '../../../src/utils/sp-api-client';
import { TokenManager } from '../../../src/auth/token-manager';
import { RateLimiter, RateLimitConfig } from '../../../src/utils/rate-limiter';
import {
  SPAPIError,
  SPAPIRequestError,
  SPAPIServerError,
  RateLimitError,
  SPAPIAuthError,
  SPAPIValidationError,
} from '../../../src/utils/errors';
import * as awsSignature from '../../../src/utils/aws-signature';

// Mock dependencies
jest.mock('axios');
jest.mock('../../../src/auth/token-manager');
jest.mock('../../../src/utils/aws-signature');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedTokenManager = TokenManager as jest.MockedClass<typeof TokenManager>;
const mockedSignRequest = awsSignature.signRequest as jest.MockedFunction<
  typeof awsSignature.signRequest
>;

describe('SPAPIClient', () => {
  let client: SPAPIClient;
  let mockTokenManager: jest.Mocked<TokenManager>;
  let mockRateLimiter: jest.Mocked<RateLimiter>;
  let clientOptions: SPAPIClientOptions;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock TokenManager
    mockTokenManager = new MockedTokenManager({
      clientId: 'test-client-id',
      clientSecret: 'test-secret',
      refreshToken: 'test-refresh',
    }) as jest.Mocked<TokenManager>;
    mockTokenManager.getAccessToken.mockResolvedValue('test-access-token');

    // Mock RateLimiter
    const mockConfigs = new Map<string, RateLimitConfig>();
    mockRateLimiter = new RateLimiter(mockConfigs) as jest.Mocked<RateLimiter>;
    mockRateLimiter.acquire = jest.fn().mockResolvedValue(undefined);

    // Mock AWS signature
    mockedSignRequest.mockReturnValue({
      Authorization: 'AWS4-HMAC-SHA256 ...',
      'X-Amz-Date': '20240101T000000Z',
      host: 'sellingpartnerapi-na.amazon.com',
    });

    // Create client options
    clientOptions = {
      endpoint: 'https://sellingpartnerapi-na.amazon.com',
      marketplaceId: 'ATVPDKIKX0DER',
      awsCredentials: {
        accessKeyId: 'AKIATEST',
        secretAccessKey: 'test-secret-key',
        region: 'us-east-1',
      },
      tokenManager: mockTokenManager,
      rateLimiter: mockRateLimiter,
    };

    client = new SPAPIClient(clientOptions);
  });

  describe('constructor', () => {
    it('should create client with all options', () => {
      expect(client).toBeInstanceOf(SPAPIClient);
      expect(client.getMarketplaceId()).toBe('ATVPDKIKX0DER');
    });

    it('should use default rate limiter if not provided', () => {
      const clientWithoutRateLimiter = new SPAPIClient({
        ...clientOptions,
        rateLimiter: undefined,
      });
      expect(clientWithoutRateLimiter).toBeInstanceOf(SPAPIClient);
    });

    it('should use custom retry config', () => {
      const customClient = new SPAPIClient({
        ...clientOptions,
        retryConfig: {
          maxRetries: 5,
          retryDelay: 2000,
        },
      });
      expect(customClient).toBeInstanceOf(SPAPIClient);
    });
  });

  describe('request', () => {
    beforeEach(() => {
      mockedAxios.mockResolvedValue({
        data: { payload: 'test-data' },
        status: 200,
        headers: { 'x-amzn-requestid': 'test-request-id' },
        statusText: 'OK',
        config: {} as any,
      });
    });

    it('should make successful GET request', async () => {
      const response = await client.request({
        method: 'GET',
        path: '/orders/v0/orders',
        queryParams: { MarketplaceIds: 'ATVPDKIKX0DER' },
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ payload: 'test-data' });
      expect(mockRateLimiter.acquire).toHaveBeenCalledWith('default');
      expect(mockTokenManager.getAccessToken).toHaveBeenCalled();
      expect(mockedSignRequest).toHaveBeenCalled();
    });

    it('should make successful POST request with body', async () => {
      const body = { test: 'data' };

      await client.request({
        method: 'POST',
        path: '/reports/2021-06-30/reports',
        body,
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: body,
        }),
      );
    });

    it('should use custom endpoint key for rate limiting', async () => {
      await client.request(
        {
          method: 'GET',
          path: '/orders/v0/orders',
        },
        'orders',
      );

      expect(mockRateLimiter.acquire).toHaveBeenCalledWith('orders');
    });

    it('should include access token in headers', async () => {
      await client.request({
        method: 'GET',
        path: '/test',
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-amz-access-token': 'test-access-token',
          }),
        }),
      );
    });

    it('should include AWS signature headers', async () => {
      await client.request({
        method: 'GET',
        path: '/test',
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'AWS4-HMAC-SHA256 ...',
            'X-Amz-Date': '20240101T000000Z',
          }),
        }),
      );
    });

    it('should handle query parameters', async () => {
      await client.request({
        method: 'GET',
        path: '/orders/v0/orders',
        queryParams: {
          MarketplaceIds: 'ATVPDKIKX0DER',
          OrderStatus: 'Shipped',
          limit: 50,
        },
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('MarketplaceIds=ATVPDKIKX0DER'),
        }),
      );
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('OrderStatus=Shipped'),
        }),
      );
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('limit=50'),
        }),
      );
    });

    it('should include custom headers', async () => {
      await client.request({
        method: 'GET',
        path: '/test',
        headers: {
          'x-custom-header': 'custom-value',
        },
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-custom-header': 'custom-value',
          }),
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should throw SPAPIRequestError for 400 errors', async () => {
      mockedAxios.mockResolvedValue({
        data: {
          errors: [
            {
              code: 'InvalidInput',
              message: 'Invalid request parameters',
            },
          ],
        },
        status: 400,
        headers: {},
        statusText: 'Bad Request',
        config: {} as any,
      });

      await expect(
        client.request({
          method: 'GET',
          path: '/test',
        }),
      ).rejects.toThrow(SPAPIRequestError);
    });

    it('should throw SPAPIValidationError for validation failures', async () => {
      mockedAxios.mockResolvedValue({
        data: {
          errors: [
            {
              code: 'ValidationError',
              message: 'Field validation failed',
            },
          ],
        },
        status: 400,
        headers: {},
        statusText: 'Bad Request',
        config: {} as any,
      });

      await expect(
        client.request({
          method: 'GET',
          path: '/test',
        }),
      ).rejects.toThrow(SPAPIValidationError);
    });

    it('should throw SPAPIAuthError for 401 errors', async () => {
      mockedAxios.mockResolvedValue({
        data: {
          errors: [
            {
              code: 'Unauthorized',
              message: 'Invalid access token',
            },
          ],
        },
        status: 401,
        headers: {},
        statusText: 'Unauthorized',
        config: {} as any,
      });

      await expect(
        client.request({
          method: 'GET',
          path: '/test',
        }),
      ).rejects.toThrow(SPAPIAuthError);
    });

    it('should throw RateLimitError for 429 errors', async () => {
      // Create client with no retries to avoid long waits
      const noRetryClient = new SPAPIClient({
        ...clientOptions,
        retryConfig: { maxRetries: 0 },
      });

      mockedAxios.mockResolvedValue({
        data: {
          errors: [
            {
              code: 'QuotaExceeded',
              message: 'Rate limit exceeded',
            },
          ],
        },
        status: 429,
        headers: { 'retry-after': '60' },
        statusText: 'Too Many Requests',
        config: {} as any,
      });

      await expect(
        noRetryClient.request({
          method: 'GET',
          path: '/test',
        }),
      ).rejects.toThrow(RateLimitError);
    });

    it('should include retry-after in RateLimitError', async () => {
      // Create client with no retries to avoid long waits
      const noRetryClient = new SPAPIClient({
        ...clientOptions,
        retryConfig: { maxRetries: 0 },
      });

      mockedAxios.mockResolvedValue({
        data: { errors: [{ message: 'Too many requests' }] },
        status: 429,
        headers: { 'retry-after': '120' },
        statusText: 'Too Many Requests',
        config: {} as any,
      });

      try {
        await noRetryClient.request({
          method: 'GET',
          path: '/test',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBe(120);
      }
    });

    it('should throw SPAPIServerError for 500 errors', async () => {
      mockedAxios.mockResolvedValue({
        data: {
          errors: [
            {
              code: 'InternalError',
              message: 'Internal server error',
            },
          ],
        },
        status: 500,
        headers: {},
        statusText: 'Internal Server Error',
        config: {} as any,
      });

      await expect(
        client.request({
          method: 'GET',
          path: '/test',
        }),
      ).rejects.toThrow(SPAPIServerError);
    });

    it('should parse multiple errors from response', async () => {
      mockedAxios.mockResolvedValue({
        data: {
          errors: [
            { code: 'Error1', message: 'First error' },
            { code: 'Error2', message: 'Second error' },
          ],
        },
        status: 400,
        headers: {},
        statusText: 'Bad Request',
        config: {} as any,
      });

      try {
        await client.request({
          method: 'GET',
          path: '/test',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(SPAPIRequestError);
        expect((error as SPAPIRequestError).message).toBe('First error');
        expect((error as SPAPIRequestError).details).toEqual([
          { code: 'Error1', message: 'First error' },
          { code: 'Error2', message: 'Second error' },
        ]);
      }
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error') as any;
      error.code = 'ENOTFOUND';
      error.isAxiosError = true;

      // Mock axios.isAxiosError to recognize our test error
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      mockedAxios.mockRejectedValue(error);

      await expect(
        client.request({
          method: 'GET',
          path: '/test',
        }),
      ).rejects.toThrow('Network error: Unable to reach SP-API');
    });

    it('should handle timeout errors', async () => {
      const error = new Error('Request timeout') as any;
      error.code = 'ETIMEDOUT';
      error.isAxiosError = true;

      // Mock axios.isAxiosError to recognize our test error
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      mockedAxios.mockRejectedValue(error);

      await expect(
        client.request({
          method: 'GET',
          path: '/test',
        }),
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('retry logic', () => {
    it('should retry on 429 errors', async () => {
      mockedAxios
        .mockResolvedValueOnce({
          status: 429,
          data: { errors: [{ message: 'Rate limit' }] },
          headers: {},
          statusText: 'Too Many Requests',
          config: {} as any,
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { payload: 'success' },
          headers: {},
          statusText: 'OK',
          config: {} as any,
        });

      const response = await client.request({
        method: 'GET',
        path: '/test',
      });

      expect(response.status).toBe(200);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 errors', async () => {
      mockedAxios
        .mockResolvedValueOnce({
          status: 503,
          data: { errors: [{ message: 'Service unavailable' }] },
          headers: {},
          statusText: 'Service Unavailable',
          config: {} as any,
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { payload: 'success' },
          headers: {},
          statusText: 'OK',
          config: {} as any,
        });

      const response = await client.request({
        method: 'GET',
        path: '/test',
      });

      expect(response.status).toBe(200);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 400 errors', async () => {
      mockedAxios.mockResolvedValue({
        status: 400,
        data: { errors: [{ message: 'Bad request' }] },
        headers: {},
        statusText: 'Bad Request',
        config: {} as any,
      });

      await expect(
        client.request({
          method: 'GET',
          path: '/test',
        }),
      ).rejects.toThrow(SPAPIRequestError);

      expect(mockedAxios).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after max retries', async () => {
      mockedAxios.mockResolvedValue({
        status: 503,
        data: { errors: [{ message: 'Service unavailable' }] },
        headers: {},
        statusText: 'Service Unavailable',
        config: {} as any,
      });

      await expect(
        client.request({
          method: 'GET',
          path: '/test',
        }),
      ).rejects.toThrow(SPAPIServerError);

      // 1 initial + 3 retries = 4 total
      expect(mockedAxios).toHaveBeenCalledTimes(4);
    });

    it('should use exponential backoff', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      // Mock setTimeout to track delays
      global.setTimeout = jest.fn((callback: any, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0) as any;
      }) as any;

      mockedAxios.mockResolvedValue({
        status: 503,
        data: { errors: [{ message: 'Service unavailable' }] },
        headers: {},
        statusText: 'Service Unavailable',
        config: {} as any,
      });

      try {
        await client.request({
          method: 'GET',
          path: '/test',
        });
      } catch (error) {
        // Expected to fail
      }

      // Should have delays: 1000ms, 2000ms, 4000ms (exponential backoff)
      expect(delays.length).toBeGreaterThan(0);
      expect(delays[0]).toBe(1000);
      if (delays.length > 1) expect(delays[1]).toBe(2000);
      if (delays.length > 2) expect(delays[2]).toBe(4000);

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('utility methods', () => {
    it('should return rate limiter', () => {
      const limiter = client.getRateLimiter();
      expect(limiter).toBe(mockRateLimiter);
    });

    it('should return marketplace ID', () => {
      expect(client.getMarketplaceId()).toBe('ATVPDKIKX0DER');
    });
  });
});
