# Amazon SP-API MCP Server — Master Plan

> **Status:** Living document. Last updated: 2026-06-20.
> Owner: maintainer · Stack: Node 20.12+ / TypeScript 6 / pnpm / ESM / Jest 30 / ESLint 10 / MCP SDK 1.29

This document is the single source of truth for *what we're building* and *in what order*. It supersedes the bullet-list roadmap view in `ROADMAP.md` and complements the per-change specs in `openspec/changes/`.

---

## 1. Current State (as of the modernization change)

The project is a **TypeScript MCP server over stdio** that exposes Amazon Seller Central data through the **SP-API** to AI agents. Phase 1.3 (auth) and 1.4 (HTTP + rate limiter) are merged in `main` (commit `a22d5b4`). The only MCP tool registered is `hello` — a smoke test.

### What's already done

| Layer | Files | Status |
|---|---|---|
| LWA OAuth (refresh → access tokens) | `src/auth/token-manager.ts` | ✅ |
| Credential validation (7 required env vars) | `src/auth/credentials.ts` | ✅ |
| AWS Signature V4 for SP-API | `src/utils/aws-signature.ts` | ✅ |
| Generic HTTP client with retries, rate limit, error normalization | `src/utils/sp-api-client.ts` | ✅ |
| Token-bucket rate limiter (per-endpoint keys) | `src/utils/rate-limiter.ts` | ✅ |
| Custom error classes (`SPAPIError`, `SPAPIAuthError`, `RateLimitError`, etc.) | `src/utils/errors.ts` | ✅ |
| Type definitions for SP-API | `src/types/sp-api.d.ts` | ✅ |
| `McpServer` + `registerTool` high-level API | `src/index.ts` (hello tool only) | ✅ |
| Tests: 120/120 pass, 93.93% lines / 83.58% branches / 100% fns | `tests/unit/`, `tests/integration/` | ✅ |
| OpenSpec workflow (`openspec/`, `.opencode/`) | change management | ✅ |

### What's NOT done yet

- Zero real SP-API tools (only the `hello` smoke test)
- No `src/tools/` directory
- No `tests/fixtures/` sample data
- No pagination helper (will be added with Phase 1.5)
- No caching layer
- No PII / Tokens API
- No notifications / real-time events
- No Catalog, Listings, Reports, Inventory, Returns, Finances, Sales, Pricing, Messaging, Notifications tools

---

## 2. SP-API Functionality Audit

The SP-API exposes **30+ sections** (verified against `developer-docs.amazon.com/sp-api/`). The project's `ROADMAP.md` covers roughly **12 of those 30+**. This is a deliberate focus on the most-asked-seller-questions, not an oversight — but the gaps are worth knowing.

### 2.1 In the roadmap (will be built eventually)

| SP-API section | Tools (planned) | ROADMAP phase |
|---|---|---|
| Orders | `get_orders`, `get_order_details`, `get_order_items` (added in this plan) | 1.5 |
| FBA Inventory | `get_inventory_summary`, `get_fba_inventory`, `check_stock_levels` | 1.6 |
| Reports | `request_report`, `get_report`, `list_reports`, `get_report_document` | 1.7 |
| Returns | `get_returns`, `get_return_details`, `get_refund_info` | 2 |
| Catalog Items | `search_catalog`, `get_product_details` | 2 |
| Listings Items | `get_listings` | 2 |
| Merchant Fulfillment (outbound) | create shipping labels | 3 |
| Product Pricing | competitive pricing, Buy Box | 3 |
| Advertising (Sponsored Products) | ACOS / ROAS analytics | 3 |
| Notifications | ORDER_CHANGE, REPORT_PROCESSING_FINISHED | 4 |

### 2.2 NOT in the roadmap but critical — recommend adding

| SP-API section | Why it's critical | Recommended phase |
|---|---|---|
| **Finances** | Required for the README's "profit margins" use case (fees, refunds, settlements). Without it, the MCP is incomplete for its declared purpose. | 1.5 (immediately after Orders) |
| **Product Fees** | Estimate Amazon fees per ASIN. Combines with Finances for pricing intelligence. | 1.5 / 2.0 |
| **Sales** | Lightweight sales analytics (no Reports polling overhead). May replace 80% of Reports uses. | 1.5 |
| **Fulfillment Inbound** | Send inventory to FBA. Phase 3 covers outbound, but sellers also need inbound. | 3 (paired with outbound) |
| **Tokens (RDT)** | **Security prerequisite** for PII endpoints (buyer name, address, phone). | 2.5 (before any PII work) |
| **Notifications** | Roadmap says Phase 4, but it's a *prerequisite* for any real-time feature. Should be earlier. | 2.5 (before Tokens) |
| **Messaging** | Buyer-seller messages. Without it, the MCP doesn't cover service-quality. | 2.5 |
| **Sellers** | Account health, marketplace participation, basic diagnostics. | 2 |
| **Customer Feedback** | Reviews. Affects Buy Box and conversion. | 3 |

