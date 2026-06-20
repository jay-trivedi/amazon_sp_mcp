/**
 * MCP tools for the Amazon SP-API Orders v0 endpoints.
 *
 * Three tools are registered:
 *   - get_orders          — list orders in a date range (with optional status / marketplace filters)
 *   - get_order_details   — single order by Amazon Order ID
 *   - get_order_items     — line items for an order
 *
 * All three route through the SP-API rate-limit bucket key `orders` (1 req/min
 * per the SP-API docs) via the injected `SPAPIClient`.
 *
 * Tool handlers return a flattened response shape:
 *   { orders, nextToken }      for get_orders
 *   { order }                  for get_order_details (full payload)
 *   { orderItems, nextToken }  for get_order_items
 *
 * The SP-API's outer `payload` envelope is unwrapped inside the handlers so MCP
 * clients see only the data fields.
 *
 * The tool handlers are exported as named functions (`handleGetOrders`,
 * `handleGetOrderDetails`, `handleGetOrderItems`) so they can be unit-tested
 * directly without round-tripping through the MCP protocol. `registerOrderTools`
 * is a thin wrapper that wires them onto an `McpServer` via `registerTool`.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SPAPIClient } from '../utils/sp-api-client.js';
import { paginate } from '../utils/pagination.js';
import type { OrderItem } from '../types/sp-api.js';

const ORDER_STATUSES = [
  'Pending',
  'Unshipped',
  'PartiallyShipped',
  'Shipped',
  'Canceled',
  'Unfulfillable',
  'InvoiceUnconfirmed',
  'PendingAvailability',
] as const;

const isoDateTime = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(Date.parse(s)), {
    message: 'Must be a valid ISO 8601 timestamp',
  });

// --- Input shapes (inferred from the zod schemas) ---

export interface GetOrdersInput {
  startDate: string;
  endDate: string;
  orderStatuses?: (typeof ORDER_STATUSES)[number][];
  marketplaceIds?: string[];
  maxResultsPerPage?: number;
  nextToken?: string;
}

export interface GetOrderDetailsInput {
  orderId: string;
}

export interface GetOrderItemsInput {
  orderId: string;
  nextToken?: string;
}

// --- Tool config (description + inputSchema) ---

export const getOrdersToolConfig = {
  description:
    'List Amazon orders in a date range, optionally filtered by status and marketplace. ' +
    'Returns up to 100 orders per page; pass `nextToken` to fetch the next page. ' +
    'Pagination is capped at 100 pages (10,000 items) per call; narrow the date range to get more.',
  inputSchema: {
    startDate: isoDateTime.describe(
      'ISO 8601 lower bound for PurchaseDate (e.g. 2026-06-01T00:00:00Z).'
    ),
    endDate: isoDateTime.describe(
      'ISO 8601 upper bound. Must be strictly greater than startDate.'
    ),
    orderStatuses: z
      .array(z.enum(ORDER_STATUSES))
      .optional()
      .describe('Optional list of order statuses to filter by (e.g. ["Shipped", "Canceled"]).'),
    marketplaceIds: z
      .array(z.string())
      .optional()
      .describe('Optional list of marketplace IDs. Defaults to the configured marketplace.'),
    maxResultsPerPage: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(100)
      .describe('Max orders per page. Clamped to 1..100; default 100.'),
    nextToken: z
      .string()
      .optional()
      .describe('Continuation token from a previous call. Omit for the first page.'),
  },
} as const;

export const getOrderDetailsToolConfig = {
  description:
    'Get the full order payload for a single Amazon Order ID. ' +
    'Returns the complete order object including OrderStatus, OrderTotal, ShippingAddress, and FulfillmentData. ' +
    'Note: buyer name/address/phone are NOT included (those require the Tokens API and a Restricted Data Token).',
  inputSchema: {
    orderId: z
      .string()
      .min(1, 'orderId must not be empty')
      .describe('The Amazon Order ID (e.g. "026-1234567-8901234").'),
  },
} as const;

export const getOrderItemsToolConfig = {
  description:
    'Get the line items for a given Amazon Order ID, with optional pagination. ' +
    'Each item includes ASIN, SellerSKU, Title, QuantityOrdered, ItemPrice, etc. ' +
    'Pass the returned `nextToken` to fetch subsequent pages. ' +
    'Pagination is capped at 100 pages per call.',
  inputSchema: {
    orderId: z
      .string()
      .min(1, 'orderId must not be empty')
      .describe('The Amazon Order ID whose items should be listed.'),
    nextToken: z
      .string()
      .optional()
      .describe('Continuation token from a previous call. Omit for the first page.'),
  },
} as const;

// --- Handlers (testable directly) ---

/**
 * Run-time check for `endDate > startDate`. Returns a thrown Error if the
 * constraint is violated. Extracted so unit tests can assert on it without
 * going through the MCP protocol.
 */
