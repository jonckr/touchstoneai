/**
 * Edge-case: MCP server that hangs on tool calls.
 *
 * Initializes normally but tool execution never resolves.
 * Used to test timeout handling in the test harness.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'hanging-test-server',
  version: '0.0.0',
});

server.tool(
  'hang',
  'This tool hangs forever',
  { input: z.string() },
  async () => {
    // Never resolves
    await new Promise(() => {});
    return { content: [{ type: 'text' as const, text: '' }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