### 2.3 NOT recommended to include (vendor-only or niche)

- **Vendor APIs (8 sections)** — only for 1P vendors, not 3P sellers
- **A+ Content** — brand-registered only, niche
- **Amazon Warehousing and Distribution (AWD)** — optional, sellers rarely use
- **Vehicles** — automotive parts only
- **External Fulfillment APIs** — for 3PL integrations
- **Easy Ship** — only India/JP, not NA/EU
- **Invoices / Shipment Invoicing** — B2B VAT, niche
- **Data Kiosk** — when fully GA will replace Reports, but currently preview
- **Replenishment** — minor value vs. Inventory API
- **App Integrations / Application Management** — tooling, not user-facing

---

## 3. Recommended Roadmap Reorganization

The existing `ROADMAP.md` groups features by capability, not by ROI. Here's a re-think that keeps the same capability scope but reorders for **maximum incremental value**:

| Phase | Original | Recommended | What lands |
|---|---|---|---|
| 1.5 | Orders | **Orders + Sales + Finances + Product Fees** | Core profitability loop enabled |
| 1.6 | Inventory | Inventory | FBA stock health |
| 1.7 | Reports | Reports | Async report generation |
| **2.0 (new)** | — | **Tokens (RDT) + Notifications + Messaging** | Prereqs for PII and real-time |
| 2 | Returns / Listings / Cache / Integration tests | Same | Returns + Listings (now with real-time) |
| **2.5 (new)** | — | **Sellers + Customer Feedback** | Account health + reviews |
| 3 | Fulfillment (outbound) / Pricing / Ads / Performance | Fulfillment (in + out) / Pricing / Ads / Performance | Symmetric fulfillment, no Notifications gap |
| 4 | Multi-marketplace + analytics | Multi-marketplace + analytics | Final scale |

**Why this reordering:**

1. **Finances is the missing piece** for the README's stated use case. Bundling it with Orders means the first wave of Phase 1.5 tools is *immediately useful for profit analysis* rather than just "show me orders".
2. **Tokens (RDT) + Notifications are technical prerequisites**, not features. Moving them to Phase 2.0 means later phases don't block on missing OAuth scopes or polling loops.
3. **Inbound fulfillment paired with outbound** means the entire restocking-to-shipping workflow lands together (Phase 3).

---

## 4. Prioritized Implementation Plan

If we had to pick **the 5 most-valuable tools** based on operational questions sellers actually ask, in order:

1. **`get_orders`** (Orders API) — base of all operational queries
2. **`get_sales_metrics`** (Sales API, not Reports) — daily/weekly sales numbers without the overhead of async report polling
3. **`get_fba_inventory_summary`** (FBA Inventory API) — "do I have stock?" is the #2 question
4. **`get_financial_events`** (Finances API) — enables the profit-margin use case from the README
5. **`get_product_fees_estimate`** (Product Fees API) — answers "how much will Amazon charge me?" for pricing decisions

These 5 cover **~80% of the operational questions** an AI agent is asked in the first 30 days of seller usage. They all share the same `SPAPIClient` + `McpServer` + zod pattern, so building them together validates the architecture for everything that comes next.

---

## 5. Cross-Cutting Infrastructure (one-time per phase)

Each tool family shares scaffolding. The first tool (Orders) builds it; later tools plug in. **Don't skip these** — they are the difference between a maintainable MCP server and a pile of glue code.

### 5.1 `src/tools/` directory pattern

One file per tool family. Each exports a single `register<Family>Tools(server: McpServer, client: SPAPIClient): void` function. `src/index.ts` calls each in sequence. Pattern:

```
src/tools/
├── sales.ts        (Orders — Phase 1.5)
├── inventory.ts    (Phase 1.6)
├── reports.ts      (Phase 1.7)
├── returns.ts      (Phase 2)
├── listings.ts     (Phase 2)
├── finances.ts     (Phase 2.0)
├── notifications.ts(Phase 2.0)
├── messaging.ts    (Phase 2.0)
├── pricing.ts      (Phase 3)
└── ...
```

Extract a shared `_helpers.ts` only when duplication exceeds 3 lines across ≥2 families. Defer the decision.

### 5.2 `src/utils/pagination.ts`

Async-generator helper for `nextToken`-driven list endpoints:

```ts
export async function* paginate<T>(
  fetch: (nextToken?: string) => Promise<PaginatedResponse<T>>,
  options?: { maxPages?: number; signal?: AbortSignal }
): AsyncGenerator<T>
```

- Backpressure-friendly (lazy page fetching)
- `maxPages` guard default 100 (10k items max)
- `AbortSignal` support for early termination
- No SP-API imports — pure JS/TS, reusable by any future tool family

