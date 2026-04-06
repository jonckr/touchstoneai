/**
 * Perfect MCP server — should score 95–100.
 *
 * - Exposes well-documented tools with proper input schemas
 * - Handles all requests correctly with proper error codes
 * - Responds quickly
 * - Follows MCP standards precisely
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'perfect-test-server',
  version: '1.0.0',
});

// Well-documented tool with proper schema and error handling
server.tool(
  'add',
  'Add two numbers together and return the sum. Supports integers and floating point values.',
  { a: z.number().describe('First operand'), b: z.number().describe('Second operand') },
  async ({ a, b }) => ({
    content: [{ type: 'text' as const, text: String(a + b) }],
  }),
);

server.tool(
  'echo',
  'Echo back the provided message. Useful for testing connectivity and round-trip latency.',
  { message: z.string().describe('The message to echo back') },
  async ({ message }) => ({
    content: [{ type: 'text' as const, text: message }],
  }),
);

server.tool(
  'divide',
  'Divide the numerator by the denominator. Returns an error if the denominator is zero.',
  {
    numerator: z.number().describe('The number to divide'),
    denominator: z.number().describe('The number to divide by (must not be zero)'),
  },
  async ({ numerator, denominator }) => {
    if (denominator === 0) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Division by zero' }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text' as const, text: String(numerator / denominator) }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
