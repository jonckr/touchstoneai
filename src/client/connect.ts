import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

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

export async function connectToServer(_opts: ConnectOptions): Promise<ConnectedServer> {
  // TODO: Implement transport auto-detection and connection logic
  throw new Error('Not yet implemented');
}
