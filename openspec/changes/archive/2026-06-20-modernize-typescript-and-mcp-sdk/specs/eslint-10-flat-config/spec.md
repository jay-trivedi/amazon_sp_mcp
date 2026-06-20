## ADDED Requirements

### Requirement: ESLint 10 With Flat Config
The `eslint` devDependency MUST be `^10.5.0` (the `latest` dist-tag as of 2026-06-19). The project MUST use ESLint's flat-config format exclusively. The legacy `.eslintrc.json` file MUST be removed and replaced with `eslint.config.js` (or `eslint.config.mjs` if the project is migrated to ESM as part of the same change).

#### Scenario: ESLint resolves to 10.x
- **WHEN** a developer runs `pnpm ls eslint` after the upgrade
- **THEN** the resolved version is in the `10.x` range

#### Scenario: flat config is the only config format
- **WHEN** a developer lists the repo root
- **THEN** `eslint.config.js` (or `.mjs`) exists and no `.eslintrc.*` file exists

#### Scenario: legacy config is not silently picked up
- **WHEN** a developer runs `pnpm lint` after deleting `eslint.config.js` and re-introducing `.eslintrc.json`
- **THEN** ESLint errors out with a message that flat config is required (no silent fallback to the legacy format)

### Requirement: TypeScript-Aware Lint Rules Use The typescript-eslint Flat-Config Package
The project MUST use the `typescript-eslint` package (version `^8.61.1`) for both the parser and the plugin. The two legacy packages `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` MUST be removed from `devDependencies` and replaced by the single `typescript-eslint` package in the flat-config file.

#### Scenario: only typescript-eslint is installed
- **WHEN** a developer runs `pnpm ls @typescript-eslint/parser @typescript-eslint/eslint-plugin typescript-eslint` after the upgrade
- **THEN** `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` are not in the tree, and `typescript-eslint` is at `8.x`

#### Scenario: parser and plugin are loaded via tseslint
- **WHEN** a developer reads `eslint.config.js` after the upgrade
- **THEN** it imports `tseslint` from `typescript-eslint` and uses `tseslint.configs.recommended` (or a typed variant)

### Requirement: Prettier Integration Is Preserved
The Prettier integration MUST continue to work after the ESLint 10 migration. `eslint-config-prettier` MUST be `^10.1.8` and MUST be applied as the last entry in the flat config array to disable formatting rules.

#### Scenario: Prettier rules are disabled in ESLint
- **WHEN** `pnpm lint` runs on a file that would otherwise trigger a Prettier formatting rule
- **THEN** ESLint does not report the formatting issue (the rule is disabled by `eslint-config-prettier`) and `pnpm format` still applies the formatting

#### Scenario: prettier --check passes
- **WHEN** a developer runs `pnpm format:check` after the upgrade
- **THEN** it exits 0 against the source tree

### Requirement: tests/ Remains Unlinted
The `tests/` directory MUST remain in the ESLint ignore list. This is a non-negotiable project convention (per `AGENTS.md`); the migration MUST NOT add lint config to test files.

#### Scenario: tests/ is ignored
- **WHEN** a developer inspects `eslint.config.js` after the upgrade
- **THEN** there is an `ignores` entry that includes `tests/`

#### Scenario: lint skips tests/
- **WHEN** a developer introduces a deliberate lint error in `tests/unit/auth/credentials.test.ts`
- **THEN** `pnpm lint` does not report it
