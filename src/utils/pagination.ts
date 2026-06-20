/**
 * Generic async-iteration helper for SP-API `NextToken` list endpoints.
 *
 * Wraps a fetcher that returns `{ data: T[]; nextToken?: string }` and yields
 * individual items one at a time, requesting the next page lazily as the
 * consumer pulls. Reusable by any future tool family (Catalog Items, Listings,
 * Reports, Finances, Sales) without modification.
 *
 * The helper has zero SP-API imports on purpose: it is a pure async-iteration
 * utility, deliberately decoupled from the SP-API domain.
 */

export interface PaginatedResponse<T> {
  data: T[];
  nextToken?: string;
}

export interface PaginateOptions {
  /**
   * Maximum number of pages to fetch. Default: 100 (yields up to 100 × pageSize items).
   * The guard is per-call, not global.
   */
  maxPages?: number;
  /**
   * Optional abort signal. When aborted, the generator stops at the next yield
   * boundary without calling `fetch` again. A pre-aborted signal causes the
   * generator to return without ever calling `fetch`.
   */
  signal?: AbortSignal;
}

/**
 * Yield items from a paged SP-API endpoint one at a time, with backpressure.
 *
 * @param fetch - Fetcher function called with the current `nextToken` (or
 *   undefined for the first page). Must return `{ data, nextToken? }`.
 * @param options.maxPages - Guard against runaway chains. Default 100.
 * @param options.signal - AbortSignal for early termination.
 *
 * The generator surfaces the first error thrown by `fetch` rather than
 * swallowing it; iteration aborts on that error.
 */
export async function* paginate<T>(
  fetch: (nextToken?: string) => Promise<PaginatedResponse<T>>,
  options: PaginateOptions = {}
): AsyncGenerator<T, void, undefined> {
  const { maxPages = 100, signal } = options;

  if (signal?.aborted) {
    return;
  }

  let nextToken: string | undefined = undefined;
  let pagesFetched = 0;
  let done = false;

  while (!done) {
    if (signal?.aborted) {
      return;
    }

    const response = await fetch(nextToken);

    if (signal?.aborted) {
      return;
    }

    pagesFetched += 1;

    for (const item of response.data) {
      // Check signal between yields so a slow consumer can abort mid-page.
      if (signal?.aborted) {
        return;
      }
      yield item;
    }

    const next = response.nextToken;
    if (!next) {
      done = true;
    } else if (pagesFetched >= maxPages) {
      done = true;
    } else {
      nextToken = next;
    }
  }
}
