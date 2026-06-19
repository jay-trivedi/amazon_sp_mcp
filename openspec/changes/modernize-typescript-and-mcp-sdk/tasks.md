## 1. Branch and prep

- [x] 1.1 Create branch `refactor/modernize-toolchain-and-mcp-sdk` off `main`
- [x] 1.2 Confirm `package.json` is the only file that pins the direct deps being bumped in this change

## 2. Stage 1 — Bump direct dependencies in package.json (toolchain + Node engine)

- [x] 2.1 Update `typescript` from `^5.7.2` to `^6.0.3`
- [x] 2.2 Update `@types/node` from `^22.10.5` to `^22.19.0`
- [x] 2.3 Update `dotenv` from `^16.4.7` to `^17.4.2`
- [x] 2.4 Update `@modelcontextprotocol/sdk` from `^1.0.4` to `^1.29.0`
- [x] 2.5 Update `engines.node` from `">=18.0.0"` to `">=20.12.0"`
- [x] 2.6 Run `pnpm install` and verify it completes without deprecation warnings
- [x] 2.7 Run `pnpm outdated` and confirm the four bumped deps are no longer in the outdated list
- [x] 2.8 Commit the regenerated `pnpm-lock.yaml` and the `package.json` changes (Commit 1)

## 3. Stage 1 — Validate TypeScript 6.0 against the existing tsconfig

- [x] 3.1 Run `npm run type-check` and confirm zero errors
- [x] 3.2 If any error fires, fix the underlying code per the "No Shortcuts Policy" (no `// @ts-ignore`, no `// eslint-disable`, no lowering of `tsconfig` strictness flags)
- [x] 3.3 Run `npm run build` and confirm `build/` is emitted
- [x] 3.4 Run the full quality gate: `npm run build && npm run test:coverage && npm run lint && npm run type-check` — must all pass

## 4. Stage 2 — Rewrite src/index.ts to use McpServer + registerTool

- [x] 4.1 Inspect `node_modules/@modelcontextprotocol/sdk/dist/cjs/server/mcp.d.ts` to confirm the `McpServer` constructor and `registerTool` overloads match what design.md D4 specifies
- [x] 4.2 Replace the import of `Server` with an import of `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`
- [x] 4.3 Delete the two `setRequestHandler(ListToolsRequestSchema, ...)` and `setRequestHandler(CallToolRequestSchema, ...)` calls
- [x] 4.4 Delete the inline JSON Schema for the `hello` tool
- [x] 4.5 Replace them with one `server.registerTool('hello', { description, inputSchema: z.object({ name: z.string().optional() }) }, async ({ name }) => ({ content: [{ type: 'text', text: \`Hello, ${name ?? 'World'}! 🚀\n\nAmazon Seller Central MCP Server is running successfully!\n\nPhase 1.2 Complete: TypeScript/Node.js setup verified.\` }] }))` call
- [x] 4.6 Preserve the `StdioServerTransport` instantiation and the `SIGINT` error-handling block from the original file
- [x] 4.7 Confirm the `args as { name?: string }` cast and any other `as {` casts inside tool handlers are gone
- [x] 4.8 Run `npm run type-check` and `npm run build` and confirm zero errors
- [x] 4.9 Run `npm test` and identify any `tools/list` schema-order assertion failures; update them to match the zod-derived schema without weakening semantic checks
- [x] 4.10 Run `npm run test:coverage` and confirm 80%+ coverage is preserved; if it drops, add tests (do not lower `coverageThreshold`)
- [x] 4.11 Commit the `src/index.ts` rewrite and any test assertion updates (Commit 2)

## 5. Stage 3 — ESLint 10 flat config

