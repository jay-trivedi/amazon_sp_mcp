/**
 * Unit tests for the SP-API Orders methods added in Phase 1.5:
 * `getOrders`, `getOrder`, `getOrderItems`.
 *
 * Mocks axios to capture the outgoing request URL, query string, and
 * path, and asserts that all parameter branches in the new methods
 * build the URL correctly. Targets branch coverage of the new methods
 * (param-conditional branches) and the `payload` unwrap path.
 */

import { jest } from '@jest/globals';
import type { AxiosResponse } from 'axios';

const mockAxios = jest.fn();
const mockIsAxiosError = jest.fn(() => false);

jest.unstable_mockModule('axios', () => ({
  __esModule: true,
  default: mockAxios,
  isAxiosError: mockIsAxiosError,
}));

const mockGetAccessToken = jest.fn(async () => 'fake-access-token');

jest.unstable_mockModule('../../../src/auth/token-manager.js', () => ({
  TokenManager: class MockTokenManager {
    getAccessToken = mockGetAccessToken;
    clearCache = jest.fn();
    hasCachedToken = jest.fn();
  },
}));

function makeAxiosResponse(body: unknown, status = 200): AxiosResponse {
  return {
    data: body,
    status,
    statusText: 'OK',
    headers: {} as AxiosResponse['headers'],
    config: {} as AxiosResponse['config'],
  };
}

