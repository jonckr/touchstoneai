/**
 * Integration tests — verify that mock MCP servers start, connect, and
 * behave as expected for each quality tier.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { spawnMockServer, type HarnessServer } from '../fixtures/harness.js';

let server: HarnessServer | undefined;

afterEach(async () => {
  if (server) {
    await server.cleanup();
    server = undefined;
  }
});

describe('perfect-server', () => {
  it('connects and exposes well-documented tools', async () => {
    server = await spawnMockServer('perfect-server');
    expect(server.serverInfo.name).toBe('perfect-test-server');
    expect(server.serverInfo.version).toBe('1.0.0');
    expect(server.tools.length).toBeGreaterThanOrEqual(3);

    // All tools should have descriptions
    for (const tool of server.tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.description!.length).toBeGreaterThan(10);
    }
  });

  it('handles tool calls correctly', async () => {
    server = await spawnMockServer('perfect-server');

    const result = await server.client.callTool({ name: 'add', arguments: { a: 2, b: 3 } });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0].text).toBe('5');
  });

  it('returns errors gracefully for invalid input', async () => {
    server = await spawnMockServer('perfect-server');

    const result = await server.client.callTool({
      name: 'divide',
      arguments: { numerator: 10, denominator: 0 },
    });
    expect(result.isError).toBe(true);
  });

  it('has proper input schemas on all tools', async () => {
    server = await spawnMockServer('perfect-server');

    for (const tool of server.tools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });
});

describe('mediocre-server', () => {
  it('connects but has poor documentation', async () => {
    server = await spawnMockServer('mediocre-server');
    expect(server.serverInfo.name).toBe('mediocre-test-server');
    expect(server.tools.length).toBeGreaterThanOrEqual(1);

    // At least one tool should have a missing or very short description
    const poorlyDocumented = server.tools.filter(
      (t) => !t.description || t.description.length < 10,
    );
    expect(poorlyDocumented.length).toBeGreaterThan(0);
  });

  it('responds slowly', async () => {
    server = await spawnMockServer('mediocre-server');

    const start = Date.now();
    await server.client.callTool({ name: 'add', arguments: { a: 1, b: 1 } });
    const elapsed = Date.now() - start;

    // Should take at least 150ms due to artificial delay
    expect(elapsed).toBeGreaterThanOrEqual(150);
  });

  it('does not handle division by zero gracefully', async () => {
    server = await spawnMockServer('mediocre-server');

    const result = await server.client.callTool({
      name: 'divide',
      arguments: { a: 1, b: 0 },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    // Returns Infinity instead of an error
    expect(content[0].text).toBe('Infinity');
    expect(result.isError).toBeFalsy();
  });
});

describe('broken-server', () => {
  it('connects but tools return errors', async () => {
    server = await spawnMockServer('broken-server');
    expect(server.serverInfo.name).toBe('broken-test-server');

    // Calling crasher with non-empty input returns isError
    const result = await server.client.callTool({ name: 'crasher', arguments: { input: 'test' } });
    expect(result.isError).toBe(true);
  });

  it('has tools with no descriptions', async () => {
    server = await spawnMockServer('broken-server');

    const undocumented = server.tools.filter((t) => !t.description || t.description.length === 0);
    expect(undocumented.length).toBeGreaterThan(0);
  });
});

describe('hanging-server', () => {
  it('connects but tool calls time out', async () => {
    server = await spawnMockServer('hanging-server', 3000);

    const callPromise = server.client.callTool({ name: 'hang', arguments: { input: 'test' } });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tool call timed out')), 2000),
    );

    await expect(Promise.race([callPromise, timeout])).rejects.toThrow('timed out');
  });
});

describe('invalid-jsonrpc-server', () => {
  it('fails to connect due to invalid protocol', async () => {
    await expect(spawnMockServer('invalid-jsonrpc-server', 3000)).rejects.toThrow();
  });
});
