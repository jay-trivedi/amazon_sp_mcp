## ADDED Requirements

### Requirement: The Project Is An ES Module
The `package.json` MUST declare `"type": "module"`. All TypeScript source files MUST be authored so that `tsc` can emit ES modules, and the `tsconfig.json` MUST set `module` to `"NodeNext"` and `moduleResolution` to `"NodeNext"`. The `outDir` (`build/`) MUST contain `.js` files whose module format is ESM at runtime.

#### Scenario: package.json declares ESM
- **WHEN** a developer inspects `package.json` after the migration
- **THEN** `"type": "module"` is present

#### Scenario: tsconfig targets NodeNext
- **WHEN** a developer inspects `tsconfig.json` after the migration
- **THEN** `module` is `"NodeNext"` and `moduleResolution` is `"NodeNext"`

#### Scenario: built output is ESM
- **WHEN** a developer runs `pnpm build` and then `node --input-type=module -e "import('./build/index.js').then(m => console.log(typeof m))"`
- **THEN** the script runs without `ERR_REQUIRE_ESM` and reports the exported type

#### Scenario: dev script runs in ESM
- **WHEN** a developer runs `pnpm dev` (which uses `tsx src/index.ts`)
- **THEN** the server boots and announces "running on stdio" without module-format errors

### Requirement: CommonJS Patterns Are Replaced
Source code MUST NOT rely on CommonJS-only constructs after the migration. Specifically: `__dirname` and `__filename` MUST NOT be used; `require()` MUST NOT be used; `module.exports` MUST NOT be used. Code that needs the equivalent of `__dirname` MUST use `fileURLToPath(new URL('.', import.meta.url))`.

#### Scenario: no __dirname / __filename
- **WHEN** a developer greps `src/` for `__dirname` or `__filename`
- **THEN** no results are returned

#### Scenario: no require() in src
- **WHEN** a developer greps `src/` for `require(`
- **THEN** no results are returned

#### Scenario: no module.exports in src
- **WHEN** a developer greps `src/` for `module.exports`
- **THEN** no results are returned

### Requirement: Test Runner Supports ESM Source
Jest MUST be able to import the ESM source under `src/`. This is satisfied by ts-jest 29.4.11's ESM mode (via `extensionsToTreatAsEsm` in `jest.config.js`) and by passing `--experimental-vm-modules` to `node` when running Jest directly. The `pnpm test` script MUST be updated to include the necessary flag if required by Jest 30's ESM handling.

#### Scenario: tests import ESM source
- **WHEN** `pnpm test` runs the existing `tests/unit/` suites
- **THEN** every test that imports from `../src/...` resolves and runs without `ERR_REQUIRE_ESM` or `Cannot use import statement outside a module`

#### Scenario: jest config enables ESM
- **WHEN** a developer inspects `jest.config.js` after the migration
- **THEN** it includes the ESM configuration required by the chosen test-runner mode (either ts-jest ESM mode or `@swc/jest` / `esbuild-jest` as decided in design.md)

### Requirement: Dependency CJS Interop Is Verified
Every runtime dependency (`@modelcontextprotocol/sdk`, `axios`, `aws4`, `dotenv`, `zod`) MUST either be ESM-native or expose a default export under Node's CJS-from-ESM interop. The migration MUST NOT ship a build that fails at runtime with an interop error.

#### Scenario: server starts under ESM
- **WHEN** a developer runs `pnpm dev` after the migration
- **THEN** the server boots cleanly and a smoke `tools/list` call returns the `hello` tool

#### Scenario: AWS signature still works
- **WHEN** a unit test exercises the AWS Signature V4 utility under ESM
- **THEN** the test passes and the produced signature is byte-identical to the CommonJS baseline
