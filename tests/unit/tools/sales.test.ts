/**
 * Unit tests for the Orders tool handlers.
 *
 * Tests the handler functions exported from `src/tools/sales.ts` directly
 * (rather than going through the MCP protocol). The MCP wiring
 * (`server.registerTool`) is exercised in the integration test in
 * `tests/integration/orders-flow.test.ts`.
 *
 * The handlers are imported dynamically after `jest.unstable_mockModule`
 * replaces the `SPAPIClient` import. This is the ESM-friendly pattern
 * established in the modernization change.
 */

import { jest } from '@jest/globals';

const mockGetOrders = jest.fn();
const mockGetOrder = jest.fn();
const mockGetOrderItems = jest.fn();

jest.unstable_mockModule('../../../src/utils/sp-api-client.js', () => ({
  SPAPIClient: class FakeSPAPIClient {
    getOrders = mockGetOrders;
    getOrder = mockGetOrder;
    getOrderItems = mockGetOrderItems;
  },
}));

const { handleGetOrders, handleGetOrderDetails, handleGetOrderItems, assertDateRange, registerOrderTools } =
  await import('../../../src/tools/sales.js');

function fakeClient(): unknown {
  return {
    getOrders: mockGetOrders,
    getOrder: mockGetOrder,
    getOrderItems: mockGetOrderItems,
  };
}

