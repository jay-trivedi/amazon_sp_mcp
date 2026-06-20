# AGENTS.md

Quick orientation for AI coding agents working in this repo.

## What this is

TypeScript MCP server for Amazon Seller Central (SP-API). Runs on stdio via `@modelcontextprotocol/sdk` 1.29. Node 20.12+, TypeScript 6, ESM (`"type": "module"`, `module: "NodeNext"`).

## Repo state — read this before assuming features exist

The README and ROADMAP describe an aspirational layout. The actual code is **Phase 1.3–1.4 only**:

- `src/index.ts` registers four tools: `hello` (smoke), `get_orders`, `get_order_details`, `get_order_items` (Phase 1.5). No `get_inventory`, `get_report`, etc. exist yet.
- `src/tools/` now exists and contains `sales.ts` (the canonical pattern for future tool families). `tests/fixtures/` exists for sample SP-API responses. `tests/mocks/` and `tests/e2e/` **do not exist** yet, even though README shows them.
- The scripts `test:integration` / `test:e2e` exist in `package.json` but have no matching test files.
- No `.github/`, no CI workflow, no pre-commit hooks — despite `TESTING.md` showing a sample GitHub Actions config.

When picking up a new tool to add, follow the **tool family pattern** established in Phase 1.5:

- Create `src/tools/<family>.ts` exporting a single `register<Family>Tools(server: McpServer, client: SPAPIClient): void` function.
- Inside, define each tool's config (`description` + zod `inputSchema`) as a named export (`<family><Action>ToolConfig`) and its handler as a named export (`handle<Family><Action>`) so unit tests can call them directly without round-tripping through the MCP protocol.
- `server.registerTool(name, config, handler)` wires them onto the `McpServer`.
- Each method on `SPAPIClient` routes through the rate-limit bucket key that matches the SP-API section (`orders`, `inventory`, `reports`, etc.).
- Use `src/utils/pagination.ts`'s `paginate<T>` for `nextToken`-driven list endpoints.
- Tools use the `McpServer` high-level API (SDK 1.10+), not the legacy `setRequestHandler` pattern.
- For one-tool-family = one-file; extract `_helpers.ts` only when duplication exceeds 3 lines across ≥2 families.

See `src/tools/sales.ts` (Orders) as the canonical reference; tests live in `tests/unit/tools/<family>.test.ts` (unit) and `tests/integration/<family>-flow.test.ts` (integration with `nock`).

## Commands

```bash
pnpm dev                 # tsx src/index.ts (no build, reads .env)
pnpm build               # tsc -> build/src/   (ESM; main is build/src/index.js)
pnpm start               # node build/src/index.js
pnpm test                # jest under --experimental-vm-modules (ESM)
pnpm test:unit           # only tests/unit
pnpm test:coverage       # with coverage; enforces 80% thresholds
pnpm test:manual-auth    # tsx scripts/test-auth.ts — LIVE call to Amazon LWA, needs real .env
pnpm type-check          # tsc --noEmit (stable TS 6)
pnpm type-check:fast     # tsgo --noEmit (Go-rewrite preview, opt-in, ~2.6x faster on this tree)
pnpm lint                # eslint .   (does NOT lint tests/, see below)
pnpm format              # prettier --write
```

`pnpm install` is the install command (no `--save` / `--save-dev` flags — use `pnpm add` / `pnpm add -D`). The lockfile is `pnpm-lock.yaml` (gitignored locally; not part of the repo contract — `package.json` is).

`test:debug` is also available: `node --experimental-vm-modules --inspect-brk node_modules/jest/bin/jest.js --runInBand`.

## Quality gates (run before pushing any branch)

Per `SOP.md`, the gate order is:

```bash
pnpm build && pnpm test:coverage && pnpm lint && pnpm type-check
```

Coverage thresholds in `jest.config.js` are 80% across branches/functions/lines/statements — Jest will fail the run if they drop. Do not lower them.

## Conventions worth knowing

