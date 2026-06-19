#!/usr/bin/env node

/**
 * Amazon Seller Central MCP Server
 * Entry point for the Model Context Protocol server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

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