**Used by:** `get_orders` (and all list-endpoint tools going forward). Built once in Phase 1.5; free for Catalog, Listings, Reports, Finances, etc.

### 5.3 `src/utils/rate-limiter.ts` extension

Each new SP-API endpoint needs a rate-limit bucket key registered in `DEFAULT_RATE_LIMITS`. Existing keys: `orders` (1/min), `inventory` (2/s), `reports` (1/45s), `products` (5/s), `default` (1/s). New keys needed for new sections:

| Section | Rate limit (per Amazon docs) | Bucket key |
|---|---|---|
| Finances | 0.5 req/s | `finances` |
| Sales | 0.5 req/s | `sales` |
| Product Fees | 0.5 req/s | `product-fees` |
| Catalog Items | 5 req/s | `catalog-items` |
| Listings Items | 5 req/s | `listings-items` |
| Notifications | 1 req/s | `notifications` |
| Messaging | 1 req/s | `messaging` |
| Returns | 5 req/s | `returns` |
| Product Pricing | 0.5 req/s | `product-pricing` |
| FBA Inventory | 2 req/s | `inventory` (existing) |
| Customer Feedback | 5 req/s | `customer-feedback` |
| Sellers | 5 req/s | `sellers` |

For test mode, a `disabled: boolean` field on `RateLimitConfig` short-circuits `acquire()` (used by `tests/setup.ts` so integration tests don't wait 60s per page transition).

### 5.4 `src/types/sp-api.d.ts` extension

Add request/response types per new endpoint family. Source of truth: SP-API sandbox response shape. Pattern: one `*Params` and one `*Response` interface per section.

### 5.5 `tests/fixtures/` sample data

One JSON file per section under test. Used by both unit and integration tests. Pattern:

```
tests/fixtures/
├── orders.json
├── orders-items.json
├── orders-page2.json
├── finances.json
├── ...
```

### 5.6 `src/index.ts` startup pattern

Construct the auth + HTTP stack before the `McpServer`, then call each tool family's `register<Family>Tools(server, client)`:

```ts
const credentials = new CredentialsManager();   // throws on missing env
const tokenManager = new TokenManager(credentials.lwa);
const rateLimiter = new RateLimiter(DEFAULT_RATE_LIMITS);
const client = new SPAPIClient({
  endpoint, marketplaceId,
  awsCredentials: credentials.aws,
  tokenManager, rateLimiter,
});

const server = new McpServer({ name, version }, { capabilities: { tools: {} } });
server.registerTool('hello', {...}, helloHandler);
registerOrderTools(server, client);          // Phase 1.5
registerInventoryTools(server, client);      // Phase 1.6
// ...

await server.connect(new StdioServerTransport());
```

**Breaking consequence:** the server now requires valid `.env` to start. The `hello` tool continues to work without credentials (it doesn't call the client). All other tools require a real SP-API environment or the `tests/setup.ts` fake values.

---

## 6. OpenSpec Workflow

Every non-trivial change goes through OpenSpec (`openspec/changes/<name>/`). The workflow:

```
openspec new change "<kebab-name>"      # scaffold
# → write proposal.md, design.md, specs/**/*.md, tasks.md
openspec validate "<name>"              # check syntax / completeness
/opsx:apply                             # execute the tasks stage by stage
openspec archive "<name>"               # close out after merge
```

The schema is `spec-driven`: 4 artifacts (proposal → design + specs → tasks). Each change produces a small but reviewable plan + tasks that the apply phase can walk through systematically.

### Current changes

| Change | Status |
|---|---|
| `modernize-typescript-and-mcp-sdk` | **archived** (merged 2026-06-19) |
| `phase-1-5-orders-and-tooling` | **ready to apply** |

The `phase-1-5-orders-and-tooling` change is the canonical reference for the next batch of work. Its proposal/design/specs/tasks should be read top-to-bottom before adding a new tool family.

---

## 7. Quality Gates

Per the SOP, every commit must pass the full quality gate. Local only (no CI yet):

```bash
pnpm build && pnpm test:coverage && pnpm lint && pnpm type-check
```

Coverage threshold: 80% across branches / functions / lines / statements (enforced in `jest.config.cjs`). No `eslint-disable` or `@ts-ignore` to dodge real issues. No lowering the threshold to make a test pass. The "No Shortcuts Policy" in `SOP.md` is non-negotiable.

---

## 8. Conventions (project-wide, enforced in code review)

- **ES module** (`"type": "module"` in `package.json`); `module: "NodeNext"` in `tsconfig.json`. `.js` import suffixes in TS source are mandatory.
- **Node 20.12+** (`engines.node`); `pnpm 10+`.
- **TypeScript 6.0.3** with strict flags. The new TS 6 deprecations (`moduleResolution: "Node"`, `baseUrl`) are fixed in `tsconfig.json` — no `ignoreDeprecations`.
- **MCP tools** use the `McpServer.registerTool(name, { description, inputSchema: z.object({...}) }, handler)` pattern from SDK 1.10+. The legacy `setRequestHandler` is banned.
- **Tests in ESM mode** use `jest.unstable_mockModule(...)` + dynamic `await import(...)`. The CJS-style hoisted `jest.mock(...)` does not work in ESM.
- **HTTP mocking in integration tests** uses `nock`, not mocks of the `SPAPIClient`. The real rate limiter + AWS signing code path is exercised.
- **Branch naming**: `feature/`, `fix/`, `docs/`, `test/`, `refactor/`. Never commit directly to `main`.
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- **OpenSpec**: every non-trivial change has a change directory with proposal/design/specs/tasks before any code lands.
- **PRs**: single PR per OpenSpec change, optionally split into staged commits (per the user's choice in the modernization change).

---

## 9. Phased Delivery

### Phase 1.5 — Orders (+ Finances/Sales/Fees) — **next**

OpenSpec change: `phase-1-5-orders-and-tooling` (ready to apply).

- Tools: `get_orders`, `get_order_details`, `get_order_items`
- Cross-cutting: `src/utils/pagination.ts`, `src/tools/` directory, `src/index.ts` startup pattern
- Tests: `tests/unit/tools/sales.test.ts`, `tests/integration/orders-flow.test.ts`
- Estimated scope: ~300 LoC of source, 1 PR, 1 commit (or 2 if review benefits)

### Phase 1.6 — FBA Inventory

- Tools: `get_inventory_summary`, `get_fba_inventory`, `check_stock_levels`
- Pattern reuses: `src/tools/sales.ts` as the template

### Phase 1.7 — Reports

- Tools: `request_report`, `get_report`, `list_reports`, `get_report_document`
- Pattern: async polling (Reports API is the first truly async API)
- Helper: `src/utils/report-polling.ts` for the wait-for-completion pattern

### Phase 2.0 — Tokens + Notifications + Messaging

- Tokens (RDT) for PII access
- Notifications API for real-time event subscriptions
- Messaging API for buyer-seller messages
- Pattern: subscription management + webhook receiver (out of stdio scope — needs HTTP listener)

### Phase 2 — Returns + Listings + Cache

- Returns tools (similar shape to Orders)
- Listings tools (CRUD — first write operations)
- Caching layer: `src/utils/cache.ts` with TTL + LRU; integrates with `paginate<T>` so all list-endpoint tools get caching for free

### Phase 2.5 — Sellers + Customer Feedback

- Account health diagnostics
- Reviews summary
- Lower priority — fills gaps, not new capabilities

### Phase 3 — Fulfillment (in + out) + Pricing + Ads + Performance

- Fulfillment Inbound (restocking) + Outbound (shipping labels) — paired
- Product Pricing (competitive intelligence)
- Advertising API (Sponsored Products ACOS/ROAS)
- Performance metrics (account health dashboard)

### Phase 4 — Multi-marketplace + Analytics + Scale

- Multi-marketplace: auth client per marketplace, route tools by `marketplaceId` param
- Data Kiosk (when GA) replaces Reports
- Bulk operations: parallel tool calls with rate-limit coordination
- Real-time notifications at scale

---

## 10. Out-of-Plan Items (parking lot)

These are explicitly **not** in this plan and require a separate conversation:

- **GitHub Actions CI** — `TESTING.md` shows a sample, but no CI is set up. The project's gates are local-only.
- **Multi-tenant / multi-seller** — current design assumes one seller per server instance.
- **Cloud deployment** — no Dockerfile, no Kubernetes manifest, no Lambda adapter. The server runs locally only.
- **Per-tenant API key rotation** — LWA refresh tokens are long-lived but not auto-rotated.
- **MCP server → client auth** — stdio MCP doesn't require auth, but a remote (HTTP) deployment would.

---

## 11. How to Use This Document

- **Before adding a tool family:** read §5 (Cross-Cutting) and the `phase-1-5-orders-and-tooling` OpenSpec change. The Orders change is the canonical reference for *how* to add a new tool family.
- **Before proposing a new phase:** re-read §2.3 (out-of-scope) and §3 (reorganization). If the new work crosses a phase boundary, propose a re-org here first.
- **Before merging a PR:** verify §7 (quality gates) and §8 (conventions) are satisfied.
- **When stuck:** the answer is almost always in §5.4 (`SPAPIClient` + `paginate` is reusable).

If this document and the per-change specs disagree, **the specs win** (they're the per-change contract). This document is the high-level plan; specs are the implementation contract.

---

_Last reviewed: 2026-06-20 · Maintainer: human-in-the-loop on every phase transition_
