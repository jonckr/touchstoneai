/**
 * Broken MCP server — should score 0–30.
 *
 * - Crashes on certain inputs
 * - No error handling whatsoever
 * - No tool descriptions or documentation
 * - Tools throw unhandled exceptions
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'broken-test-server',
  version: '0.0.0',
});

// Tool with no description that throws on valid input
server.tool(
  'crasher',
  '',
  { input: z.string() },
  async ({ input }) => {
    if (input.length > 0) {
      throw new Error('Unexpected internal error');
    }
    return {
      content: [{ type: 'text' as const, text: '' }],
    };
  },
);

// Tool with completely wrong schema description mismatch
server.tool(
  'bad_math',
  '',
  {},
  async () => {
    // Returns non-standard content
    return {
      content: [{ type: 'text' as const, text: 'NaN' }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
