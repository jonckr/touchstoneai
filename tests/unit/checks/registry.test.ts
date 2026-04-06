import { describe, it, expect, beforeEach } from 'vitest';

// Test a fresh registry instance, not the singleton
import type { CheckPlugin, CheckContext, CheckResult } from '../../../src/checks/types.js';

function makePlugin(id: string, dimension: CheckPlugin['dimension'] = 'reliability'): CheckPlugin {
  return {
    id,
    title: id,
    dimension,
    description: `Test check ${id}`,
    async run(_ctx: CheckContext): Promise<CheckResult> {
      return {
        checkId: id,
        title: id,
        dimension,
        severity: 'pass',
        score: 100,
        message: 'ok',
        durationMs: 0,
      };
    },
  };
}

describe('CheckRegistry', () => {
  let registry: InstanceType<typeof import('../../../src/checks/registry.js').CheckRegistry>;

  beforeEach(async () => {
    // Dynamically import to test fresh instances
    const mod = await import('../../../src/checks/registry.js');
    // Access the class via the module — the singleton is `registry`
    // We'll test the singleton behavior
    registry = mod.registry;
  });

  it('registers and retrieves a check', () => {
    const existing = registry.getAll();
    // Singleton may have checks from other imports; test getByDimension
    const plugin = makePlugin('test.unique-' + Date.now(), 'security');
    registry.register(plugin);
    expect(registry.get(plugin.id)).toBe(plugin);
  });

  it('getByDimension filters correctly', () => {
    const p1 = makePlugin('dim.test.a-' + Date.now(), 'documentation');
    const p2 = makePlugin('dim.test.b-' + Date.now(), 'standards');
    registry.register(p1);
    registry.register(p2);
    const docs = registry.getByDimension('documentation');
    expect(docs.some((c) => c.id === p1.id)).toBe(true);
    expect(docs.some((c) => c.id === p2.id)).toBe(false);
  });

  it('throws on duplicate registration', () => {
    const id = 'dup.test-' + Date.now();
    registry.register(makePlugin(id));
    expect(() => registry.register(makePlugin(id))).toThrow('Check already registered');
  });
});