export function assertDateRange(startDate: string, endDate: string): void {
  if (endDate <= startDate) {
    throw new Error(
      `endDate (${endDate}) must be strictly greater than startDate (${startDate}).`
    );
  }
}

/**
 * Adapt the SP-API order-items response shape to the `PaginatedResponse<T>`
 * expected by `paginate<T>`.
 */
function toPaginated<T>(response: { OrderItems?: T[]; NextToken?: string }): {
  data: T[];
  nextToken?: string;
} {
  return {
    data: response.OrderItems ?? [],
    nextToken: response.NextToken,
  };
}

/**
 * Handler for `get_orders`. Returns the MCP-shaped response
 * (`{ content: [{ type: 'text', text: JSON.stringify({ orders, nextToken }) }] }`).
 */
export async function handleGetOrders(
  args: GetOrdersInput,
  client: SPAPIClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  assertDateRange(args.startDate, args.endDate);

  const params = {
    CreatedAfter: args.startDate,
    CreatedBefore: args.endDate,
    OrderStatuses: args.orderStatuses,
    MarketplaceIds: args.marketplaceIds,
    MaxResultsPerPage: args.maxResultsPerPage,
    NextToken: args.nextToken,
  };

  const response = await client.getOrders(params);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            orders: response.Orders ?? [],
            nextToken: response.NextToken ?? null,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Handler for `get_order_details`. Returns the MCP-shaped response wrapping
 * the full SP-API order payload.
 */
export async function handleGetOrderDetails(
  args: GetOrderDetailsInput,
  client: SPAPIClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const order = await client.getOrder(args.orderId);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ order }, null, 2),
      },
    ],
  };
}

/**
 * Handler for `get_order_items`. Uses `paginate` to walk every page in
 * one pass (capped at 100 pages, i.e. 10k items max). The first call uses
 * `args.nextToken` so callers can resume from a previous response.
 */
export async function handleGetOrderItems(
  args: GetOrderItemsInput,
  client: SPAPIClient
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const collected: OrderItem[] = [];
  let lastToken: string | undefined = args.nextToken;

  const iterator = paginate<OrderItem>(
    async (token) => {
      const response = await client.getOrderItems(args.orderId, { NextToken: token });
      lastToken = response.NextToken;
      return toPaginated(response);
    },
    { maxPages: 100 }
  );

  for await (const item of iterator) {
    collected.push(item);
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            orderItems: collected,
            nextToken: lastToken ?? null,
          },
          null,
          2
        ),
      },
    ],
  };
}

// --- Registration (the only thing `src/index.ts` calls) ---

/**
 * Register the three Orders tools on the given `McpServer`.
 *
 * @param server - The MCP server instance.
 * @param client - The SP-API client (must already have valid credentials wired).
 */
export function registerOrderTools(server: McpServer, client: SPAPIClient): void {
  server.registerTool('get_orders', getOrdersToolConfig, (args) =>
    handleGetOrders(args as GetOrdersInput, client)
  );

  server.registerTool('get_order_details', getOrderDetailsToolConfig, (args) =>
    handleGetOrderDetails(args as GetOrderDetailsInput, client)
  );

  server.registerTool('get_order_items', getOrderItemsToolConfig, (args) =>
    handleGetOrderItems(args as GetOrderItemsInput, client)
  );
}
