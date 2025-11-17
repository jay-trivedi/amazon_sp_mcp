import {
  RateLimiter,
  RateLimitConfig,
  DEFAULT_RATE_LIMITS,
} from '../../../src/utils/rate-limiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    // Create fresh rate limiter for each test
    const configs = new Map<string, RateLimitConfig>([
      [
        'test',
        {
          maxRequests: 2,
          windowMs: 1000, // 1 second
          queueRequests: true,
        },
      ],
      [
        'fast',
        {
          maxRequests: 10,
          windowMs: 1000,
          queueRequests: true,
        },
      ],
      [
        'no-queue',
        {
          maxRequests: 1,
          windowMs: 1000,
          queueRequests: false,
        },
      ],
    ]);
    rateLimiter = new RateLimiter(configs);
  });

  afterEach(() => {
    rateLimiter.reset();
    // Clear any pending timers
    jest.clearAllTimers();
  });

  describe('acquire', () => {
    it('should allow requests within rate limit', async () => {
      await rateLimiter.acquire('test');
      await rateLimiter.acquire('test');
      // Both requests should succeed immediately
      expect(rateLimiter.getAvailableTokens('test')).toBe(0);
    });

    it('should throw error for unknown key', async () => {
      await expect(rateLimiter.acquire('unknown')).rejects.toThrow(
        'No rate limit configuration found for key: unknown',
      );
    });

    it('should queue requests when limit exceeded', async () => {
      const startTime = Date.now();

      // Use up the 2 tokens
      await rateLimiter.acquire('test');
      await rateLimiter.acquire('test');

      // Third request should be queued and wait
      await rateLimiter.acquire('test');

      const elapsed = Date.now() - startTime;
      // Should have waited for refill (allow timing tolerance)
      expect(elapsed).toBeGreaterThanOrEqual(500); // More lenient tolerance
    });

    it('should throw error immediately when queueing disabled', async () => {
      // Use up the 1 token
      await rateLimiter.acquire('no-queue');

      // Second request should throw immediately
      await expect(rateLimiter.acquire('no-queue')).rejects.toThrow(
        'Rate limit exceeded for no-queue',
      );
    });

    it('should handle concurrent requests', async () => {
      const promises = [
        rateLimiter.acquire('fast'),
        rateLimiter.acquire('fast'),
        rateLimiter.acquire('fast'),
        rateLimiter.acquire('fast'),
        rateLimiter.acquire('fast'),
      ];

      // All 5 requests should succeed (limit is 10)
      await expect(Promise.all(promises)).resolves.toBeDefined();
      expect(rateLimiter.getAvailableTokens('fast')).toBe(5);
    });

    it('should handle multiple buckets independently', async () => {
      // Use test bucket
      await rateLimiter.acquire('test');
      expect(rateLimiter.getAvailableTokens('test')).toBe(1);

      // Use fast bucket
      await rateLimiter.acquire('fast');
      expect(rateLimiter.getAvailableTokens('fast')).toBe(9);

      // Test bucket should still have 1 token
      expect(rateLimiter.getAvailableTokens('test')).toBe(1);
    });
  });

  describe('getAvailableTokens', () => {
    it('should return max tokens for new bucket', () => {
      expect(rateLimiter.getAvailableTokens('test')).toBe(2);
    });

    it('should return 0 for unknown key', () => {
      expect(rateLimiter.getAvailableTokens('unknown')).toBe(0);
    });

    it('should decrease after acquire', async () => {
      await rateLimiter.acquire('test');
      expect(rateLimiter.getAvailableTokens('test')).toBe(1);

      await rateLimiter.acquire('test');
      expect(rateLimiter.getAvailableTokens('test')).toBe(0);
    });

    it('should refill tokens over time', async () => {
      // Use all tokens
      await rateLimiter.acquire('test');
      await rateLimiter.acquire('test');
      expect(rateLimiter.getAvailableTokens('test')).toBe(0);

      // Wait for refill (1 second)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should have refilled to 2 tokens
      expect(rateLimiter.getAvailableTokens('test')).toBe(2);
    });

    it('should not exceed max tokens', async () => {
      // Wait longer than refill time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Should still only have max tokens
      expect(rateLimiter.getAvailableTokens('test')).toBe(2);
    });

    it('should handle partial refill', async () => {
      // Use all tokens
      await rateLimiter.acquire('test');
      await rateLimiter.acquire('test');

      // Wait for half refill (500ms = 1 token for 2 tokens/second)
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Should have approximately 1 token
      const tokens = rateLimiter.getAvailableTokens('test');
      expect(tokens).toBeGreaterThanOrEqual(0.9);
      expect(tokens).toBeLessThanOrEqual(1.2);
    });
  });

  describe('reset', () => {
    it('should clear all buckets', async () => {
      await rateLimiter.acquire('test');
      expect(rateLimiter.getAvailableTokens('test')).toBe(1);

      rateLimiter.reset();

      // Should be back to max tokens
      expect(rateLimiter.getAvailableTokens('test')).toBe(2);
    });

    it('should clear queue', async () => {
      // Fill up rate limit
      await rateLimiter.acquire('test');
      await rateLimiter.acquire('test');

      // Reset immediately (clears buckets and queue)
      rateLimiter.reset();

      // After reset, should be able to acquire immediately
      await rateLimiter.acquire('test');
      expect(rateLimiter.getAvailableTokens('test')).toBe(1);
    });
  });

  describe('token bucket algorithm', () => {
    it('should implement continuous token refill', async () => {
      // Use 1 token
      await rateLimiter.acquire('test');
      expect(rateLimiter.getAvailableTokens('test')).toBe(1);

      // Wait for partial refill (500ms = 1 token for 2 tokens/sec rate)
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Should have refilled to at least 1 token (total ~2 tokens)
      const tokens = rateLimiter.getAvailableTokens('test');
      expect(tokens).toBeGreaterThanOrEqual(1);
      expect(tokens).toBeLessThanOrEqual(2);
    });

    it('should handle burst requests followed by steady state', async () => {
      // Burst: use all 10 tokens quickly
      for (let i = 0; i < 10; i++) {
        await rateLimiter.acquire('fast');
      }
      expect(rateLimiter.getAvailableTokens('fast')).toBe(0);

      // Wait for refill
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be able to burst again
      for (let i = 0; i < 10; i++) {
        await rateLimiter.acquire('fast');
      }
      expect(rateLimiter.getAvailableTokens('fast')).toBe(0);
    });
  });

  describe('DEFAULT_RATE_LIMITS', () => {
    it('should have orders rate limit (1 req/min)', () => {
      const config = DEFAULT_RATE_LIMITS.get('orders');
      expect(config).toBeDefined();
      expect(config?.maxRequests).toBe(1);
      expect(config?.windowMs).toBe(60 * 1000);
      expect(config?.queueRequests).toBe(true);
    });

    it('should have inventory rate limit (2 req/sec)', () => {
      const config = DEFAULT_RATE_LIMITS.get('inventory');
      expect(config).toBeDefined();
      expect(config?.maxRequests).toBe(2);
      expect(config?.windowMs).toBe(1000);
    });

    it('should have reports rate limit (1 req/45sec)', () => {
      const config = DEFAULT_RATE_LIMITS.get('reports');
      expect(config).toBeDefined();
      expect(config?.maxRequests).toBe(1);
      expect(config?.windowMs).toBe(45 * 1000);
    });

    it('should have products rate limit (5 req/sec)', () => {
      const config = DEFAULT_RATE_LIMITS.get('products');
      expect(config).toBeDefined();
      expect(config?.maxRequests).toBe(5);
      expect(config?.windowMs).toBe(1000);
    });

    it('should have default fallback rate limit', () => {
      const config = DEFAULT_RATE_LIMITS.get('default');
      expect(config).toBeDefined();
      expect(config?.maxRequests).toBe(1);
      expect(config?.windowMs).toBe(1000);
    });

    it('should work with default rate limits', () => {
      const limiter = new RateLimiter(DEFAULT_RATE_LIMITS);

      // Should be able to get tokens for all defined limits
      expect(limiter.getAvailableTokens('orders')).toBe(1);
      expect(limiter.getAvailableTokens('inventory')).toBe(2);
      expect(limiter.getAvailableTokens('reports')).toBe(1);
      expect(limiter.getAvailableTokens('products')).toBe(5);
      expect(limiter.getAvailableTokens('default')).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle very high rate limits', async () => {
      const highLimit = new RateLimiter(
        new Map([
          [
            'high',
            {
              maxRequests: 1000,
              windowMs: 1000,
              queueRequests: true,
            },
          ],
        ]),
      );

      // Should handle 100 requests without waiting
      const promises = Array.from({ length: 100 }, () =>
        highLimit.acquire('high'),
      );
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should handle very low rate limits', async () => {
      const lowLimit = new RateLimiter(
        new Map([
          [
            'low',
            {
              maxRequests: 1,
              windowMs: 5000, // 1 request per 5 seconds
              queueRequests: true,
            },
          ],
        ]),
      );

      const startTime = Date.now();

      await lowLimit.acquire('low');
      await lowLimit.acquire('low'); // Should wait ~5 seconds

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(4900);
    }, 10000); // Increase timeout for this test

    it('should handle zero available tokens correctly', async () => {
      await rateLimiter.acquire('test');
      await rateLimiter.acquire('test');

      const tokens = rateLimiter.getAvailableTokens('test');
      expect(tokens).toBe(0);
    });
  });
});
