## Why

The project's TypeScript toolchain is one major version behind (`typescript@5.9.3` vs. stable `6.0.3`) and the `@modelcontextprotocol/sdk` is **0.28 majors behind** (`^1.0.4` vs. stable `1.29.0`). The SDK gap is the more painful one: the current `src/index.ts` still uses the legacy manual request-handler pattern from SDK 1.0, while SDK ≥ 1.10 ships the high-level `McpServer` class with `registerTool(name, zodSchema, handler)` that eliminates the `if (name === '...')` switch and the manual JSON Schema definitions. Bumping the toolchain together with the SDK keeps the new tool registrations (Phase 1.5+ Orders/Inventory/Reports) on a modern, type-safe foundation instead of inheriting 2024-era API patterns.

The same audit also surfaced real, multi-major debt on the rest of the toolchain: ESLint is on v8 (the last major before the flat-config-only regime in v9+), Jest is on v29 (one major behind v30, which `nock@14` requires), `nock` itself is on v13 (deprecated behavior on modern Node), and the project is still on CommonJS emit while the Node ecosystem — including ts-jest 29, MCP SDK 1.29, and the native TypeScript preview — has consolidated around ESM. A series of follow-up PRs to address each item separately would be a poor use of review bandwidth and would keep the project in a half-modernized state for weeks; landing them together, sequenced in commits, gives the maintainer one place to review the full modernization and the project one merge to test end-to-end.

A pnpm audit of the current `package.json` confirms no direct or transitive dependency is marked `deprecated` on the registry, so this change is a forward upgrade — not a forced migration away from anything end-of-life. Three pre-flight discoveries shape the plan:
1. **`ts-jest@30` does not exist on the npm registry** (the `latest` dist-tag is `29.4.11`). Its `peerDependencies` already declare `jest: "^29.0.0 || ^30.0.0"`, so we can adopt Jest 30 without waiting on a ts-jest 30 release.
2. **`nock@14` declares `engines.node: ">=18.20.0 <20 || >=20.12.1"`**, which forces a Node engine bump to `>=20.12.0`. This is now coupled to the Jest/nock upgrade, not an independent decision.
3. **`@typescript/native-preview` is on the dev channel** (`7.0.0-dev.20260619.1`). It will be added as an opt-in devDependency behind a `type-check:fast` script; it will not replace the production `tsc` used for `pnpm build`.

## What Changes

### Stage 1 — Toolchain bumps (foundational)
- `typescript`: `^5.7.2` → `^6.0.3`
- `@types/node`: `^22.10.5` → `^22.19.0`
- `dotenv`: `^16.4.7` → `^17.4.2`
- `@modelcontextprotocol/sdk`: `^1.0.4` → `^1.29.0`
- `engines.node`: `">=18.0.0"` → `">=20.12.0"` (required by nock 14)

### Stage 2 — MCP SDK 1.29 high-level API
- **BREAKING**: rewrite `src/index.ts` to use the `McpServer` high-level API
- Replace the manual `ListToolsRequestSchema` / `CallToolRequestSchema` handlers and the inline JSON Schema for `hello` with `server.registerTool(name, { description, inputSchema: z.object({...}) }, handler)`
- Drop the hand-rolled `args as { name?: string }` cast in favor of zod-inferred typing
- Transport stays `StdioServerTransport`

### Stage 3 — ESLint 10 + flat config
- **BREAKING**: remove `.eslintrc.json`; add `eslint.config.js` (or `.mjs` if the ESM stage lands first)
- `eslint`: `^8.57.1` → `^10.5.0`
- Replace `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` with the unified `typescript-eslint` package (`^8.61.1`)
- Add `@eslint/js` (`^10.0.1`) and `globals` (`^17.6.0`)
- Keep `eslint-config-prettier` (`^10.1.8`) as the last entry in the flat config
- `tests/` stays in the ignore list (no new lint config added there)

### Stage 4 — Jest 30 + nock 14
- `jest`: `^29.7.0` → `^30.4.2`
- `ts-jest`: STAYS at `^29.4.11` (no v30 exists; peer-dep already supports Jest 30)
- `nock`: `^13.5.6` → `^14.0.15`
- 80% coverage threshold stays; jest.config.js may need to add `extensionsToTreatAsEsm` for the ESM stage

### Stage 5 — ESM migration
- **BREAKING**: add `"type": "module"` to `package.json`
- `tsconfig.json`: `module` → `"NodeNext"`, `moduleResolution` → `"NodeNext"`
- `src/` source: replace any `__dirname` / `__filename` / `require()` / `module.exports` with ESM equivalents (none currently exist; this is a verification, not a rewrite)
- `jest.config.js`: enable ESM mode (ts-jest ESM with `extensionsToTreatAsEsm`, or migrate to `@swc/jest` if ts-jest ESM proves too slow)
- `pnpm test` script: add `--experimental-vm-modules` to the `node` invocation if Jest 30's default ESM handling requires it