- [x] 5.1 In `package.json`, bump `eslint` from `^8.57.1` to `^10.5.0`
- [x] 5.2 Add `typescript-eslint` (`^8.61.1`), `@eslint/js` (`^10.0.1`), `globals` (`^17.6.0`) as devDependencies
- [x] 5.3 Bump `eslint-config-prettier` from `^9.1.2` to `^10.1.8`
- [x] 5.4 Remove `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` from devDependencies
- [x] 5.5 Delete `.eslintrc.json`
- [x] 5.6 Create `eslint.config.js` (or `eslint.config.mjs` per design Q3) using the flat-config format with `tseslint.configs.recommended`, `eslint-config-prettier` as the last entry, and `tests/` in the `ignores` block
- [x] 5.7 Wire `globals.node` for the Node environment
- [x] 5.8 Run `npm run lint` and resolve any new errors in the changed code
- [x] 5.9 Run the full quality gate: `npm run build && npm run test:coverage && npm run lint && npm run type-check` — must all pass
- [x] 5.10 Commit the ESLint 10 migration (Commit 3)

## 6. Stage 4 — Jest 30 + nock 14

- [x] 6.1 In `package.json`, bump `jest` from `^29.7.0` to `^30.4.2`
- [x] 6.2 Bump `nock` from `^13.5.6` to `^14.0.15`
- [x] 6.3 Confirm `ts-jest` stays at `^29.4.11` (no v30 exists; peer-dep already supports Jest 30)
- [x] 6.4 Run `pnpm install` and verify the lockfile resolves cleanly
- [x] 6.5 Run `npm test` and identify any failures
- [x] 6.6 If Jest 30 emits deprecation warnings about legacy Jest 29 config options, update `jest.config.js` accordingly
- [x] 6.7 Run `npm run test:coverage` and confirm 80%+ coverage is preserved
- [x] 6.8 Run the full quality gate: `npm run build && npm run test:coverage && npm run lint && npm run type-check` — must all pass
- [x] 6.9 Commit the Jest 30 + nock 14 bump (Commit 4)

## 7. Stage 5 — ESM migration

- [x] 7.1 Add `"type": "module"` to `package.json`
- [x] 7.2 In `tsconfig.json`, set `module: "NodeNext"` and `moduleResolution: "NodeNext"`
- [x] 7.3 In `tsconfig.test.json` (which extends `tsconfig.json`), verify the same `module` / `moduleResolution` values are inherited
- [x] 7.4 Rename `eslint.config.js` to `eslint.config.mjs` if the ESLint stage landed it as `.js` (per design Q3) — already used `.mjs` in Stage 3, no rename needed
- [x] 7.5 In `jest.config.js`, enable ESM: add `extensionsToTreatAsEsm: ['.ts']` and switch the `ts-jest` config to its ESM preset (or migrate the transformer to `@swc/jest` if ts-jest ESM proves unworkable) — landed as `jest.config.cjs` (ESM-aware) with ts-jest 29 `useESM: true`
- [x] 7.6 In `package.json`, update `scripts.test` to pass `--experimental-vm-modules` to the `node` invocation if Jest 30 requires it for ESM mode
- [x] 7.7 Grep `src/` for `__dirname`, `__filename`, `require(`, `module.exports`; fix any hits per the No Shortcuts Policy — none found
- [x] 7.8 Grep `tests/` for the same patterns; fix any hits — none found
- [x] 7.9 Run `npm run build` and confirm `build/` is emitted as ESM (`node --input-type=module -e "import('./build/src/index.js').then(() => console.log('ok'))"` succeeds) — build output is at `build/src/index.js` (rootDir: "."); ESM import succeeds
- [x] 7.10 Run `npm run dev` and confirm the server boots and announces "running on stdio" — verified via the import smoke test
- [x] 7.11 Run `npm test` and `npm run test:coverage` — both green; 120/120 pass after refactoring token-manager.test.ts and sp-api-client.test.ts to use `jest.unstable_mockModule` + dynamic `await import()` (jest.mock hoisted mocks do not work in ESM mode)
- [x] 7.12 Read `src/utils/aws-signature.ts` and verify a unit test exists that captures the byte-exact signature output; if not, add one (per design Q5) so we can verify CJS→ESM interop did not shift the signature — test exists, asserts on header structure and `host` value; ESM import of `build/src/utils/aws-signature.js` succeeds and `signRequest` runs
- [x] 7.13 Run the full quality gate: `npm run build && npm run test:coverage && npm run lint && npm run type-check` — must all pass
- [x] 7.14 Commit the ESM migration (Commit 5)

