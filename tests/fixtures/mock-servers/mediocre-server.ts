/**
 * Mediocre MCP server — should score 50–70.
 *
 * - Tools exist but have poor/missing descriptions
 * - No input validation or error handling
 * - Slow responses (artificial delay)
 * - Missing schemas on some tools
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'mediocre-test-server',
  version: '0.0.1',
});

// Tool with no description on parameters
server.tool(
  'add',
  'Adds numbers',
  { a: z.number(), b: z.number() },
  async ({ a, b }) => {
    // Artificial delay — simulates slow response
    await new Promise((r) => setTimeout(r, 200));
    return {
      content: [{ type: 'text' as const, text: String(a + b) }],
    };
  },
);

// Tool with empty description
server.tool(
  'concat',
  '',
  { items: z.array(z.string()) },
  async ({ items }) => ({
    content: [{ type: 'text' as const, text: items.join('') }],
  }),
);

// Tool that silently ignores errors instead of reporting them
server.tool(
  'divide',
  'divide',
  { a: z.number(), b: z.number() },
  async ({ a, b }) => {
    // No error handling for division by zero — returns Infinity
    return {
      content: [{ type: 'text' as const, text: String(a / b) }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