### Stage 6 — Opt-in native TypeScript preview
- Add `@typescript/native-preview` (`^7.0.0-dev.20260619.1`) as a devDependency
- Add `pnpm type-check:fast` script that invokes the preview binary
- Production `tsc` (used by `build` and `type-check`) is unchanged

### Documentation
- Update `README.md` SDK version pin and any examples that referenced the old handler API
- Update `ROADMAP.md` Phase 1.3 status note (currently says SDK is on `1.0.4`)
- Update `AGENTS.md` to reflect: Node 20.12+ engine floor, ESLint 10 flat config, ESM module type, the `type-check:fast` script, and the SDK 1.29 patterns

## Capabilities

### New Capabilities

- `typescript-6-toolchain`: Establishes the project baseline of TypeScript 6.0.x with `@types/node@^22.19`, `dotenv@^17.4`, and the strict TS settings carried over from the existing `tsconfig.json`. Defines that `pnpm type-check`, `pnpm build`, and `pnpm dev` must compile cleanly under TS 6.0 with no new warnings.
- `mcp-sdk-129`: Establishes that the server uses `@modelcontextprotocol/sdk@^1.29` and the `McpServer` high-level API for tool registration. Defines the registration contract (name, description, zod input schema, async handler returning `{ content: [...] }`) and that transport is `StdioServerTransport`.
- `node-engine-2012`: Establishes the `engines.node: ">=20.12.0"` floor required by `nock@14` and compatible with the rest of the upgraded toolchain. Pairs with the Node 22 LTS the project was already targeting via `@types/node@^22.19`.
- `eslint-10-flat-config`: Establishes ESLint 10 with the flat-config format, the unified `typescript-eslint` package, and the continued exclusion of `tests/` from linting. Prettier integration is preserved via `eslint-config-prettier` as the last config entry.
- `jest-30-toolchain`: Establishes Jest 30.4.2 with `ts-jest@29.4.11` (no ts-jest 30 exists; peer-dep already supports Jest 30) and `nock@14`. The 80% coverage threshold and the existing `jest.config.js` shape are preserved.
- `esm-migration`: Establishes that the project is an ES module: `"type": "module"` in `package.json`, `module: "NodeNext"` in `tsconfig.json`, no `__dirname` / `__filename` / `require()` / `module.exports` in `src/`, and the Jest config supports ESM source.
- `native-ts-preview`: Establishes the opt-in `pnpm type-check:fast` script backed by `@typescript/native-preview`. Production `tsc` is unchanged. The script targets at least 2× speedup over the standard type-check.

### Modified Capabilities

- (none — `openspec/specs/` is empty; this change introduces the project's first specs)

## Impact

- **Code**
  - `src/index.ts` rewritten to use `McpServer` + `registerTool`. Behavior of the `hello` tool unchanged from the caller's perspective.
  - No changes to `src/auth/`, `src/utils/`, `src/config/`, `src/types/` — none of those import the SDK directly today. They will, however, be type-checked under the new ESM module setting and may need import-specifier adjustments (verified at apply time, not pre-emptively rewritten).
  - `.eslintrc.json` deleted; `eslint.config.js` (or `.mjs`) added at repo root.
- **Tests**
  - 120+ existing tests must continue to pass with zero coverage loss.
  - The test runner changes from `ts-jest` CommonJS mode to ESM mode (or to a faster transformer); this typically requires no test-file changes but may require a `jest.config.js` update.
  - `nock` upgrades from v13 to v14; v14's API is a superset of v13's for our usage, so test files do not change.
- **CI / scripts**
  - `package.json` scripts gain `type-check:fast`. `pnpm test` may gain `--experimental-vm-modules` in the `node` invocation.
  - `pnpm lint` now invokes ESLint 10 with flat config.
  - `pnpm type-check` and `pnpm build` invoke `tsc 6.0` (no behavior change beyond the version bump).
- **Dependencies**
  - Direct adds: `typescript-eslint`, `@eslint/js`, `globals`, `@typescript/native-preview`.
  - Direct removes: `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`.
  - Direct bumps: `typescript`, `@types/node`, `dotenv`, `@modelcontextprotocol/sdk`, `eslint`, `eslint-config-prettier`, `jest`, `nock`.
  - Direct stays: `ts-jest@^29.4.11`, `prettier`, `axios`, `aws4`, `zod`, `tsx`, `ts-node`.
  - Transitive: handled by pnpm; lockfile will be regenerated.
- **Out of scope (explicit)**
  - Vite / Vitest migration (rejected in the prior analysis; tsc + Jest remain the toolchain)
  - Introduction of new MCP tools (the `hello` tool stays the only registered tool until Phase 1.5 lands)
  - Refactor of `src/auth/`, `src/utils/`, `src/config/`, `src/types/` beyond what's strictly required for the new module system
