## ADDED Requirements

### Requirement: The Go-Based TypeScript Preview Is Available As An Opt-In
The `@typescript/native-preview` devDependency MUST be installed (currently at the `latest` dev-channel, `7.0.0-dev.20260619.1`). It MUST be invoked through a dedicated `pnpm type-check:fast` script and MUST NOT replace the production `tsc` used by `pnpm type-check` or `pnpm build`.

#### Scenario: package exposes type-check:fast
- **WHEN** a developer inspects `package.json` after the upgrade
- **THEN** `scripts["type-check:fast"]` exists and invokes the native preview binary (typically `tsgo` or the package's bin entry)

#### Scenario: type-check:fast is materially faster
- **WHEN** a developer runs both `pnpm type-check` and `pnpm type-check:fast` on the same source tree
- **THEN** `type-check:fast` completes in less time than `type-check` (target: at least 2× faster; the "10×" headline figure is the marketing claim for the Go port and is the upper bound, not a guarantee)

#### Scenario: type-check:fast is not used by build
- **WHEN** a developer runs `pnpm build`
- **THEN** the build does NOT invoke `@typescript/native-preview`; it uses the standard `tsc` from the `typescript` dependency

### Requirement: Native Preview Output Matches Standard tsc
The `type-check:fast` script MUST use the same `tsconfig.json` as `type-check` and MUST produce the same set of diagnostics for the same source tree. If a divergence is discovered, it MUST be reported as a bug and not silently accepted.

#### Scenario: no diagnostic drift on the current source tree
- **WHEN** a developer runs `pnpm type-check > /tmp/tsc.out` and `pnpm type-check:fast > /tmp/tsgo.out` on an unmodified `main`
- **THEN** the diagnostic sets are equivalent (same files, same line/column, same error codes; ordering may differ)

#### Scenario: divergences are investigated, not accepted
- **WHEN** the two outputs differ
- **THEN** the developer investigates the divergence before merging and either fixes the source or files an upstream issue — the result is NOT silently accepted
