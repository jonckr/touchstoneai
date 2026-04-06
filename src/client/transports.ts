// Transport factory — creates the appropriate MCP transport based on target specifier.
// TODO: Implement stdio, streamable HTTP, and SSE transport creation

export type TransportType = 'stdio' | 'streamable-http' | 'sse';

export function detectTransport(target: string, explicit?: 'stdio' | 'http'): TransportType {
  if (explicit === 'stdio') return 'stdio';
  if (explicit === 'http') return 'streamable-http';

  if (target.startsWith('http://') || target.startsWith('https://')) {
    return 'streamable-http';
  }

  return 'stdio';
}
