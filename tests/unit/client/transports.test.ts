import { describe, it, expect } from 'vitest';
import { detectTransport } from '../../../src/client/transports.js';

describe('detectTransport', () => {
  it('returns stdio for explicit stdio flag', () => {
    expect(detectTransport('http://example.com', 'stdio')).toBe('stdio');
  });

  it('returns streamable-http for explicit http flag', () => {
    expect(detectTransport('./server.js', 'http')).toBe('streamable-http');
  });

  it('detects http:// URLs as streamable-http', () => {
    expect(detectTransport('http://localhost:3000/mcp')).toBe('streamable-http');
  });

  it('detects https:// URLs as streamable-http', () => {
    expect(detectTransport('https://api.example.com/mcp')).toBe('streamable-http');
  });

  it('defaults to stdio for file paths', () => {
    expect(detectTransport('./my-server.js')).toBe('stdio');
  });

  it('defaults to stdio for npx commands', () => {
    expect(detectTransport('npx some-mcp-server')).toBe('stdio');
  });
});
