## ADDED Requirements

### Requirement: TypeScript Toolchain Targets Version 6.0
The project's `typescript` devDependency MUST be pinned to `^6.0.3`, and the type-check and build commands MUST run against the TypeScript 6.0.x compiler without errors. The `tsconfig.json` and `tsconfig.test.json` files MUST NOT be modified except where strictly required for a TS 6.0 incompatibility; all existing strict flags (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`, `isolatedModules`) MUST remain enabled.

#### Scenario: type-check passes under TS 6.0
- **WHEN** a developer runs `pnpm type-check` after the upgrade
- **THEN** the TypeScript 6.0.x compiler exits with code 0 against the existing `src/` and `tests/` source

#### Scenario: build emits CommonJS to build/ under TS 6.0
- **WHEN** a developer runs `pnpm build` after the upgrade
- **THEN** the TypeScript 6.0.x compiler emits JavaScript files to `build/` with the same module/target settings as before the upgrade

#### Scenario: strict TS flags remain enabled
- **WHEN** a developer inspects `tsconfig.json` after the upgrade
- **THEN** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, and `noUnusedParameters` are still `true`

### Requirement: Node Type Definitions Track Node 22 LTS
The `@types/node` devDependency MUST be pinned to `^22.19.0` so that the project uses the latest stable type definitions for the Node 22 LTS line that the project targets via `engines.node`. The `engines.node` field MUST remain `>=18.0.0` (no Node runtime bump is part of this change).

#### Scenario: types resolve to 22.19.x
- **WHEN** a developer runs `pnpm ls @types/node` after the upgrade
- **THEN** the resolved version is in the `22.19.x` range

#### Scenario: engines.node is unchanged
- **WHEN** a developer inspects `package.json` after the upgrade
- **THEN** `engines.node` is still `">=18.0.0"`

### Requirement: Dotenv Uses Current Major Version
The `dotenv` runtime dependency MUST be pinned to `^17.4.2`. The single use site in `src/index.ts` (`dotenv.config()`) MUST continue to work without code changes.

#### Scenario: dotenv.config loads .env under dotenv 17
- **WHEN** the server starts with a valid `.env` file present
- **THEN** `process.env` is populated with the expected SP-API variables (AWS, LWA, seller, marketplace) and the server boots

#### Scenario: dotenv version is 17.x
- **WHEN** a developer runs `pnpm ls dotenv` after the upgrade
- **THEN** the resolved version is in the `17.x` range and reports no `deprecated` flag
