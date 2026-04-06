/**
 * Test harness — spawns a mock MCP server as a child process via stdio transport,
 * connects an MCP client, and provides helpers for inspecting server capabilities.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ServerCapabilities, Tool } from '@modelcontextprotocol/sdk/types.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface HarnessServer {
  client: Client;
  capabilities: ServerCapabilities;
  tools: Tool[];
  serverInfo: { name: string; version: string };
  cleanup: () => Promise<void>;
}

export type MockServerName =
  | 'perfect-server'
  | 'mediocre-server'
  | 'broken-server'
  | 'hanging-server'
  | 'invalid-jsonrpc-server';

/**
 * Spawn a mock MCP server and connect an MCP client to it.
 * Returns the connected client, capabilities, and a cleanup function.
 */
export async function spawnMockServer(
  name: MockServerName,
  timeoutMs = 5000,
): Promise<HarnessServer> {
  const serverPath = resolve(__dirname, 'mock-servers', `${name}.ts`);

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', serverPath],
  });

  const client = new Client({ name: 'touchstone-test-harness', version: '1.0.0' });

  // Connect with a timeout to handle hanging/broken servers
  const connectPromise = client.connect(transport);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Server ${name} connection timed out after ${timeoutMs}ms`)), timeoutMs),
  );

  await Promise.race([connectPromise, timeoutPromise]);

  const capabilities = client.getServerCapabilities() ?? {};
  const serverInfo = client.getServerVersion() ?? { name: 'unknown', version: '0.0.0' };

  // List tools if the server supports them
  let tools: Tool[] = [];
  try {
    const toolResult = await Promise.race([
      client.listTools(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('listTools timed out')), timeoutMs),
      ),
    ]);
    tools = toolResult.tools;
  } catch {
    // Server may not support tools or may have timed out
  }

  return {
    client,
    capabilities,
    tools,
    serverInfo: { name: serverInfo.name, version: serverInfo.version },
    cleanup: async () => {
      try {
        await client.close();
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}
