/**
 * Integration tests for the Orders tool flow.
 *
 * Uses `nock` to mock the SP-API HTTP layer (per design D7) and a
 * `disabled: true` rate limiter (per Section 7) so the multi-page test
 * doesn't wait 60s per call.
 *
 * Exercises the full pipeline: `SPAPIClient.getOrders` →
 * `request<{ payload }>` → AWS signing → nock interceptor → response
 * → tool handler → `{ content: [{ type: 'text', text: JSON }] }`.
 */

import { jest } from '@jest/globals';
import nock from 'nock';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { SPAPIClient } from '../../src/utils/sp-api-client.js';
import { TokenManager } from '../../src/auth/token-manager.js';
import { CredentialsManager } from '../../src/auth/credentials.js';
import { RateLimiter, RateLimitConfig } from '../../src/utils/rate-limiter.js';
import { handleGetOrders, handleGetOrderDetails, handleGetOrderItems } from '../../src/tools/sales.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = resolve(__dirname, '../fixtures');

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf-8')) as unknown;
}

function makeRateLimiter(): RateLimiter {
  return new RateLimiter(
    new Map<string, RateLimitConfig>([
      ['orders', { maxRequests: 1, windowMs: 60_000, queueRequests: true, disabled: true }],
    ])
  );
}

function makeClient(): {
  client: SPAPIClient;
  credManager: CredentialsManager;
  tokenManager: TokenManager;
} {
  const credManager = new CredentialsManager();
  const config = credManager.getSPAPIConfig();
  const tokenManager = new TokenManager(credManager.getLWACredentials());
  const client = new SPAPIClient({
    endpoint: config.endpoint,
    marketplaceId: config.marketplaceId,
    awsCredentials: credManager.getAWSCredentials(),
    tokenManager,
    rateLimiter: makeRateLimiter(),
  });
  return { client, credManager, tokenManager };
}

function parseText(result: { content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse(result.content[0]!.text);
}

describe('Orders flow integration', () => {
  let client: SPAPIClient;

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    nock.cleanAll();
    // LWA token endpoint — used by every SP-API call
    nock('https://api.amazon.com')
      .post('/auth/o2/token')
      .reply(200, {
        access_token: 'Atza|integration_access_token',
        token_type: 'bearer',
        expires_in: 3600,
      })
      .persist();
    ({ client } = makeClient());
  });

  afterEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  describe('get_orders', () => {
    it('returns the flattened orders list from a single-page response', async () => {
      const fixture = readFixture('orders.json') as { payload: unknown };
      // Drop the `NextToken` so nock returns a single-page response
      const singlePage = { ...fixture, payload: { ...(fixture.payload as object) } };
      delete (singlePage.payload as Record<string, unknown>).NextToken;

      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders')
        .query((q) => typeof q.CreatedAfter === 'string' && typeof q.CreatedBefore === 'string')
        .reply(200, singlePage);

      const result = await handleGetOrders(
        {
          startDate: '2026-06-01T00:00:00Z',
          endDate: '2026-06-19T23:59:59Z',
        },
        client
      );

      const body = parseText(result) as { orders: unknown[]; nextToken: string | null };
      expect(body.orders).toHaveLength(3);
      expect(body.nextToken).toBeNull();
    });

    it('returns the first page of a multi-page response and surfaces the nextToken for caller-side pagination', async () => {
      const page1 = readFixture('orders.json');
      const page2 = readFixture('orders-page2.json');

      // First call (no nextToken in args): returns page 1 with a nextToken
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders')
        .query((q) => !q.NextToken)
        .reply(200, page1);

      // Second call (caller passes the returned nextToken): returns page 2 with no token
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders')
        .query((q) => q.NextToken === 'page2-token-abc')
        .reply(200, page2);

      // First call: returns 3 orders + the nextToken
      const first = await handleGetOrders(
        {
          startDate: '2026-06-01T00:00:00Z',
          endDate: '2026-06-19T23:59:59Z',
        },
        client
      );
      const firstBody = parseText(first) as { orders: unknown[]; nextToken: string | null };
      expect(firstBody.orders).toHaveLength(3);
      expect(firstBody.nextToken).toBe('page2-token-abc');

      // Second call: caller passes the nextToken back, gets the second page
      const second = await handleGetOrders(
        {
          startDate: '2026-06-01T00:00:00Z',
          endDate: '2026-06-19T23:59:59Z',
          nextToken: firstBody.nextToken as string,
        },
        client
      );
      const secondBody = parseText(second) as { orders: unknown[]; nextToken: string | null };
      expect(secondBody.orders).toHaveLength(2);
      expect(secondBody.nextToken).toBeNull();
    });
  });

  describe('get_order_details', () => {
    it('returns the full order payload under `{ order }`', async () => {
      const ordersFixture = readFixture('orders.json') as { payload: { Orders: Array<Record<string, unknown>> } };
      const sampleOrder = ordersFixture.payload.Orders[0]!;

      nock('https://sellingpartnerapi-na.amazon.com')
        .get(`/orders/v0/orders/${encodeURIComponent(sampleOrder.AmazonOrderId as string)}`)
        .reply(200, { payload: sampleOrder });

      const result = await handleGetOrderDetails(
        { orderId: sampleOrder.AmazonOrderId as string },
        client
      );

      const body = parseText(result) as { order: Record<string, unknown> };
      expect(body.order.AmazonOrderId).toBe(sampleOrder.AmazonOrderId);
      expect(body.order.OrderStatus).toBe(sampleOrder.OrderStatus);
    });
  });

  describe('get_order_items', () => {
    it('returns a single page of items when no NextToken is present', async () => {
      const itemsFixture = readFixture('orders-items.json') as {
        payload: { OrderItems: Array<Record<string, unknown>>; NextToken?: string };
      };
      const singlePage = { payload: { ...itemsFixture.payload } };
      delete singlePage.payload.NextToken;

      nock('https://sellingpartnerapi-na.amazon.com')
        .get(/\/orders\/v0\/orders\/[^/]+\/orderItems/)
        .reply(200, singlePage);

      const result = await handleGetOrderItems(
        { orderId: '026-1234567-8901234' },
        client
      );

      const body = parseText(result) as { orderItems: unknown[]; nextToken: string | null };
      expect(body.orderItems).toHaveLength(2);
      expect(body.nextToken).toBeNull();
    });
  });
});