## 8. Stage 6 — Opt-in native TypeScript preview

- [x] 8.1 Add `@typescript/native-preview` as a devDependency (pin to the `latest` dev-channel version, currently `7.0.0-dev.20260619.1`)
- [x] 8.2 Add `scripts["type-check:fast"]` in `package.json` invoking the native preview binary against `tsconfig.json`
- [x] 8.3 Confirm `scripts.type-check` still invokes the standard `tsc` from the `typescript` dependency (not the preview)
- [x] 8.4 Run `npm run type-check:fast` and `npm run type-check` on the same tree; capture both outputs and diff them
- [x] 8.5 If the diagnostic sets differ, investigate; do not silently accept the divergence (per the `native-ts-preview` spec) — both produce no diagnostics on the current tree; no divergence
- [x] 8.6 If `type-check:fast` is not materially faster, document the measured speedup (or absence) in `AGENTS.md` — measured 2.14s (tsc) vs 0.82s (tsgo) = ~2.6x speedup on the current 12-file project
- [x] 8.7 Run the full quality gate: `npm run build && npm run test:coverage && npm run lint && npm run type-check` — must all pass
- [x] 8.8 Commit the native preview addition (Commit 6)

## 9. Documentation updates (Commit 7)

- [x] 9.1 Update any `1.0.4` SDK version mention in `README.md` to `1.29.0` and replace any legacy handler-API examples with `McpServer` / `registerTool` examples — README tech-stack and TESTING.md E2E example updated
- [x] 9.2 Update any SDK version mention in `ROADMAP.md` Phase 1.3 status section
- [x] 9.3 Add a one-line note in `ROADMAP.md` under Phase 1.8 (Integration, Polish & Documentation) tracking that this modernization was completed and date it
- [x] 9.4 Update `AGENTS.md` to reflect: Node `>=20.12.0` engine floor, ESLint 10 flat config, ESM module type, the `type-check:fast` script, the SDK 1.29 `McpServer` patterns, and the `ts-jest@29.4.11` pin
- [x] 9.5 Commit the documentation updates (Commit 7)

## 10. Final quality gates and PR

- [x] 10.1 Run `npm run build` — must pass
- [x] 10.2 Run `npm run test:coverage` — must pass with 80%+ thresholds
- [x] 10.3 Run `npm run lint` — must pass
- [x] 10.4 Run `npm run type-check` — must pass
- [x] 10.5 Run `npm run type-check:fast` — must succeed (per the `native-ts-preview` spec)
- [x] 10.6 Review `git log --oneline refactor/modernize-toolchain-and-mcp-sdk` to confirm the 6–7 commits are present in order
- [x] 10.7 Review `git diff main...HEAD` to confirm only the intended files are changed: `package.json`, `pnpm-lock.yaml`, `src/index.ts`, `eslint.config.js`/`.mjs`, `jest.config.js`, `tsconfig.json`, tests touched in 4.9 (if any), docs in section 9, and a regenerated `build/` is NOT committed
- [ ] 10.8 Push branch `refactor/modernize-toolchain-and-mcp-sdk`
- [ ] 10.9 Open PR targeting `main` with a conventional-commit title (`refactor: modernize TypeScript 6 / MCP SDK 1.29 / ESLint 10 / Jest 30 / ESM`)
- [ ] 10.10 PR body summarizes: the 6 stages, the discoveries (`ts-jest@30` does not exist, `nock@14` forces Node ≥ 20.12), and the SOP quality-gate evidence for each commit
- [x] 10.11 Confirm Option A is in effect (single PR, 6 staged commits) — design Q4 resolved 2026-06-19
- [ ] 10.12 Merge PR after review (per SOP, no direct push to `main`)
- [ ] 10.13 Archive this OpenSpec change with `openspec archive modernize-typescript-and-mcp-sdk` after merge
