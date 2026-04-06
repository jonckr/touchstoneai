import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { detectTransport } from './transports.js';

export interface ConnectOptions {
  target: string;
  transport?: 'stdio' | 'http';
  timeout?: number;
}

export interface ConnectedServer {
  client: Client;
  capabilities: ServerCapabilities;
  serverInfo: { name: string; version: string };
  disconnect: () => Promise<void>;
}

export async function connectToServer(opts: ConnectOptions): Promise<ConnectedServer> {
  const timeout = opts.timeout ?? 30_000;
  const transportType = detectTransport(opts.target, opts.transport);

  let transport;

  if (transportType === 'stdio') {
    const parts = opts.target.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);
    transport = new StdioClientTransport({
      command,
      args,
      stderr: 'pipe',
    });
  } else {
    const url = new URL(opts.target);

    if (transportType === 'streamable-http') {
      try {
        transport = new StreamableHTTPClientTransport(url);
      } catch {
        // Fallback to SSE
        transport = new SSEClientTransport(url);
      }
    } else {
      transport = new SSEClientTransport(url);
    }
  }

  const client = new Client({ name: 'touchstoneai', version: '0.1.0' }, { capabilities: {} });

  const connectPromise = client.connect(transport);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Connection timed out after ${timeout}ms`)), timeout),
  );

  await Promise.race([connectPromise, timeoutPromise]);

  const serverInfo = client.getServerVersion() ?? { name: 'unknown', version: '0.0.0' };
  const capabilities = client.getServerCapabilities() ?? {};

  return {
    client,
    capabilities,
    serverInfo: { name: serverInfo.name, version: serverInfo.version ?? '0.0.0' },
    disconnect: async () => {
      await client.close();
    },
  };
}
