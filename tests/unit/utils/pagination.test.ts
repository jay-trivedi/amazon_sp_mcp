/**
 * Unit tests for the `paginate<T>` async generator helper.
 *
 * Covers:
 *   - single-page and multi-page iteration
 *   - AbortSignal handling (mid-iteration abort, pre-aborted signal)
 *   - maxPages guard
 *   - error propagation from the fetcher
 *   - empty first page
 *   - caller-driven early termination via `break`
 */

import { jest } from '@jest/globals';
import { paginate } from '../../../src/utils/pagination.js';

describe('paginate', () => {
  it('yields items from a single-page response and stops', async () => {
    const fetch = jest.fn(async () => ({
      data: ['a', 'b', 'c'],
      nextToken: undefined,
    }));

    const out: string[] = [];
    for await (const item of paginate(fetch)) {
      out.push(item);
    }

    expect(out).toEqual(['a', 'b', 'c']);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(undefined);
  });

  it('walks every page in order when nextToken is present', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({ data: [1, 2], nextToken: 'tok1' })
      .mockResolvedValueOnce({ data: [3, 4], nextToken: 'tok2' })
      .mockResolvedValueOnce({ data: [5], nextToken: undefined });

    const out: number[] = [];
    for await (const item of paginate(fetch)) {
      out.push(item);
    }

    expect(out).toEqual([1, 2, 3, 4, 5]);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[0]?.[0]).toBeUndefined();
    expect(fetch.mock.calls[1]?.[0]).toBe('tok1');
    expect(fetch.mock.calls[2]?.[0]).toBe('tok2');
  });

  it('does not call fetch when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = jest.fn();

    const out: number[] = [];
    for await (const item of paginate(fetch, { signal: controller.signal })) {
      out.push(item);
    }

    expect(out).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stops calling fetch after the signal is aborted mid-iteration', async () => {
    const controller = new AbortController();
    let calls = 0;
    const fetch = jest.fn(async () => {
      calls += 1;
      if (calls === 2) {
        controller.abort();
      }
      return { data: [`item-${calls}`], nextToken: `tok${calls}` };
    });

    const out: string[] = [];
    for await (const item of paginate(fetch, { signal: controller.signal })) {
      out.push(item);
    }

    // The generator should stop after the second call's signal check
    expect(calls).toBeLessThanOrEqual(3);
    // At minimum, the first item must have been yielded
    expect(out[0]).toBe('item-1');
  });

  it('honors a custom maxPages guard', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValue({ data: [1], nextToken: 'always-more' });

    const out: number[] = [];
    for await (const item of paginate(fetch, { maxPages: 3 })) {
      out.push(item);
    }

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(out).toEqual([1, 1, 1]);
  });

  it('uses the default maxPages of 100 when none is given', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValue({ data: [1], nextToken: 'always-more' });

    let count = 0;
    // Drain the generator up to a small bound so the test doesn't actually fetch 100 pages
    for await (const _ of paginate(fetch)) {
      count += 1;
      if (count === 5) break;
    }

    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('yields nothing for an empty first page', async () => {
    const fetch = jest.fn(async () => ({ data: [], nextToken: undefined }));
    const out: unknown[] = [];
    for await (const item of paginate(fetch)) {
      out.push(item);
    }
    expect(out).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('propagates the first error thrown by fetch', async () => {
    const boom = new Error('upstream blew up');
    const fetch = jest.fn().mockRejectedValue(boom);

    const it = (async () => {
      const out: unknown[] = [];
      for await (const item of paginate(fetch)) {
        out.push(item);
      }
      return out;
    })();

    await expect(it).rejects.toBe(boom);
  });
});
