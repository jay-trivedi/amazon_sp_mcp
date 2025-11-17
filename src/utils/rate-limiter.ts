/**
 * Rate limiter using token bucket algorithm
 * Prevents exceeding Amazon SP-API rate limits
 */

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed per time window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Whether to queue requests when rate limit is exceeded
   * If false, throws error immediately
   */
  queueRequests?: boolean;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Token bucket rate limiter
 *
 * Amazon SP-API has different rate limits per endpoint:
 * - Orders API: 0.0167 requests/second (1 request per minute)
 * - Inventory API: 2 requests/second
 * - Reports API: 0.0222 requests/second (1 request per 45 seconds)
 *
 * This limiter allows configuring different limits per endpoint.
 */
export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private queue: Array<{
    key: string;
    resolve: () => void;
    enqueueTime: number;
  }> = [];
  private processingQueue = false;

  constructor(private configs: Map<string, RateLimitConfig>) {}

  /**
   * Wait for rate limit token to become available
   *
   * @param key - Identifier for the rate limit bucket (e.g., endpoint name)
   * @throws Error if key doesn't have a configured rate limit
   */
  async acquire(key: string): Promise<void> {
    const config = this.configs.get(key);
    if (!config) {
      throw new Error(`No rate limit configuration found for key: ${key}`);
    }

    const bucket = this.getOrCreateBucket(key, config);
    this.refillBucket(bucket, config);

    // If tokens available, consume one and return immediately
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return;
    }

    // If queueing is disabled, throw error
    if (config.queueRequests === false) {
      const waitTime = this.calculateWaitTime(bucket, config);
      throw new Error(
        `Rate limit exceeded for ${key}. Wait ${Math.ceil(waitTime / 1000)}s before retrying.`
      );
    }

    // Queue the request
    return new Promise<void>((resolve) => {
      this.queue.push({
        key,
        resolve,
        enqueueTime: Date.now(),
      });
      this.processQueue();
    });
  }

  /**
   * Get current token count for a bucket
   */
  getAvailableTokens(key: string): number {
    const config = this.configs.get(key);
    if (!config) {
      return 0;
    }

    const bucket = this.buckets.get(key);
    if (!bucket) {
      return config.maxRequests;
    }

    this.refillBucket(bucket, config);
    return Math.floor(bucket.tokens);
  }

  /**
   * Reset all rate limit buckets (useful for testing)
   */
  reset(): void {
    this.buckets.clear();
    this.queue = [];
    this.processingQueue = false;
  }

  private getOrCreateBucket(key: string, config: RateLimitConfig): TokenBucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: config.maxRequests,
        lastRefill: Date.now(),
      };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  private refillBucket(bucket: TokenBucket, config: RateLimitConfig): void {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / config.windowMs) * config.maxRequests;

    bucket.tokens = Math.min(config.maxRequests, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  private calculateWaitTime(bucket: TokenBucket, config: RateLimitConfig): number {
    const tokensNeeded = 1 - bucket.tokens;
    return (tokensNeeded / config.maxRequests) * config.windowMs;
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue) {
      return;
    }

    this.processingQueue = true;

    while (this.queue.length > 0) {
      const request = this.queue[0];
      if (!request) {
        // Should never happen, but satisfy TypeScript
        this.queue.shift();
        continue;
      }

      const config = this.configs.get(request.key);
      if (!config) {
        // Remove invalid request
        this.queue.shift();
        request.resolve();
        continue;
      }

      const bucket = this.getOrCreateBucket(request.key, config);
      this.refillBucket(bucket, config);

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        this.queue.shift();
        request.resolve();
      } else {
        // Wait for tokens to refill
        const waitTime = this.calculateWaitTime(bucket, config);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.processingQueue = false;
  }
}

/**
 * Default rate limit configurations for SP-API endpoints
 * Based on Amazon SP-API documentation
 */
export const DEFAULT_RATE_LIMITS: Map<string, RateLimitConfig> = new Map([
  // Orders API: 1 request per minute
  [
    'orders',
    {
      maxRequests: 1,
      windowMs: 60 * 1000,
      queueRequests: true,
    },
  ],
  // Inventory API: 2 requests per second
  [
    'inventory',
    {
      maxRequests: 2,
      windowMs: 1000,
      queueRequests: true,
    },
  ],
  // Reports API: 1 request per 45 seconds
  [
    'reports',
    {
      maxRequests: 1,
      windowMs: 45 * 1000,
      queueRequests: true,
    },
  ],
  // Products API: 5 requests per second
  [
    'products',
    {
      maxRequests: 5,
      windowMs: 1000,
      queueRequests: true,
    },
  ],
  // Default fallback: 1 request per second
  [
    'default',
    {
      maxRequests: 1,
      windowMs: 1000,
      queueRequests: true,
    },
  ],
]);
