## ADDED Requirements

### Requirement: Node Engine Floor Is 20.12 Or Newer
The `engines.node` field in `package.json` MUST be set to `">=20.12.0"`. This bump is required because `nock@^14` (which the Jest 30 toolchain upgrade pulls in) declares `engines.node: ">=18.20.0 <20 || >=20.12.1"`. Without this floor, `pnpm install` will fail or emit warnings on unsupported Node versions.

#### Scenario: pnpm install succeeds on Node 20.12+
- **WHEN** a developer runs `pnpm install` on Node 20.12.0 or newer after the upgrade
- **THEN** the install completes without an `engines` warning and `pnpm ls nock` reports a `14.x` version

#### Scenario: package.json declares the new floor
- **WHEN** a developer inspects `package.json` after the upgrade
- **THEN** `engines.node` is exactly `">=20.12.0"`

#### Scenario: unsupported Node is rejected at install time
- **WHEN** a developer runs `pnpm install` on Node 18.x or Node 20.0–20.11
- **THEN** pnpm exits non-zero with a clear `EBADENGINE` message that names the new floor
