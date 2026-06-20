#!/usr/bin/env node

/**
 * Amazon Seller Central MCP Server
 * Entry point for the Model Context Protocol server
 *
 * Startup sequence:
 *   1. Load .env via dotenv
 *   2. Build the auth + HTTP stack (CredentialsManager, TokenManager, RateLimiter, SPAPIClient)
 *   3. Build the McpServer
 *   4. Register the smoke tool `hello` and the Orders tool family via `registerOrderTools`
 *   5. Connect to StdioServerTransport
 *
 * The server will throw on startup if any required env var is missing
 * (see `CredentialsManager.validate`). Tests use `tests/setup.ts` to set
 * fake values, so they boot without a real `.env`.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as dotenv from 'dotenv';
import { z } from 'zod';

import { CredentialsManager } from './auth/credentials.js';
import { TokenManager } from './auth/token-manager.js';
import { SPAPIClient } from './utils/sp-api-client.js';
import { RateLimiter, DEFAULT_RATE_LIMITS } from './utils/rate-limiter.js';
import { registerOrderTools } from './tools/sales.js';

// Load environment variables first; the auth stack depends on them.
dotenv.config();

// Build the auth + HTTP stack. Throws on missing env vars (CredentialsManager.validate).
const credentials = new CredentialsManager();
const tokenManager = new TokenManager(credentials.getLWACredentials());
const rateLimiter = new RateLimiter(DEFAULT_RATE_LIMITS);
const spapiConfig = credentials.getSPAPIConfig();
const client = new SPAPIClient({
  endpoint: spapiConfig.endpoint,
  marketplaceId: spapiConfig.marketplaceId,
  awsCredentials: credentials.getAWSCredentials(),
  tokenManager,
  rateLimiter,
});

/**
 * MCP Server for Amazon Seller Central
 */
const server = new McpServer(
  {
    name: 'amazon-seller-central',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Smoke tool — does not call the client, so it works without real credentials.
server.registerTool(
  'hello',
  {
    description: 'A simple test tool that says hello',
    inputSchema: {
      name: z.string().optional().describe('Name to greet'),
    },
  },
  async ({ name }) => ({
    content: [
      {
        type: 'text',
        text: `Hello, ${name ?? 'World'}! 🚀\n\nAmazon Seller Central MCP Server is running successfully!\n\nPhase 1.2 Complete: TypeScript/Node.js setup verified.`,
      },
    ],
  })
);

// Orders tool family (Phase 1.5) — requires the SPAPIClient to be wired above.
registerOrderTools(server, client);

server.server.onerror = (error) => {
  console.error('[MCP Error]', error);
};

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

/**
 * Start the server
 */
async function start(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Amazon Seller Central MCP Server running on stdio');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    await start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