function parseText(result: { content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse(result.content[0]!.text);
}

describe('assertDateRange', () => {
  it('does not throw when endDate is strictly greater than startDate', () => {
    expect(() => assertDateRange('2026-06-01T00:00:00Z', '2026-06-19T23:59:59Z')).not.toThrow();
  });

  it('throws when endDate equals startDate', () => {
    expect(() => assertDateRange('2026-06-01T00:00:00Z', '2026-06-01T00:00:00Z')).toThrow(
      /strictly greater/
    );
  });

  it('throws when endDate is before startDate', () => {
    expect(() => assertDateRange('2026-06-19T00:00:00Z', '2026-06-01T00:00:00Z')).toThrow(
      /strictly greater/
    );
  });
});

describe('handleGetOrders', () => {
  beforeEach(() => {
    mockGetOrders.mockReset();
    mockGetOrder.mockReset();
    mockGetOrderItems.mockReset();
  });

  it('passes the date range, statuses, marketplace, page size, and nextToken through to the client', async () => {
    mockGetOrders.mockResolvedValue({
      Orders: [
        {
          AmazonOrderId: '026-1111111-1111111',
          OrderStatus: 'Shipped',
          MarketplaceId: 'ATVPDKIKX0DER',
        },
      ],
      NextToken: 'next-tok',
    });

    const result = await handleGetOrders(
      {
        startDate: '2026-06-01T00:00:00Z',
        endDate: '2026-06-19T23:59:59Z',
        orderStatuses: ['Shipped', 'Canceled'],
        marketplaceIds: ['ATVPDKIKX0DER'],
        maxResultsPerPage: 50,
        nextToken: 'incoming-tok',
      },
      fakeClient() as never
    );

    expect(mockGetOrders).toHaveBeenCalledWith({
      CreatedAfter: '2026-06-01T00:00:00Z',
      CreatedBefore: '2026-06-19T23:59:59Z',
      OrderStatuses: ['Shipped', 'Canceled'],
      MarketplaceIds: ['ATVPDKIKX0DER'],
      MaxResultsPerPage: 50,
      NextToken: 'incoming-tok',
    });

    const body = parseText(result) as { orders: unknown[]; nextToken: string | null };
    expect(body.orders).toHaveLength(1);
    expect(body.nextToken).toBe('next-tok');
  });

  it('returns an empty list and null nextToken when the SP-API response has no orders and no token', async () => {
    mockGetOrders.mockResolvedValue({ Orders: [], NextToken: undefined });

    const result = await handleGetOrders(
      {
        startDate: '2026-06-01T00:00:00Z',
        endDate: '2026-06-19T23:59:59Z',
      },
      fakeClient() as never
    );

    const body = parseText(result) as { orders: unknown[]; nextToken: string | null };
    expect(body.orders).toEqual([]);
    expect(body.nextToken).toBeNull();
  });

  it('throws when endDate is before or equal to startDate without calling the client', async () => {
    await expect(
      handleGetOrders(
        { startDate: '2026-06-19T00:00:00Z', endDate: '2026-06-01T00:00:00Z' },
        fakeClient() as never
      )
    ).rejects.toThrow(/strictly greater/);
    expect(mockGetOrders).not.toHaveBeenCalled();
  });
});

describe('handleGetOrderDetails', () => {
  beforeEach(() => {
    mockGetOrders.mockReset();
    mockGetOrder.mockReset();
    mockGetOrderItems.mockReset();
  });

  it('returns the order payload under `{ order }`', async () => {
    const order = {
      AmazonOrderId: '026-2222222-2222222',
      OrderStatus: 'Shipped',
      OrderTotal: { Amount: '49.99', CurrencyCode: 'USD' },
    };
    mockGetOrder.mockResolvedValue(order);

    const result = await handleGetOrderDetails({ orderId: '026-2222222-2222222' }, fakeClient() as never);

    expect(mockGetOrder).toHaveBeenCalledWith('026-2222222-2222222');

    const body = parseText(result) as { order: typeof order };
    expect(body.order).toEqual(order);
  });
});

describe('handleGetOrderItems', () => {
  beforeEach(() => {
    mockGetOrders.mockReset();
    mockGetOrder.mockReset();
    mockGetOrderItems.mockReset();
  });

  it('returns a single page of items and null nextToken when no pagination is needed', async () => {
    const items = [
      {
        ASIN: 'B08XYZ12345',
        SellerSKU: 'ABC-001-RED',
        OrderItemId: 'item-1',
        Title: 'Example Widget Pro',
        QuantityOrdered: 1,
      },
    ];
    mockGetOrderItems.mockResolvedValue({
      AmazonOrderId: '026-1234567-8901234',
      OrderItems: items,
      NextToken: undefined,
    });

    const result = await handleGetOrderItems(
      { orderId: '026-1234567-8901234' },
      fakeClient() as never
    );

    expect(mockGetOrderItems).toHaveBeenCalledTimes(1);
    expect(mockGetOrderItems).toHaveBeenCalledWith('026-1234567-8901234', { NextToken: undefined });

    const body = parseText(result) as { orderItems: unknown[]; nextToken: string | null };
    expect(body.orderItems).toEqual(items);
    expect(body.nextToken).toBeNull();
  });

  it('returns an empty array when the order has no items', async () => {
    mockGetOrderItems.mockResolvedValue({
      AmazonOrderId: '026-empty',
      OrderItems: [],
      NextToken: undefined,
    });

    const result = await handleGetOrderItems({ orderId: '026-empty' }, fakeClient() as never);

    const body = parseText(result) as { orderItems: unknown[]; nextToken: string | null };
    expect(body.orderItems).toEqual([]);
    expect(body.nextToken).toBeNull();
  });

  it('walks multi-page responses by calling the client once per page', async () => {
    const page1 = [
      { OrderItemId: 'i-1', ASIN: 'A-1' },
      { OrderItemId: 'i-2', ASIN: 'A-2' },
    ];
    const page2 = [
      { OrderItemId: 'i-3', ASIN: 'A-3' },
    ];
    const page3 = [
      { OrderItemId: 'i-4', ASIN: 'A-4' },
    ];

    mockGetOrderItems
      .mockResolvedValueOnce({
        AmazonOrderId: '026-multi',
        OrderItems: page1,
        NextToken: 'page2-tok',
      })
      .mockResolvedValueOnce({
        AmazonOrderId: '026-multi',
        OrderItems: page2,
        NextToken: 'page3-tok',
      })
      .mockResolvedValueOnce({
        AmazonOrderId: '026-multi',
        OrderItems: page3,
        NextToken: undefined,
      });

    const result = await handleGetOrderItems({ orderId: '026-multi' }, fakeClient() as never);

    expect(mockGetOrderItems).toHaveBeenCalledTimes(3);
    expect(mockGetOrderItems.mock.calls[0]?.[1]).toEqual({ NextToken: undefined });
    expect(mockGetOrderItems.mock.calls[1]?.[1]).toEqual({ NextToken: 'page2-tok' });
    expect(mockGetOrderItems.mock.calls[2]?.[1]).toEqual({ NextToken: 'page3-tok' });

    const body = parseText(result) as { orderItems: Array<{ OrderItemId: string }>; nextToken: string | null };
    expect(body.orderItems.map((i) => i.OrderItemId)).toEqual(['i-1', 'i-2', 'i-3', 'i-4']);
    expect(body.nextToken).toBeNull();
  });
});

describe('registerOrderTools', () => {
  it('registers exactly three tools named get_orders, get_order_details, get_order_items on the server', () => {
    const registered: Array<{ name: string; config: unknown; handler: unknown }> = [];
    const fakeServer = {
      registerTool: (
        name: string,
        config: unknown,
        handler: unknown
      ): void => {
        registered.push({ name, config, handler });
      },
    };

    registerOrderTools(fakeServer as never, fakeClient() as never);

    expect(registered.map((r) => r.name)).toEqual([
      'get_orders',
      'get_order_details',
      'get_order_items',
    ]);
  });
});