describe('SPAPIClient Orders methods', () => {
  let client: import('../../../src/utils/sp-api-client.js').SPAPIClient;
  let RateLimiter: typeof import('../../../src/utils/rate-limiter.js').RateLimiter;
  let RateLimitConfig: typeof import('../../../src/utils/rate-limiter.js').RateLimitConfig;

  beforeAll(async () => {
    ({ RateLimiter, RateLimitConfig } = await import('../../../src/utils/rate-limiter.js'));
  });

  beforeEach(() => {
    mockAxios.mockReset();
    mockIsAxiosError.mockReset();
    mockIsAxiosError.mockReturnValue(false);

    const { SPAPIClient } = jest.requireMock<typeof import('../../../src/utils/sp-api-client.js')>(
      '../../../src/utils/sp-api-client.js'
    ) as never;

    // Construct via the real class; jest.unstable_mockModule is in scope
    void SPAPIClient;
  });

  beforeEach(async () => {
    const { SPAPIClient } = await import('../../../src/utils/sp-api-client.js');
    const rateLimiter = new RateLimiter(
      new Map<string, RateLimitConfig>([
        ['orders', { maxRequests: 100, windowMs: 1000, queueRequests: true, disabled: true }],
      ])
    );
    client = new SPAPIClient({
      endpoint: 'https://sellingpartnerapi-na.amazon.com',
      marketplaceId: 'ATVPDKIKX0DER',
      awsCredentials: {
        accessKeyId: 'AKIA',
        secretAccessKey: 'secret',
        region: 'us-east-1',
      },
      tokenManager: {
        getAccessToken: mockGetAccessToken,
        clearCache: jest.fn(),
        hasCachedToken: jest.fn(),
      } as never,
      rateLimiter,
    });
  });

  describe('getOrders', () => {
    it('uses the configured marketplace as the default MarketplaceIds when none is provided', async () => {
      mockAxios.mockResolvedValue(
        makeAxiosResponse({ payload: { Orders: [], NextToken: undefined } })
      );

      await client.getOrders({
        CreatedAfter: '2026-06-01T00:00:00Z',
        CreatedBefore: '2026-06-19T23:59:59Z',
      });

      const call = mockAxios.mock.calls[0]?.[0] as { url: string };
      expect(call.url).toContain('MarketplaceIds=ATVPDKIKX0DER');
    });

    it('passes the explicit MarketplaceIds when provided', async () => {
      mockAxios.mockResolvedValue(
        makeAxiosResponse({ payload: { Orders: [], NextToken: undefined } })
      );

      await client.getOrders({
        CreatedAfter: '2026-06-01T00:00:00Z',
        CreatedBefore: '2026-06-19T23:59:59Z',
        MarketplaceIds: ['A1', 'A2'],
      });

      const call = mockAxios.mock.calls[0]?.[0] as { url: string };
      expect(call.url).toContain('MarketplaceIds=A1%2CA2');
    });

    it('omits OrderStatuses when the array is empty', async () => {
      mockAxios.mockResolvedValue(
        makeAxiosResponse({ payload: { Orders: [], NextToken: undefined } })
      );

      await client.getOrders({
        CreatedAfter: '2026-06-01T00:00:00Z',
        CreatedBefore: '2026-06-19T23:59:59Z',
        OrderStatuses: [],
      });

      const call = mockAxios.mock.calls[0]?.[0] as { url: string };
      expect(call.url).not.toContain('OrderStatuses');
    });

    it('serializes OrderStatuses as comma-separated', async () => {
      mockAxios.mockResolvedValue(
        makeAxiosResponse({ payload: { Orders: [], NextToken: undefined } })
      );

      await client.getOrders({
        CreatedAfter: '2026-06-01T00:00:00Z',
        CreatedBefore: '2026-06-19T23:59:59Z',
        OrderStatuses: ['Shipped', 'Canceled'],
      });

      const call = mockAxios.mock.calls[0]?.[0] as { url: string };
      expect(call.url).toContain('OrderStatuses=Shipped%2CCanceled');
    });

    it('includes all the optional query parameters when provided', async () => {
      mockAxios.mockResolvedValue(
        makeAxiosResponse({ payload: { Orders: [], NextToken: undefined } })
      );

      await client.getOrders({
        CreatedAfter: '2026-06-01T00:00:00Z',
        CreatedBefore: '2026-06-19T23:59:59Z',
        LastUpdatedAfter: '2026-06-15T00:00:00Z',
        LastUpdatedBefore: '2026-06-19T23:59:59Z',
        FulfillmentChannels: ['AFN', 'MFN'],
        PaymentMethods: ['Other'],
        BuyerEmail: 'buyer@example.com',
        SellerOrderId: 'seller-1',
        MaxResultsPerPage: 50,
        NextToken: 'tok',
        EasyShipShipmentStatuses: ['PendingPickUp'],
      });

      const call = mockAxios.mock.calls[0]?.[0] as { url: string };
      const url = call.url;
      expect(url).toContain('CreatedAfter=2026-06-01T00%3A00%3A00Z');
      expect(url).toContain('LastUpdatedAfter=2026-06-15T00%3A00%3A00Z');
      expect(url).toContain('FulfillmentChannels=AFN%2CMFN');
      expect(url).toContain('PaymentMethods=Other');
      expect(url).toContain('BuyerEmail=buyer%40example.com');
      expect(url).toContain('SellerOrderId=seller-1');
      expect(url).toContain('MaxResultsPerPage=50');
      expect(url).toContain('NextToken=tok');
      expect(url).toContain('EasyShipShipmentStatuses=PendingPickUp');
    });

    it('returns the unwrapped payload', async () => {
      mockAxios.mockResolvedValue(
        makeAxiosResponse({
          payload: {
            Orders: [{ AmazonOrderId: '026-1', OrderStatus: 'Shipped' }],
            NextToken: 'next',
          },
        })
      );

      const result = await client.getOrders({
        CreatedAfter: '2026-06-01T00:00:00Z',
        CreatedBefore: '2026-06-19T23:59:59Z',
      });

      expect(result.Orders).toHaveLength(1);
      expect(result.Orders[0]?.AmazonOrderId).toBe('026-1');
      expect(result.NextToken).toBe('next');
    });
  });

  describe('getOrder', () => {
    it('uses the orders path with the URL-encoded orderId', async () => {
      mockAxios.mockResolvedValue(
        makeAxiosResponse({
          payload: { AmazonOrderId: '026-X/1', OrderStatus: 'Shipped' },
        })
      );

      const result = await client.getOrder('026-X/1');

      const call = mockAxios.mock.calls[0]?.[0] as { url: string };
      expect(call.url).toContain('/orders/v0/orders/026-X%2F1');
      expect(result.AmazonOrderId).toBe('026-X/1');
    });
  });

  describe('getOrderItems', () => {
    it('appends the orderItems sub-path and includes NextToken when provided', async () => {
      mockAxios.mockResolvedValue(
        makeAxiosResponse({
          payload: {
            AmazonOrderId: '026-1',
            OrderItems: [{ OrderItemId: 'i-1' }],
            NextToken: undefined,
          },
        })
      );

      await client.getOrderItems('026-1', { NextToken: 'tok' });

      const call = mockAxios.mock.calls[0]?.[0] as { url: string };
      expect(call.url).toContain('/orders/v0/orders/026-1/orderItems');
      expect(call.url).toContain('NextToken=tok');
    });

    it('omits NextToken from the query string when undefined', async () => {
      mockAxios.mockResolvedValue(
        makeAxiosResponse({
          payload: { AmazonOrderId: '026-1', OrderItems: [] },
        })
      );

      await client.getOrderItems('026-1');

      const call = mockAxios.mock.calls[0]?.[0] as { url: string };
      expect(call.url).not.toContain('NextToken');
    });
  });
});
