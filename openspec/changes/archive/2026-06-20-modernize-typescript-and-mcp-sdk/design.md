## Context

The project is a TypeScript MCP server for Amazon Seller Central. It is currently in **Phase 1.4** of its roadmap (auth + HTTP client + rate limiter complete) with `src/index.ts` exposing exactly one tool (`hello`) using the SDK 1.0-era manual request-handler pattern. The next planned work, Phase 1.5 (Orders/Sales tools), will register 3+ more tools following the same pattern — meaning every future tool would inherit a hand-rolled `if/else` switch and inline JSON Schema unless the SDK upgrade happens first.

A full `pnpm view` audit on 2026-06-19 produced this gap table across all 13 direct dependencies:

| Package | Resolved | Latest stable | Gap | Notes |
|---|---|---|---|---|
| `typescript` | 5.9.3 | 6.0.3 | 1 major | |
| `@modelcontextprotocol/sdk` | 1.0.4 (per `package.json`) | 1.29.0 | 0.28 majors | 1.10 introduced `McpServer` |
| `@types/node` | 22.10.x | 22.19.x | minor | |
| `dotenv` | 16.6.1 | 17.4.2 | 1 major | `dotenv.config()` unchanged |
| `eslint` | 8.57.1 | 10.5.0 | 2 majors | v9+ is flat-config-only |
| `jest` | 29.7.0 | 30.4.2 | 1 major | ts-jest 29 already supports it |
| `nock` | 13.5.6 | 14.0.15 | 1 major | forces Node ≥ 20.12.0 |
| `ts-jest` | 29.2.5 | 29.4.11 | patch | **No 30.x exists** |
| `prettier` | 3.4.2 | 3.x | — | |
| `eslint-config-prettier` | 9.1.2 | 10.1.8 | 1 major | |
| `axios` | 1.7.9 | 1.x | — | |
| `aws4` | 1.13.2 | — | — | |
| `zod` | 3.25.76 | 4.4.3 | 1 major | held back — v4 is API-breaking |

A `pnpm install` of the current lockfile produces **zero deprecation warnings**. The registry returns no `deprecated` field for any direct dependency. So this change is a forward upgrade, not a forced migration.

Three discoveries from the audit shape the plan and are called out here so the maintainer is not surprised at apply time:

1. **`ts-jest@30` does not exist on the npm registry.** The `latest` dist-tag is `29.4.11`; the most recent dev release is `29.0.0-next.1`. The peer-dep on `ts-jest@29.4.11` is `"jest": "^29.0.0 || ^30.0.0"`, so Jest 30 is fully supported without waiting on a ts-jest 30. The prior proposal's "ts-jest 30" line item is wrong and is replaced by a ts-jest 29 pin in the same Jest 30 stage.
2. **`nock@14` declares `engines.node: ">=18.20.0 <20 || >=20.12.1"`.** Adopting nock 14 forces the Node engine floor to `>=20.12.0`. This is not an independent decision — it is coupled to the Jest/nock upgrade. Node 20.12 is in active LTS; this is a low-risk bump.
3. **`@typescript/native-preview` is on the dev channel** (`7.0.0-dev.20260619.1`). It is added as an opt-in devDependency behind a `type-check:fast` script. It is not used by `build` or by the production `type-check`.

Constraints from `AGENTS.md` and `SOP.md` that govern this design:
- Strict TS stays on (`noUncheckedIndexedAccess`, `noImplicitOverride`, etc.)
- Coverage threshold 80% stays enforced
- No `eslint-disable`, no `@ts-ignore`, no `.skip()` to dodge real issues
- Two-tsconfig layout (`tsconfig.json` for `src/`, `tsconfig.test.json` for `tests/`) stays
- Build remains `tsc → build/`; no bundler migration
- Test runner remains Jest + ts-jest; no Vitest migration
- `tests/` stays ignored by ESLint
- Branching: change is implemented on `refactor/modernize-toolchain-and-mcp-sdk`, merged via PR
- Prettier `endOfLine: "lf"` stays; no fighting the LF normalization on Windows

## Goals / Non-Goals