- **`engines.node >=20.12.0`.** Required by `nock@14`. Node 18 is no longer supported.
- **The project is an ES module.** `package.json` has `"type": "module"`; `tsconfig.json` uses `module: "NodeNext"` and `moduleResolution: "NodeNext"`. Source emits to `build/src/...` (not `build/...` directly) because `tsconfig.test.json` sets `rootDir: "."`. Update `pnpm start` and any deployment script that referenced `build/index.js` to use `build/src/index.js`.
- **`.js` import suffixes in TS source are mandatory in ESM mode.** Files import like `from '../types/sp-api.js'` and Node will resolve them to the `.ts` source at build time. Don't drop the `.js` suffix — Node ESM requires the full extension.
- **Two tsconfigs.** `tsconfig.json` excludes `tests/`. `tsconfig.test.json` extends it and includes `tests/**/*` + `src/**/*`, and sets `rootDir: "."` (required by TS 6 in this layout). Jest uses the test one. Edit carefully — IDE and `tsc --noEmit` use different ones.
- **Strict TS** is on, including `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`. Array/object index access returns `T | undefined` — handle it.
- **ESLint 10 with flat config.** `eslint.config.mjs` is the source of truth. `tests/` is in the `ignores` block. Don't revert to `.eslintrc.json`; ESLint 8 is no longer installed and v9+ no longer supports the legacy format.
- **`ts-jest` is pinned at `^29.4.11`.** There is no `ts-jest@30` on the npm registry; the latest 29.x already declares `"jest": "^29 || ^30"` in its peerDependencies, so Jest 30 works with ts-jest 29. Do not bump ts-jest or migrate the transformer unless this assumption changes.
- **Jest runs in ESM mode.** `jest.config.cjs` sets `extensionsToTreatAsEsm: ['.ts']` and `useESM: true` on ts-jest. Every `pnpm test*` script threads `--experimental-vm-modules` to the `node` invocation. Tests that need to mock modules use `jest.unstable_mockModule(...)` + dynamic `await import(...)` — the CJS-style hoisted `jest.mock(...)` does not work in ESM mode.
- **`tests/` is unlinted.** This is a non-negotiable project convention; do not add lint config to test files.
- **Prettier `endOfLine: "lf"`** on a Windows checkout. Prettier will rewrite CRLF to LF on format. Don't fight it.
- **No CI.** Don't expect GitHub Actions results; run the four quality-gate commands locally before pushing.

## Branching & commits (SOP.md is authoritative)

- **Never commit directly to `main`.** Always a feature branch: `feature/`, `fix/`, `docs/`, `test/`, `refactor/`.
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- Push only after quality gates pass.

## SP-API integration gotchas

- `CredentialsManager` (`src/auth/credentials.ts`) **validates at construction** and throws listing every missing env var. All 7 vars in `.env.example` are required (AWS key/secret/region, LWA client id/secret/refresh, seller id, marketplace id, SP_API endpoint). Test setup (`tests/setup.ts`) sets fake values, so unit tests work without a real `.env`.
- IAM user needs the inline policy with `Action: execute-api:Invoke` on `arn:aws:execute-api:*:*:*` (see `SETUP_CREDENTIALS.md` Part 3).
- Regional endpoints: NA `sellingpartnerapi-na.amazon.com`, EU `-eu`, FE `-fe`. `AWS_REGION` default is `us-east-1` and should match your marketplace region for SigV4.
- **Rate-limit bucket keys must be registered.** `RateLimiter.acquire(key)` throws `No rate limit configuration found for key: <x>` if `key` isn't in the `DEFAULT_RATE_LIMITS` map. When adding a new SP-API endpoint, add a row there AND pass the matching key as `endpointKey` to `client.request()`. Existing keys: `orders` (1/min), `inventory` (2/s), `reports` (1/45s), `products` (5/s), `default` (1/s).
- `TokenManager` caches tokens with a 5-minute expiry buffer; only refreshes when expired. Use `clearCache()` in tests.

## What to read for context

- `SOP.md` — full 7-step workflow + the "No Shortcuts Policy" (no `.skip()`, no lowering coverage, no `any`/`@ts-ignore` to dodge types, no eslint-disable to silence real issues). **This is the rule the maintainer cares about most.**
- `TESTING.md` — Jest setup, fixture/mocks pattern, nock usage, coverage details.
- `SETUP_CREDENTIALS.md` — one-time Amazon + AWS credential acquisition walkthrough.
- `ROADMAP.md` — current phase status; check what's "in progress" vs "completed" before starting.
- `README.md` — user-facing setup and MCP tool catalog (catalog is aspirational — see "Repo state" above).

## Things to NOT do

- Don't add eslint-disable or `@ts-ignore` to silence a real error. Fix the code.
- Don't weaken an assertion, add `.skip()`, or lower `coverageThreshold` to make a test pass.
- Don't add files to `.eslintignore` or expand the `ignorePatterns` to cover new code.
- Don't commit `.env`, `.env.test`, or any credential.
- Don't merge a feature branch into `main` without all four quality gates green.
