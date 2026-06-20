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

/**
 * Money type used throughout SP-API order/financial payloads.
 */
export interface Money {
  Amount: string;
  CurrencyCode: string;
}

/**
 * Address subset returned on the order (no PII beyond the basics).
 */
export interface Address {
  Name?: string;
  AddressLine1?: string;
  AddressLine2?: string;
  AddressLine3?: string;
  City?: string;
  County?: string;
  District?: string;
  StateOrRegion?: string;
  PostalCode?: string;
  CountryCode?: string;
  Phone?: string;
}

/**
 * Order statuses (Orders v0 API).
 */
export type OrderStatus =
  | 'Pending'
  | 'Unshipped'
  | 'PartiallyShipped'
  | 'Shipped'
  | 'Canceled'
  | 'Unfulfillable'
  | 'InvoiceUnconfirmed'
  | 'PendingAvailability';

/**
 * Fulfillment channel.
 */
export type FulfillmentChannel = 'MFN' | 'AFN';

/**
 * Order object (Orders v0 API).
 * Fields are a subset of the SP-API response; the tool returns this shape.
 */
export interface Order {
  AmazonOrderId: string;
  SellerOrderId?: string;
  PurchaseDate: string;
  LastUpdateDate: string;
  OrderStatus: OrderStatus;
  FulfillmentChannel?: FulfillmentChannel;
  SalesChannel?: string;
  OrderChannel?: string;
  ShipServiceLevel?: string;
  NumberOfItemsShipped?: number;
  NumberOfItemsUnshipped?: number;
  PaymentMethod?: string;
  PaymentMethodDetails?: string[];
  MarketplaceId: string;
  ShipmentServiceLevelCategory?: string;
  OrderType?: string;
  EarliestShipDate?: string;
  LatestShipDate?: string;
  EarliestDeliveryDate?: string;
  LatestDeliveryDate?: string;
  OrderTotal?: Money;
  ShippingAddress?: Address;
  IsBusinessOrder?: boolean;
  IsPrime?: boolean;
  IsGlobalExpressEnabled?: boolean;
  IsReplacementOrder?: boolean;
  IsSoldByAB?: boolean;
  IsIBA?: boolean;
}

/**
 * Order Items v0 API — single line item.
 */
export interface OrderItem {
  ASIN?: string;
  SellerSKU?: string;
  OrderItemId: string;
  Title?: string;
  QuantityOrdered: number;
  QuantityShipped?: number;
  ItemPrice?: Money;
  ShippingPrice?: Money;
  ItemTax?: Money;
  ShippingTax?: Money;
  ShippingDiscount?: Money;
  ShippingDiscountTax?: Money;
  PromotionDiscount?: Money;
  PromotionDiscountTax?: Money;
  PromotionIds?: string[];
  IsGift?: boolean;
  ConditionNote?: string;
  ConditionId?: string;
  ConditionSubtypeId?: string;
  ScheduledDeliveryShipDate?: string;
  ScheduledDeliveryEndDate?: string;
  PriceDesignation?: string;
}

/**
 * Orders v0 list endpoint — response payload fields we surface.
 */
export interface OrdersListResponse {
  Orders: Order[];
  NextToken?: string;
}

/**
 * Orders v0 order-items endpoint — response payload fields we surface.
 */
export interface OrderItemsListResponse {
  AmazonOrderId: string;
  OrderItems: OrderItem[];
  NextToken?: string;
}

/**
 * Query parameters accepted by `GET /orders/v0/orders`.
 * All fields are optional except the date range.
 */
export interface GetOrdersParams {
  CreatedAfter?: string;
  CreatedBefore?: string;
  LastUpdatedAfter?: string;
  LastUpdatedBefore?: string;
  OrderStatuses?: OrderStatus[];
  MarketplaceIds?: string[];
  FulfillmentChannels?: FulfillmentChannel[];
  PaymentMethods?: string[];
  BuyerEmail?: string;
  SellerOrderId?: string;
  MaxResultsPerPage?: number;
  NextToken?: string;
  EasyShipShipmentStatuses?: string[];
}

/**
 * Query parameters accepted by `GET /orders/v0/orders/{orderId}/orderItems`.
 */
export interface GetOrderItemsParams {
  NextToken?: string;
}
