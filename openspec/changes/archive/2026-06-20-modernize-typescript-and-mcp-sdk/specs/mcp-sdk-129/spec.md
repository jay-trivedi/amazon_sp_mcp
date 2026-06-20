## ADDED Requirements

### Requirement: MCP SDK Is On The 1.29 Line
The `@modelcontextprotocol/sdk` runtime dependency MUST be pinned to `^1.29.0`. The server entry point (`src/index.ts`) MUST import from the SDK using the 1.x public API surface and MUST NOT import any path that was removed in the 1.x line.

#### Scenario: SDK resolves to 1.29.x
- **WHEN** a developer runs `pnpm ls @modelcontextprotocol/sdk` after the upgrade
- **THEN** the resolved version is in the `1.29.x` range

#### Scenario: no deprecated SDK import paths
- **WHEN** `pnpm build` runs after the upgrade
- **THEN** the TypeScript compiler does not report errors for any import from `@modelcontextprotocol/sdk`

### Requirement: Tools Are Registered Via The McpServer High-Level API
The server entry point MUST instantiate the `McpServer` class (exported from `@modelcontextprotocol/sdk/server/mcp.js`) and MUST register each tool via the `server.registerTool(name, config, handler)` method, where `config` provides a `description` and an `inputSchema` expressed as a `zod` schema. The manual `setRequestHandler(ListToolsRequestSchema, ...)` and `setRequestHandler(CallToolRequestSchema, ...)` calls from the SDK 1.0-era pattern MUST NOT be present.

#### Scenario: McpServer is used
- **WHEN** a developer reads `src/index.ts` after the upgrade
- **THEN** the file imports `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js` and constructs an instance of it

#### Scenario: hello tool is registered via registerTool
- **WHEN** a developer reads `src/index.ts` after the upgrade
- **THEN** there is exactly one `server.registerTool(...)` call for the `hello` tool and the input schema is a `z.object({ ... })` expression

#### Scenario: legacy setRequestHandler calls are absent
- **WHEN** a developer greps `src/` for `setRequestHandler`
- **THEN** no results are returned

### Requirement: Stdio Transport Is Preserved
The server MUST continue to communicate over the `StdioServerTransport`. No HTTP, SSE, or WebSocket transport may be introduced as part of this change.

#### Scenario: transport is StdioServerTransport
- **WHEN** a developer reads `src/index.ts` after the upgrade
- **THEN** the server is connected to an instance of `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`

### Requirement: The hello Tool Behavior Is Unchanged
The `hello` tool MUST keep the same externally-observable behavior as before the upgrade: same name (`hello`), same input shape (`{ name?: string }`, optional string), and same output text template (`Hello, ${name}! 🚀\n\nAmazon Seller Central MCP Server is running successfully!\n\nPhase 1.2 Complete: TypeScript/Node.js setup verified.` when `name` is provided, `Hello, World! ...` otherwise).

#### Scenario: hello with a name
- **WHEN** an MCP client invokes the `hello` tool with `{ "name": "Claude" }`
- **THEN** the server returns a single text content block whose text starts with `Hello, Claude!`

#### Scenario: hello without a name
- **WHEN** an MCP client invokes the `hello` tool with `{}`
- **THEN** the server returns a single text content block whose text starts with `Hello, World!`

### Requirement: Argument Casting Is Eliminated
The handler passed to `registerTool` MUST receive its argument typed by the zod schema inference. The `args as { name?: string }` cast and any other hand-rolled casts on the tool handler's input MUST NOT be present in `src/index.ts`.

#### Scenario: no `as {` casts in tool handlers
- **WHEN** a developer greps `src/index.ts` for `as {`
- **THEN** no results are returned inside a `registerTool` handler