**Goals:**
- Compile and run cleanly under TypeScript 6.0.3 with the existing strict `tsconfig.json` (the module/moduleResolution settings will move to NodeNext as part of the ESM stage)
- Use the MCP SDK 1.29 `McpServer` high-level API for tool registration
- Bump `engines.node` to `>=20.12.0`
- Migrate ESLint from v8 + `.eslintrc.json` to v10 + flat config (`eslint.config.js`)
- Adopt Jest 30.4.2 with `ts-jest@29.4.11` and `nock@14`
- Migrate the project to ESM (`"type": "module"`, `module: "NodeNext"`)
- Add `@typescript/native-preview` as an opt-in devDependency behind `pnpm type-check:fast`
- Preserve the externally-observable behavior of the `hello` tool (same name, same input, same output text)
- Preserve 80%+ test coverage and zero new lint warnings
- Be implementable as a single PR with staged, independently-revertable commits (each stage's commit can be reverted without breaking later stages, with one exception noted in Migration Plan)

**Non-Goals:**
- Migrate to Vite, Vitest, or any other build/test toolchain change
- Add new MCP tools (the `hello` tool stays the only registered tool until Phase 1.5 lands)
- Bump `zod` to v4 (v4 has API-breaking changes — held back for a follow-up)
- Refactor `src/auth/`, `src/utils/`, `src/config/`, `src/types/` beyond what's strictly required for the new module system
- Adopt the `typescript/native-preview` as the production `tsc` (still dev-channel)

## Decisions

### D1 — Bump `typescript` to `^6.0.3` with no semantic tsconfig changes
**Why:** TS 6.0.3 is the `latest` dist-tag (released 2026-04-16). The existing `tsconfig.json` uses only stable, well-established flags (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `isolatedModules`, etc.) — all of which carry over without change in the first stage. (The `module` / `moduleResolution` settings do change, but that is part of the ESM stage, not the TS 6.0 stage.)
**Alternatives considered:**
- *Stay on 5.9*: rejected — we are already on the trailing 5.x, and the lockfile/peer-dep churn is the same as 6.0.
- *Adopt `@typescript/native-preview` as a peer*: rejected for production use; added as an opt-in instead.

### D2 — Bump `@types/node` to `^22.19` to match the latest 22 LTS patch
**Why:** Aligns with the Node 22 LTS the project targets. No behavior change.
**Alternatives considered:** *Skip the bump*: rejected — leaving one direct dep one major behind when we are already touching the file is needless noise.

### D3 — Bump `dotenv` to `^17.4.2`
**Why:** The 17.x release removed legacy behaviors our code does not use (`dotenv.config()` is a one-liner in `src/index.ts:14`). The 16 → 17 migration is a non-event for us; the registry confirmed no `deprecated` flag and our usage is in the public, stable surface.
**Alternatives considered:** *Stay on 16*: rejected — being on the trailing 16 means we'll be forced to bump later under worse conditions.

### D4 — Bump `@modelcontextprotocol/sdk` to `^1.29.0` and rewrite `src/index.ts` to use `McpServer`
**Why:** SDK 1.10 (Nov 2024) introduced the `McpServer` high-level class. `server.registerTool(name, config, handler)` accepts a zod schema for `inputSchema` and infers the handler's argument type from it, eliminating the manual `args as { name?: string }` cast. It also auto-generates the `ListToolsRequestSchema` response, so we delete the two `setRequestHandler` calls in `src/index.ts:44-81`. The transport (`StdioServerTransport`) and error handling stay the same.
**Alternatives considered:**
- *Stay on 1.0.x and use the legacy API*: rejected — we'd inherit a deprecated pattern into every Phase 1.5+ tool.
- *Bump to a specific 1.x intermediate (e.g. 1.15) and defer the high-level API*: rejected — the API has been stable since 1.10; no reason to land halfway.

### D5 — Bump `engines.node` to `">=20.12.0"`
**Why:** `nock@14` requires it. Node 20.12 is in active LTS, and the project already targets the 22.x type-definitions line, so this is consistent with intent.
**Alternatives considered:**
- *Bump to `>=22.0.0`*: rejected — broader blast radius (Node 20 users blocked), no compensating benefit.
- *Stay on `>=18.0.0`*: rejected — `nock@14` is required for the Jest 30 toolchain, and the engine warning would be confusing.

### D6 — Migrate ESLint to v10 + flat config
**Why:** ESLint 9 dropped the legacy `.eslintrc.*` format support and v10 continues the flat-config-only regime. The project must adopt the new format to lint under a current ESLint. The flat config also unblocks the `typescript-eslint` unified package, which is the supported way to wire TS rules in v9+.
**Alternatives considered:**
- *Stay on ESLint 8 with a maintenance extension*: rejected — ESLint 8 is on the `maintenance` dist-tag and is not getting new rules or fixes.
- *Adopt ESLint 9 first, then 10 later*: rejected — would require two config migrations for no benefit; jumping 8 → 10 in one go is the same shape of work.

### D7 — Use the unified `typescript-eslint` package instead of `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`
**Why:** The two legacy packages are deprecated as separate concerns in favor of the unified `typescript-eslint` package (currently `^8.61.1`). The flat-config example in the `typescript-eslint` docs uses the unified package.
**Alternatives considered:** *Keep the two legacy packages*: rejected — the flat-config story is cleaner with the unified package, and the legacy packages are on a deprecation glide path.

### D8 — Bump `jest` to `^30.4.2`; keep `ts-jest` at `^29.4.11`
**Why:** Jest 30 is the current stable. `ts-jest@30` does not exist on the npm registry; the `latest` ts-jest is `29.4.11` and its peer-dep already declares `"jest": "^29.0.0 || ^30.0.0"`. Adopting Jest 30 with the existing ts-jest 29 is the lowest-risk path.
**Alternatives considered:**
- *Wait for ts-jest 30*: rejected — no release candidate exists, the maintainers have not announced one, and waiting indefinitely blocks the Jest upgrade.
- *Migrate to `@swc/jest` or `esbuild-jest`*: deferred — considered as a fallback if the ESM stage forces a transformer change. ts-jest 29 in ESM mode is the first attempt.

### D9 — Bump `nock` to `^14.0.15`
**Why:** `nock@14` is the current stable and pairs naturally with the Jest 30 toolchain. The API is a superset of v13 for our usage (HTTP interception with `.reply(...)`).
**Alternatives considered:** *Stay on nock 13*: rejected — pulls us off the current major; the v13 → v14 API change for our patterns is nil.

### D10 — Migrate to ESM (`"type": "module"`, `module: "NodeNext"`)
**Why:** The Node ecosystem — ts-jest 29, MCP SDK 1.29, the native TypeScript preview, and every new package the project will adopt in Phase 1.5+ — is ESM-first. Staying on CommonJS means every new tool added in Phase 1.5+ would either be CJS-emitted (against the trend) or require per-tool ESM workarounds. The project source has no `__dirname`, `__filename`, `require()`, or `module.exports` today, so the source-side migration is essentially a `tsconfig.json` change.
**Alternatives considered:**
- *Stay on CommonJS*: rejected — CJS is increasingly the awkward path; every future dependency negotiation will have a CJS-shaped tax.
- *Defer ESM to a follow-up change*: rejected — ESM interacts with Jest 30 (which we're adopting) and with the new ESLint config; doing it now is cheaper than doing it after the toolchain is settled.

### D11 — Add `@typescript/native-preview` as an opt-in devDependency
**Why:** The Go-rewrite of TypeScript is materially faster than the JS `tsc` and has reached a usable dev-channel state. Adding it as an opt-in behind `pnpm type-check:fast` gives developers a fast feedback path without putting a dev-channel tool on the production critical path. The standard `tsc` (now 6.0.3) continues to be used by `build` and `type-check`.
**Alternatives considered:**
- *Skip the preview entirely*: rejected — the user explicitly requested it, and adding it as opt-in is low-risk.
- *Replace `tsc` with the preview*: rejected — still dev-channel, not appropriate for the production build.

### D12 — Sequence the stages as staged commits in a single PR
**Why:** Each stage has a clean commit boundary, the maintainer can review stage-by-stage, and any individual stage can be reverted without breaking later stages. The one exception is the ESM stage: it must land AFTER the Jest 30 / nock 14 stage, because Jest 30's ESM support is what makes the test runnable in ESM mode.
**Alternatives considered:**
- *Split into 3 separate OpenSpec changes / PRs*: acceptable; called out as an Open Question (Q4). The single-PR design is the default; splitting is opt-in if the maintainer prefers.
- *Land all stages as one squashed commit*: rejected — destroys the staged reviewability.

## Risks / Trade-offs

- **[Risk] TS 6.0 ships a new default-on flag or stricter inference that breaks the existing code.** → Mitigation: run `pnpm type-check` after the bump; if anything fires, fix the actual code per the "No Shortcuts Policy" — do not add `// @ts-ignore` or `// eslint-disable`.
- **[Risk] SDK 1.29's `McpServer` constructor signature differs from what 1.0.4 used.** → Mitigation: read the SDK 1.29 types from `node_modules/@modelcontextprotocol/sdk/dist/cjs/server/mcp.js.d.ts` *before* writing the new `src/index.ts`; verify the `registerTool` overload we plan to call exists in 1.29.
- **[Risk] ESLint 10 flat config rejects some legacy config patterns** (e.g. extending a string name like `"plugin:@typescript-eslint/recommended"`). → Mitigation: rewrite the config in the flat-config style using `tseslint.configs.recommended` from the `typescript-eslint` package; the v8 config that exists today is a useful starting point but the rules that work in v8 may not be wired the same way in v10.
- **[Risk] Jest 30 + ts-jest 29 ESM mode is slow or has surprises with the existing test setup.** → Mitigation: at apply time, if ts-jest 29 ESM mode is not workable, switch to `@swc/jest` (also covers ESM cleanly) and document the swap. The Jest config change is local; no test files need to change.
- **[Risk] ESM migration breaks the AWS Signature V4 utility at runtime** because `aws4` is CJS and the interop shape changes under `"type": "module"`. → Mitigation: there is a unit test that exercises the AWS signature; run it after the migration and confirm the produced signature is byte-identical to the CJS baseline.
- **[Risk] `node --experimental-vm-modules` is required by Jest 30's ESM handling and changes the `pnpm test` command line.** → Mitigation: update the `test` script to include the flag; document it in `AGENTS.md`.
- **[Risk] `@typescript/native-preview` produces a different diagnostic set than `tsc` for the same source.** → Mitigation: the `native-ts-preview` spec requires a `tsc.out` vs `tsgo.out` diff check; divergences are investigated, not accepted.
- **[Risk] Combined scope is too large for one PR.** → Acknowledged; Open Question Q4 asks the maintainer to confirm or split. Default plan is one PR with 6 staged commits.
- **[Risk] nock 14 + Jest 30 + ESM all in one test-runner stage has compounding unknowns.** → Mitigation: stage 4 (Jest 30 + nock 14) and stage 5 (ESM) are sequenced so stage 4 lands first; if stage 4 is green with the existing CJS test setup, stage 5 only needs to flip the module system and re-run.
- **[Trade-off] Not bundling `zod` 3 → 4 means we leave a major-version debt item open.** → Accepted: zod 4 is API-breaking; the MCP SDK 1.29 `registerTool` API is designed against zod 3, and migrating zod mid-change would force a re-validation of every zod schema. Held for a follow-up change.
- **[Trade-off] Engine bump to Node 20.12+ locks out Node 18 users.** → Accepted: Node 18 is in maintenance LTS and loses active support in April 2026; the cost of carrying two Node majors is higher than the cost of forcing the bump now.

## Migration Plan

The change is delivered as a single branch `refactor/modernize-toolchain-and-mcp-sdk` with 6 staged commits. Each commit's quality gate (lint, type-check, test, build) is independently green except where noted.

1. **Commit 1 — Branch + Stage 1 (toolchain bumps + Node engine)**
   - Branch off `main` → `refactor/modernize-toolchain-and-mcp-sdk`
   - Bump `typescript`, `@types/node`, `dotenv`, `@modelcontextprotocol/sdk` in `package.json`
   - Bump `engines.node` to `">=20.12.0"`
   - `pnpm install`; commit regenerated `pnpm-lock.yaml`
   - Run `pnpm type-check` and `pnpm build`; resolve any new TS 6.0 issues per the No Shortcuts Policy
2. **Commit 2 — Stage 2 (McpServer rewrite)**
   - Rewrite `src/index.ts` to use `McpServer` + `server.registerTool('hello', { description, inputSchema: z.object({ name: z.string().optional() }) }, async ({ name }) => ({ content: [{ type: 'text', text: \`Hello, ${name ?? 'World'}! ...\` }] }))`
   - Preserve `StdioServerTransport` and the `SIGINT` handler
   - Update any `tools/list` test assertion to match the zod-derived schema
   - `pnpm test` + `pnpm test:coverage` must be green
3. **Commit 3 — Stage 3 (ESLint 10 flat config)**
   - Bump `eslint` to `^10.5.0`, add `typescript-eslint` (`^8.61.1`), `@eslint/js` (`^10.0.1`), `globals` (`^17.6.0`)
   - Bump `eslint-config-prettier` to `^10.1.8`
   - Remove `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` from `devDependencies`
   - Delete `.eslintrc.json`; add `eslint.config.js` (CJS for now, will be renamed to `.mjs` in the ESM stage)
   - Preserve `tests/` in the ignore list
   - `pnpm lint` must be green
4. **Commit 4 — Stage 4 (Jest 30 + nock 14)**
   - Bump `jest` to `^30.4.2`, `nock` to `^14.0.15`
   - Keep `ts-jest` at `^29.4.11` (no v30 exists)
   - `pnpm test` and `pnpm test:coverage` must be green; existing 120+ tests should pass without code changes
5. **Commit 5 — Stage 5 (ESM migration)**
   - Add `"type": "module"` to `package.json`
   - Update `tsconfig.json`: `module: "NodeNext"`, `moduleResolution: "NodeNext"`
   - Rename `eslint.config.js` to `eslint.config.mjs` (because flat config under ESM needs to be ESM, or it can stay CJS — verify at apply time)
   - Update `jest.config.js` for ESM (ts-jest 29 ESM mode with `extensionsToTreatAsEsm`, or switch transformer)
   - Update `pnpm test` script to pass `--experimental-vm-modules` if Jest 30 needs it
   - Verify no `__dirname` / `__filename` / `require()` / `module.exports` in `src/`
   - `pnpm build && pnpm start` must boot the server end-to-end
   - `pnpm test` and `pnpm test:coverage` must be green
6. **Commit 6 — Stage 6 (native TypeScript preview)**
   - Add `@typescript/native-preview` as a devDependency
   - Add `scripts["type-check:fast"]` that invokes the preview binary against the same `tsconfig.json`
   - Confirm `pnpm type-check` still uses `tsc` (i.e., the preview is not on the production path)
7. **Commit 7 (docs) — Documentation updates**
   - Update `README.md` SDK version pin and handler examples
   - Update `ROADMAP.md` Phase 1.3 status and add a one-line note in Phase 1.8 tracking the modernization
   - Update `AGENTS.md` to reflect: Node 20.12+ engine floor, ESLint 10 flat config, ESM module type, the `type-check:fast` script, the SDK 1.29 `McpServer` patterns, and the `ts-jest@29.4.11` pin

**Quality gate after each commit (mandatory):** `pnpm build && pnpm test:coverage && pnpm lint && pnpm type-check`. Per SOP, no commit ships if any gate is red.

**Final PR:** all 6–7 commits on `refactor/modernize-toolchain-and-mcp-sdk` targeting `main`. PR title: `refactor: modernize TypeScript 6 / MCP SDK 1.29 / ESLint 10 / Jest 30 / ESM`. PR body summarizes the 6 stages and the per-commit quality-gate evidence.

**Rollback:** revert the merge commit. Each stage is independently revertable (with the one noted dependency: reverting the ESM stage requires also reverting the Jest 30 / nock 14 stage if the tests are then re-run on the previous CJS config). No data migration, no env-var changes, no behavior change for the `hello` tool.

## Open Questions

- **Q1**: Does the existing `tests/unit/` test for the `hello` tool assert on the literal JSON Schema `properties` order, or only on semantic fields? → Resolve at apply time (commit 2) by running `pnpm test` and inspecting the first failure.
- **Q2**: Is `ts-jest@29.4.11` the right pin or do we let pnpm resolve to the latest `^29`? → Pin `^29.4.11` for reproducibility; it is the latest in the 29.x line as of 2026-06-19.
- **Q3**: Is `eslint.config.js` (CJS) acceptable, or does the project want `eslint.config.mjs` (ESM) from the start? → Recommend `eslint.config.mjs` so the ESM stage (commit 5) is a no-op for the ESLint config file shape. Alternatively, leave it as `.js` (CJS) through the ESLint stage and rename in the ESM stage. Maintainer call.
- **Q4 (RESOLVED 2026-06-19 → Option A)**: Is the combined scope too large for a single PR? → **Single PR with 6 staged commits on `refactor/modernize-toolchain-and-mcp-sdk`**, each independently revertable. The Options B and C (split into 2–3 smaller PRs, or archive and open 6 separate changes) were considered and explicitly rejected.
- **Q5**: Does the AWS Signature V4 utility (`src/utils/aws-signature.ts`) have a unit test that captures the byte-exact signature output? → Resolve at apply time (commit 2) by reading the test file; if not, add one in the ESM stage (commit 5) so we can verify interop didn't shift the signature.
