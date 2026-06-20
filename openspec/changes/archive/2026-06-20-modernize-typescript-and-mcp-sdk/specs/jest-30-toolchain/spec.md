## ADDED Requirements

### Requirement: Jest Is On The 30.x Line With ts-jest 29
The `jest` devDependency MUST be `^30.4.2`. The `ts-jest` devDependency MUST stay on `^29.4.11` because **`ts-jest@30` does not exist** on npm at the time of this change — the latest `ts-jest` is `29.4.11`, and its `peerDependencies` already declare `jest: "^29.0.0 || ^30.0.0"`, so Jest 30 is fully supported by ts-jest 29.4.11.

#### Scenario: Jest resolves to 30.x
- **WHEN** a developer runs `pnpm ls jest` after the upgrade
- **THEN** the resolved version is in the `30.x` range

#### Scenario: ts-jest stays on 29.x
- **WHEN** a developer runs `pnpm ls ts-jest` after the upgrade
- **THEN** the resolved version is in the `29.4.x` range and its peer-dep resolves cleanly against Jest 30

#### Scenario: Jest 30 default config changes are handled
- **WHEN** `pnpm test` runs after the upgrade
- **THEN** no warnings about deprecated Jest 29 configuration options appear

### Requirement: nock Is On The 14.x Line
The `nock` devDependency MUST be `^14.0.15` (the `latest` dist-tag). This is required by the Jest 30 era and forces the Node 20.12+ engine floor (see `node-engine-2012` spec).

#### Scenario: nock resolves to 14.x
- **WHEN** a developer runs `pnpm ls nock` after the upgrade
- **THEN** the resolved version is in the `14.x` range

#### Scenario: existing nock-based tests still pass
- **WHEN** `pnpm test` runs the tests under `tests/unit/` and `tests/integration/` that use `nock(...)` for HTTP interception
- **THEN** the tests pass without any change to their setup or assertions

### Requirement: Coverage Threshold Stays At 80%
The `coverageThreshold` block in `jest.config.js` MUST remain at `branches/functions/lines/statements: 80`. This is a SOP-enforced floor and MUST NOT be lowered to compensate for any churn introduced by the Jest 30 or ESM migration.

#### Scenario: threshold is unchanged
- **WHEN** a developer inspects `jest.config.js` after the upgrade
- **THEN** `coverageThreshold.global` is still `{ branches: 80, functions: 80, lines: 80, statements: 80 }`

#### Scenario: coverage gate runs and passes
- **WHEN** a developer runs `pnpm test:coverage` after the upgrade
- **THEN** Jest exits 0 and reports at least 80% on all four metrics
